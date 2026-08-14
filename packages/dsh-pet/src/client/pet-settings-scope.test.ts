import { describe, expect, it, vi } from 'vitest'
import type { PetStateView } from '../service.ts'
import { PetSettingsCardController } from './PetSettingsCard.tsx'
import { PetDirectSettingsScope, type PetSettingsApi } from './pet-settings-scope.ts'

vi.mock('@deepseek-ai/dsh-client-runtime/client', () => ({
  createSnapshotStore: <T>(initial: T) => {
    let snapshot = initial
    const listeners = new Set<() => void>()
    return {
      getSnapshot: () => snapshot,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
      set: (next: T) => {
        snapshot = next
        for (const listener of listeners) listener()
      },
      update: (mutate: (draft: T) => void) => {
        mutate(snapshot)
        for (const listener of listeners) listener()
      },
    }
  },
}))

function petState(): PetStateView {
  return {
    animation: 'idle',
    phase: 'idle',
    sessionActive: false,
    petId: 'whale',
    pets: [
      { id: 'whale', name: 'Whale Girl', defaultName: 'Whale Girl' },
      { id: 'fox', name: 'Fox', defaultName: 'Fox' },
    ],
    affinity: {
      points: 0,
      rank: '初识',
      rankEmoji: '*',
      pets: 0,
      feeds: 0,
      turns: 0,
      petCooldown: false,
      feedCooldown: false,
    },
    display: { visible: true, size: 160, right: 24, bottom: 20 },
    name: 'Whale Girl',
    treats: { stocked: 0, max: 20 },
  }
}

function fakeApi(state: PetStateView): PetSettingsApi {
  return {
    state: vi.fn(async () => state),
    setPet: vi.fn(async (petId: string) => {
      const pet = state.pets.find(candidate => candidate.id === petId)
      if (pet === undefined) return { ok: false as const, error: 'unknown pet' }
      state.petId = petId
      state.name = pet.name
      return { ok: true as const, petId }
    }),
    setVisible: vi.fn(async (visible: boolean) => {
      state.display.visible = visible
      return { ok: true as const, display: state.display }
    }),
    setConfig: vi.fn(async (patch: Partial<PetStateView['display']>) => {
      Object.assign(state.display, patch)
      return { ok: true as const, display: state.display }
    }),
    setName: vi.fn(async (name: string) => {
      state.name = name
      return { ok: true as const, name }
    }),
  }
}

describe('PetDirectSettingsScope', () => {
  it('projects pet state and persists edits through plugin routes', async () => {
    const state = petState()
    const api = fakeApi(state)
    const scope = new PetDirectSettingsScope(api)

    scope.accept(state)
    expect(scope.getSnapshot().status).toBe('ready')
    expect(scope.getSnapshot().value).toEqual({
      petId: 'whale',
      pets: [
        { id: 'whale', name: 'Whale Girl' },
        { id: 'fox', name: 'Fox' },
      ],
      visible: true,
      size: 160,
      right: 24,
      bottom: 20,
      name: 'Whale Girl',
    })
    expect(scope.getSnapshot().user).toBeUndefined()

    await scope.set('petId', 'fox')
    expect(api.setPet).toHaveBeenCalledWith('fox')
    expect(scope.getSnapshot().value?.petId).toBe('fox')
    expect(scope.getSnapshot().value?.name).toBe('Fox')

    await scope.set('size', 220)
    expect(api.setConfig).toHaveBeenCalledWith({ size: 220 })
    expect(scope.getSnapshot().value?.size).toBe(220)
    expect(scope.getSnapshot().user).toEqual({ size: 220 })

    await scope.unset('size')
    expect(scope.getSnapshot().value?.size).toBe(160)
    expect(scope.getSnapshot().user).toBeUndefined()
  })

  it('reports the host route as unavailable after a failed refresh', async () => {
    const state = petState()
    const api = fakeApi(state)
    vi.mocked(api.state).mockRejectedValueOnce(new Error('offline'))
    const scope = new PetDirectSettingsScope(api)

    await expect(scope.refresh()).rejects.toThrow('offline')
    expect(scope.getSnapshot().status).toBe('unavailable')
    expect(scope.getSnapshot().writable).toBe(false)
  })

  it('drops an unsaved name draft when the active pet changes', () => {
    const state = petState()
    const scope = new PetDirectSettingsScope(fakeApi(state))
    scope.accept(state)
    const card = new PetSettingsCardController(scope).inject()

    card.edit('name', 'Bubble')
    expect(card.hooks.petSettingsCard.getSnapshot().dirty).toBe(true)

    state.petId = 'fox'
    state.name = 'Fox'
    state.pets = [{ id: 'fox', name: 'Fox', defaultName: 'Fox' }]
    scope.accept(state)
    expect(card.hooks.petSettingsCard.getSnapshot().dirty).toBe(false)
    expect(card.hooks.petSettingsCard.getSnapshot().name.text).toBe('Fox')
  })

  it('exposes available pets to the settings card and switches from its selector', async () => {
    const state = petState()
    const api = fakeApi(state)
    const scope = new PetDirectSettingsScope(api)
    scope.accept(state)
    const card = new PetSettingsCardController(scope).inject()

    expect(card.hooks.petSettingsCard.getSnapshot().pets.map(pet => pet.id)).toEqual(['whale', 'fox'])
    card.selectPet('fox')

    await vi.waitFor(() => {
      expect(card.hooks.petSettingsCard.getSnapshot().petId).toBe('fox')
      expect(card.hooks.petSettingsCard.getSnapshot().switchingPet).toBe(false)
    })
    expect(api.setPet).toHaveBeenCalledWith('fox')
  })
})

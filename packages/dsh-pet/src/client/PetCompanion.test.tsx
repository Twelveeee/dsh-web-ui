// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { PetStateView } from '../service.ts'
import type { PetStoreInstance } from './pet-store.ts'
import { PetCompanion } from './PetCompanion.tsx'
import { PetDockEntry } from './PetDockEntry.tsx'
import { t } from './locales.ts'

const snapshot: PetStateView = {
  animation: 'idle',
  phase: 'idle',
  sessionActive: false,
  petId: 'whale',
  pets: [
    { id: 'whale', name: 'Whale Girl', defaultName: 'Whale Girl', description: 'Ocean companion' },
    { id: 'fox', name: 'Fox', defaultName: 'Fox', description: 'A second test pet' },
  ],
  affinity: {
    points: 12,
    rank: '初识',
    rankEmoji: '*',
    pets: 2,
    feeds: 1,
    turns: 4,
    petCooldown: false,
    feedCooldown: false,
  },
  display: { visible: true, size: 160, right: 24, bottom: 20 },
  name: 'Whale Girl',
  treats: { stocked: 3, max: 20 },
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('PetCompanion panel', () => {
  it('keeps pet selection out of the floating panel', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    render(
      <PetCompanion
        snapshot={snapshot}
        display={snapshot.display}
        feedback={null}
        onPet={vi.fn()}
        onFeed={vi.fn()}
        onHide={vi.fn()}
        onDragEnd={vi.fn()}
        onRename={vi.fn()}
        onFeedbackDone={vi.fn()}
        t={t}
      />,
    )

    fireEvent.pointerEnter(screen.getByRole('button', { name: /Whale Girl/ }))
    expect(screen.getByRole('button', { name: '喂食' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Fox' })).toBeNull()
  })

  it('renders no page-level control while hidden', () => {
    const state = { snapshot: { ...snapshot, display: { ...snapshot.display, visible: false } }, feedback: null, state: 'ready', error: null }
    const store = {
      getSnapshot: () => state,
      subscribe: () => () => {},
    } as unknown as PetStoreInstance

    const { container } = render(
      <PetDockEntry
        store={store}
        ensure={vi.fn()}
        pet={vi.fn()}
        feed={vi.fn()}
        hide={vi.fn()}
        dragEnd={vi.fn()}
        rename={vi.fn()}
        feedbackDone={vi.fn()}
        t={t}
      />,
    )

    expect(container.childElementCount).toBe(0)
    expect(screen.queryByTestId('pet-summon')).toBeNull()
  })
})

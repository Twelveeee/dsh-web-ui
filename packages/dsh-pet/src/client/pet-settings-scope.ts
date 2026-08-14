/**
 * SettingsScope-compatible adapter backed by dsh-pet's own HTTP API.
 *
 * Current DSH releases intentionally expose only a fixed set of official
 * settings namespaces through dsh-host-apiproxy. A third-party plugin cannot
 * add itself to that allowlist, so the pet card uses the plugin-owned routes
 * that already persist the same display and name values on the host.
 */

import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { PetDisplayConfig } from '../persist.ts'
import type { PetStateView } from '../service.ts'
import type { PetSettings } from './PetSettingsCard.tsx'

/** Narrow API surface needed by the settings adapter. */
export interface PetSettingsApi {
  state(): Promise<PetStateView>
  setPet(petId: string): Promise<{ ok: true; petId: string } | { ok: false; error: string }>
  setVisible(visible: boolean): Promise<{ ok: true; display: PetDisplayConfig }>
  setConfig(patch: Partial<PetDisplayConfig>): Promise<{ ok: true; display: PetDisplayConfig }>
  setName(name: string): Promise<{ ok: true; name: string } | { ok: false; error: string }>
}

const DISPLAY_FIELDS = new Set(['size', 'right', 'bottom'])
const DEFAULT_DISPLAY: PetDisplayConfig = { visible: true, size: 160, right: 24, bottom: 20 }

/** Reactive direct settings adapter; writes are serialized in call order. */
export class PetDirectSettingsScope implements SettingsScope<PetSettings> {
  private readonly listeners = new Set<() => void>()
  private queue: Promise<void> = Promise.resolve()
  private snapshot: SettingsScopeSnapshot<PetSettings> = {
    status: 'loading',
    value: undefined,
    base: undefined,
    user: undefined,
    revision: undefined,
    writable: true,
    mode: 'host',
  }

  constructor(private readonly api: PetSettingsApi) {}

  getSnapshot(): SettingsScopeSnapshot<PetSettings> {
    return this.snapshot
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Accept a snapshot already fetched by the pet poll loop. */
  accept(state: PetStateView): void {
    const selected = state.pets.find(pet => pet.id === state.petId)
    const pets = state.pets.map(pet => ({
      id: pet.id,
      name: pet.name,
      ...(pet.description === undefined ? {} : { description: pet.description }),
    }))
    const value: PetSettings = {
      petId: state.petId,
      pets,
      visible: state.display.visible,
      size: state.display.size,
      right: state.display.right,
      bottom: state.display.bottom,
      name: state.name,
    }
    const base: PetSettings = {
      petId: state.petId,
      pets,
      ...DEFAULT_DISPLAY,
      name: selected?.defaultName ?? state.name,
    }
    const user = Object.fromEntries(
      Object.entries(value).filter(([field, fieldValue]) => fieldValue !== base[field as keyof PetSettings]),
    ) as Partial<PetSettings>
    this.replace({
      status: 'ready',
      value,
      base,
      user: Object.keys(user).length === 0 ? undefined : user,
      revision: (this.snapshot.revision ?? 0) + 1,
      writable: true,
      mode: 'host',
    })
  }

  /** Fetch the latest durable values; failures produce a retryable unavailable state. */
  async refresh(): Promise<void> {
    try {
      this.accept(await this.api.state())
    } catch (error) {
      this.replace({
        status: 'unavailable',
        value: undefined,
        base: undefined,
        user: undefined,
        revision: this.snapshot.revision,
        writable: false,
        mode: 'host',
      })
      throw error
    }
  }

  set(field: string, value: unknown): Promise<void> {
    return this.enqueue(async () => {
      if (field === 'petId' && typeof value === 'string') {
        const result = await this.api.setPet(value)
        if (!result.ok) throw new Error(result.error)
      } else if (field === 'visible' && typeof value === 'boolean') {
        await this.api.setVisible(value)
      } else if (DISPLAY_FIELDS.has(field) && typeof value === 'number' && Number.isFinite(value)) {
        await this.api.setConfig({ [field]: value })
      } else if (field === 'name' && typeof value === 'string') {
        const result = await this.api.setName(value)
        if (!result.ok) throw new Error(result.error)
      } else {
        throw new Error(`unsupported pet setting ${field}`)
      }
      await this.refresh()
    })
  }

  unset(field: string): Promise<void> {
    const base = this.snapshot.base as PetSettings | undefined
    const value = base?.[field as keyof PetSettings]
    if (value === undefined) return Promise.reject(new Error(`pet setting ${field} has no default`))
    return this.set(field, value)
  }

  private enqueue(run: () => Promise<void>): Promise<void> {
    const operation = this.queue.then(run)
    this.queue = operation.catch(() => {})
    return operation
  }

  private replace(snapshot: SettingsScopeSnapshot<PetSettings>): void {
    this.snapshot = snapshot
    for (const listener of this.listeners) listener()
  }
}

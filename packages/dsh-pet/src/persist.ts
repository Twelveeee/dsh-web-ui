/**
 * Pet persistence — tiny JSON store for affinity + display config, written
 * under $DSH_HOME (defaults to ~/.dsh) as `pet.json`. Deliberately minimal:
 * one file, atomic rename write, tolerant read (corrupt file → defaults).
 * @module @linxin666/dsh-pet/persist
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { AFFINITY_MAX, emptyAffinity, type AffinityState } from './affinity.ts'
import { defaultTreatConfig, emptyTreatLedger, type TreatLedger } from './treats.ts'
import { DEFAULT_PET_ID, isPetId } from './pets.ts'

/** Display configuration the user can tweak. */
export interface PetDisplayConfig {
  /** Master switch. */
  visible: boolean
  /** Scale of the rendered pet in px (sprite cell height). */
  size: number
  /** Horizontal inset from the viewport right edge, px. */
  right: number
  /** Vertical inset from the viewport bottom edge, px. */
  bottom: number
}

export const defaultDisplayConfig: PetDisplayConfig = {
  visible: true,
  size: 160,
  right: 24,
  bottom: 20,
}

/** Display value bounds (shared by load-time validation and setConfig). */
export const DISPLAY_SIZE_MIN = 32
export const DISPLAY_SIZE_MAX = 512
export const DISPLAY_INSET_MAX = 10_000

/** Everything persisted for the pet. */
export interface PetPersist {
  /** Currently selected pet id (registry id, see pets.ts). */
  petId: string
  /** User-customized display names per pet id; absent → manifest displayName. */
  names: Record<string, string>
  affinity: AffinityState
  /** Shared treat stock ledger. */
  treats: TreatLedger
  display: PetDisplayConfig
}

/** Default pet name (used until the user renames the pet). */
export const DEFAULT_PET_NAME = 'Whale Girl'

/** Name constraints. */
export const PET_NAME_MAX_LENGTH = 20

/** Legacy on-disk shape used before per-pet names were introduced. */
type PetPersistFile = Partial<PetPersist> & { name?: unknown }

export function emptyPersist(): PetPersist {
  return {
    petId: DEFAULT_PET_ID,
    names: {},
    affinity: emptyAffinity(),
    treats: emptyTreatLedger(),
    display: { ...defaultDisplayConfig },
  }
}

/** Resolve the persistence directory ($DSH_HOME or ~/.dsh). */
export function petHomeDir(): string {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

/** Numeric field guard: finite numbers only, else the fallback. */
function finiteNum(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Clamp one count/score into [0, max]. */
function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(0, value))
}

/** Load persisted state; missing or corrupt files fall back to defaults. */
export function loadPetPersist(dir: string = petHomeDir()): PetPersist {
  try {
    const raw = readFileSync(join(dir, 'pet.json'), 'utf8')
    const parsed = JSON.parse(raw) as PetPersistFile
    const base = emptyPersist()
    const rawAffinity = (parsed.affinity ?? {}) as Partial<AffinityState>
    const affinity: AffinityState = {
      points: clamp(finiteNum(rawAffinity.points, 0), AFFINITY_MAX),
      lastPetAt: clamp(finiteNum(rawAffinity.lastPetAt, 0), Number.MAX_SAFE_INTEGER),
      lastFeedAt: clamp(finiteNum(rawAffinity.lastFeedAt, 0), Number.MAX_SAFE_INTEGER),
      pets: clamp(finiteNum(rawAffinity.pets, 0), Number.MAX_SAFE_INTEGER),
      feeds: clamp(finiteNum(rawAffinity.feeds, 0), Number.MAX_SAFE_INTEGER),
      turns: clamp(finiteNum(rawAffinity.turns, 0), Number.MAX_SAFE_INTEGER),
    }
    const rawTreats = (parsed.treats ?? {}) as Partial<TreatLedger>
    const treats: TreatLedger = {
      treats: clamp(finiteNum(rawTreats.treats, 0), defaultTreatConfig.maxTreats),
      lastTreatGrantAt: clamp(finiteNum(rawTreats.lastTreatGrantAt, 0), Number.MAX_SAFE_INTEGER),
      turnsAtLastTreatGrant: clamp(finiteNum(rawTreats.turnsAtLastTreatGrant, 0), Number.MAX_SAFE_INTEGER),
    }
    const rawDisplay = (parsed.display ?? {}) as Partial<PetDisplayConfig>
    const display: PetDisplayConfig = {
      visible: typeof rawDisplay.visible === 'boolean' ? rawDisplay.visible : base.display.visible,
      // The settings schema requires whole pixels; drag positions are
      // clamped but not integral, so round at the persistence boundary.
      size: Math.round(Math.min(DISPLAY_SIZE_MAX, Math.max(DISPLAY_SIZE_MIN, finiteNum(rawDisplay.size, base.display.size)))),
      right: Math.round(clamp(finiteNum(rawDisplay.right, base.display.right), DISPLAY_INSET_MAX)),
      bottom: Math.round(clamp(finiteNum(rawDisplay.bottom, base.display.bottom), DISPLAY_INSET_MAX)),
    }
    const rawNames = typeof parsed.names === 'object'
      && parsed.names !== null
      && !Array.isArray(parsed.names)
      ? parsed.names as Record<string, unknown>
      : {}
    const names: Record<string, string> = {}
    for (const [id, value] of Object.entries(rawNames)) {
      if (!isPetId(id)) continue
      if (typeof value !== 'string') continue
      const trimmed = value.trim()
      if (trimmed === '' || trimmed.length > PET_NAME_MAX_LENGTH) continue
      names[id] = trimmed
    }
    // Legacy migration: pre-multi-pet files stored a single `name` field that
    // referred to the whale (the only pet back then). Seed it as the whale's
    // custom name unless the record already carries one.
    if (names[DEFAULT_PET_ID] === undefined) {
      const legacy = parsed.name
      if (typeof legacy === 'string') {
        const trimmed = legacy.trim()
        if (trimmed !== '' && trimmed.length <= PET_NAME_MAX_LENGTH) {
          names[DEFAULT_PET_ID] = trimmed
        }
      }
    }
    const rawPetId = parsed.petId
    const petId = isPetId(rawPetId)
      ? rawPetId
      : base.petId
    return {
      petId,
      names,
      affinity,
      treats,
      display,
    }
  } catch {
    return emptyPersist()
  }
}

/** Atomically persist state (write temp + rename). */
export function savePetPersist(data: PetPersist, dir: string = petHomeDir()): void {
  mkdirSync(dir, { recursive: true })
  const target = join(dir, 'pet.json')
  const tmp = `${target}.tmp`
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  renameSync(tmp, target)
}

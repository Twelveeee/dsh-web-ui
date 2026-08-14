/**
 * Pet registry — the set of pets the plugin can display and switch between.
 *
 * One directory under `<packageRoot>/assets/<id>/` per pet, each holding a
 * `pet.json` manifest plus a `spritesheet.webp` atlas following the
 * Codex/hatch-pet contract (8 columns × ≥9 rows of 192×208 cells; rows 0–8
 * are idle / running-right / running-left / waving / jumping / failed /
 * waiting / running / review). Extra rows beyond 8 (Codex look directions)
 * are ignored by the renderer.
 *
 * Adding a pet is drop-in: drop a new asset directory + manifest, restart the
 * host, and the pet appears in the switcher. The registry id is the asset
 * directory name (URL-safe), so the built-in whale lives under `assets/whale`
 * and keeps its `/pet/whale/*` media URLs.
 * @module @linxin666/dsh-pet/pets
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** Id of the built-in whale-girl pet (the default selection). */
export const DEFAULT_PET_ID = 'whale'

/** URL-safe id pattern (asset directory names become URL segments). */
const PET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/

/** Whether a value is a safe registry id and URL path segment. */
export function isPetId(value: unknown): value is string {
  return typeof value === 'string' && PET_ID_PATTERN.test(value)
}

/** Per-row frame counts for the 9 state rows (rows 0–8). */
export type PetFrames = readonly [number, number, number, number, number, number, number, number, number]

/** Pet manifest (assets/<id>/pet.json). */
export interface PetManifest {
  /** Registry id (also the asset directory name and URL segment). */
  id: string
  /** Default display name shown until the user renames the pet. */
  displayName: string
  /** Optional one-line description. */
  description?: string
  /** Authoritative per-row frame counts; absent → the client auto-detects. */
  frames?: PetFrames
}

/** The ordered registry of known pets (insertion order = switcher order). */
export interface PetRegistry {
  pets: readonly PetManifest[]
}

/** Built-in registry used if asset discovery finds nothing. */
export const FALLBACK_PET_REGISTRY: PetRegistry = {
  pets: [{ id: DEFAULT_PET_ID, displayName: 'Whale Girl' }],
}

/** Guarantee that the host service and media routes share a non-empty registry. */
export function ensurePetRegistry(registry: PetRegistry): PetRegistry {
  return registry.pets.length > 0 ? registry : FALLBACK_PET_REGISTRY
}

/** Look one pet up by id. */
export function petOf(registry: PetRegistry, id: string): PetManifest | undefined {
  return registry.pets.find((pet) => pet.id === id)
}

/** Valid manifest frame array (9 numbers) or undefined. */
function parseFrames(value: unknown): PetFrames | undefined {
  if (!Array.isArray(value) || value.length !== 9) return undefined
  if (!value.every((n) => Number.isInteger(n) && n >= 1 && n <= 8)) return undefined
  return value.slice() as unknown as PetFrames
}

/**
 * Load every manifest under `<packageRoot>/assets/<id>/pet.json`. The
 * built-in whale is ordered first; the rest follow directory-name order.
 * Unparseable or invalid directories are skipped; a missing assets root
 * degrades to the empty registry (the caller falls back to whale-only).
 */
export function loadPetRegistry(packageRoot: string): PetRegistry {
  const assetsDir = join(packageRoot, 'assets')
  let names: string[] = []
  try {
    names = readdirSync(assetsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  } catch {
    // Assets missing (dev checkout without assets): empty registry.
  }
  const ordered = [...names].sort((a, b) =>
    (a === DEFAULT_PET_ID ? -1 : 0) - (b === DEFAULT_PET_ID ? -1 : 0) || a.localeCompare(b))
  const pets: PetManifest[] = []
  for (const dir of ordered) {
    if (!isPetId(dir)) continue
    try {
      const raw = JSON.parse(readFileSync(join(assetsDir, dir, 'pet.json'), 'utf8')) as Partial<PetManifest>
      if (typeof raw.displayName !== 'string' || raw.displayName.trim() === '') continue
      const frames = parseFrames(raw.frames)
      pets.push({
        id: dir,
        displayName: raw.displayName.trim(),
        ...(typeof raw.description === 'string' && raw.description.trim() !== ''
          ? { description: raw.description.trim() }
          : {}),
        ...(frames === undefined ? {} : { frames }),
      })
    } catch {
      // Unreadable manifest: skip the directory.
    }
  }
  return { pets }
}

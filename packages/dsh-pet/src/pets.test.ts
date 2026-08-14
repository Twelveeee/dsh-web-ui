import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensurePetRegistry, isPetId, loadPetRegistry } from './pets.ts'

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'dsh-pet-registry-test-'))
}

function manifest(root: string, id: string, value: unknown): void {
  const dir = join(root, 'assets', id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'pet.json'), JSON.stringify(value), 'utf8')
}

describe('loadPetRegistry', () => {
  it('orders the built-in whale first and uses directory ids', () => {
    const root = tempDir()
    try {
      manifest(root, 'fox', {
        id: 'ignored-manifest-id',
        displayName: ' Fox ',
        description: ' Tiny companion ',
        frames: [6, 8, 8, 4, 5, 8, 6, 6, 6],
      })
      manifest(root, 'whale', { displayName: 'Whale Girl' })
      expect(loadPetRegistry(root)).toEqual({
        pets: [
          { id: 'whale', displayName: 'Whale Girl' },
          {
            id: 'fox',
            displayName: 'Fox',
            description: 'Tiny companion',
            frames: [6, 8, 8, 4, 5, 8, 6, 6, 6],
          },
        ],
      })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('skips unsafe ids and invalid manifests without failing discovery', () => {
    const root = tempDir()
    try {
      manifest(root, '_unsafe', { displayName: 'Unsafe' })
      manifest(root, 'blank-name', { displayName: '   ' })
      manifest(root, 'bad-frames', { displayName: 'Still valid', frames: [0, 8, 8, 4, 5, 8, 6, 6, 6] })
      expect(loadPetRegistry(root)).toEqual({
        pets: [{ id: 'bad-frames', displayName: 'Still valid' }],
      })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('returns an empty registry when the assets directory is absent', () => {
    const root = tempDir()
    try {
      expect(loadPetRegistry(root)).toEqual({ pets: [] })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('falls back safely and validates URL-safe ids', () => {
    expect(ensurePetRegistry({ pets: [] }).pets).toEqual([
      { id: 'whale', displayName: 'Whale Girl' },
    ])
    expect(isPetId('red-fox')).toBe(true)
    expect(isPetId('../fox')).toBe(false)
    expect(isPetId('_fox')).toBe(false)
  })
})

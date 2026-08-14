import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { PetService } from '../src/service.ts'
import type { PetRegistry } from '../src/pets.ts'

function activity(phase: string, seq: number): SessionEvent {
  return {
    type: 'activity/status',
    seq,
    time: seq,
    data: { phase },
  } as SessionEvent
}

const session = null as unknown as Session

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'dsh-pet-service-test-'))
}

describe('PetService enabled switch', () => {
  it('stops consuming session activity while disabled and resumes on re-enable', async () => {
    const ctx = new Context()
    const dir = tempDir()
    const service = new PetService(ctx, { enabled: false, persistDir: dir })

    try {
      ctx.emit('session/event', session, activity('done', 1))
      expect((await service.state()).animation).toBe('idle')

      service.setEnabled(true)
      ctx.emit('session/event', session, activity('done', 2))
      expect((await service.state()).animation).toBe('jumping')

      service.setEnabled(false)
      ctx.emit('session/event', session, activity('done', 3))
      expect((await service.state()).animation).toBe('jumping')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('trims settings names so whitespace-only values cannot persist', async () => {
    const ctx = new Context()
    const dir = tempDir()
    const service = new PetService(ctx, { persistDir: dir })
    try {
      service.applySettingsSection({
        visible: true,
        size: 160,
        right: 24,
        bottom: 20,
        name: '  鲸鱼娘  ',
      })
      expect(service.petName()).toBe('鲸鱼娘')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('switches pets and keeps custom names separate', async () => {
    const dir = tempDir()
    const ctx = new Context()
    const registry: PetRegistry = {
      pets: [
        { id: 'whale', displayName: 'Whale Girl' },
        { id: 'fox', displayName: 'Fox' },
      ],
    }
    const service = new PetService(ctx, { persistDir: dir }, registry)
    try {
      expect(await service.setPet('missing')).toEqual({ ok: false, error: 'unknown-pet' })
      expect(await service.setPet('fox')).toEqual({ ok: true, petId: 'fox' })
      expect(await service.setName('  Foxy  ')).toEqual({ ok: true, name: 'Foxy' })
      expect((await service.state()).name).toBe('Foxy')
      await service.setPet('whale')
      expect((await service.state()).name).toBe('Whale Girl')
      await service.setPet('fox')
      expect((await service.state()).name).toBe('Foxy')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

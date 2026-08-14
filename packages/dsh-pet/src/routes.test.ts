import { describe, expect, it } from 'vitest'
import type { PetService } from './service.ts'
import { makePetRoutes } from './routes.ts'

describe('makePetRoutes', () => {
  it('registers the switch endpoint and scoped media routes for every pet', () => {
    const service = {} as PetService
    const routes = makePetRoutes({
      service,
      packageRoot: '/package',
      registry: {
        pets: [
          { id: 'whale', displayName: 'Whale Girl' },
          { id: 'fox', displayName: 'Fox' },
        ],
      },
    })
    expect(routes.map((route) => route.path)).toEqual([
      '/api/pet/state',
      '/api/pet/interact',
      '/api/pet/set-pet',
      '/api/pet/set-visible',
      '/api/pet/set-config',
      '/api/pet/set-name',
      '/pet/whale/spritesheet.webp',
      '/pet/whale/pet.json',
      '/pet/fox/spritesheet.webp',
      '/pet/fox/pet.json',
    ])
  })
})

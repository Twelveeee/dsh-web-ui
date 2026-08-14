/**
 * Backward-compatible aliases for consumers that imported the original
 * single-pet component through the package's `./src/*` export.
 * New code should import PetCompanion instead.
 * @module @linxin666/dsh-pet/client/WhalePet
 */

import type { ReactElement } from 'react'
import { PetCompanion, type PetCompanionProps } from './PetCompanion.tsx'

/** @deprecated Use `PetCompanionProps`. */
export type WhalePetProps = PetCompanionProps

/** @deprecated Use `PetCompanion`. */
export function WhalePet(props: WhalePetProps): ReactElement {
  return <PetCompanion {...props} />
}

/** @deprecated Use `petAssetUrl('whale', 'spritesheet.webp')`. */
export const PET_SPRITESHEET_URL = '/pet/whale/spritesheet.webp'

/** @deprecated Use `petAssetUrl('whale', 'pet.json')`. */
export const PET_MANIFEST_URL = '/pet/whale/pet.json'

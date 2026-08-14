/**
 * Global floating pet entry. The pet is host-global (its state, display and
 * interactions live on `/api/pet/*` endpoints with no session dimension), so
 * it must not ride a session-scoped slot — on the new-conversation screen no
 * session exists to scope a slot by, and the pet would vanish (issue #48).
 * The client half therefore mounts this entry straight onto `document.body`
 * (see index.ts): while visible it renders the floating PetCompanion (a portal),
 * while hidden it renders nothing. Visibility is restored from Settings.
 * @module @linxin666/dsh-pet/client/PetDockEntry
 */

import { useEffect, useSyncExternalStore, type ReactElement } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { PetDisplayConfig } from '../persist.ts'
import type { PetStoreInstance } from './pet-store.ts'
import { PetCompanion } from './PetCompanion.tsx'
import { NS } from './locales.ts'

/** Injected actions handed to the dock entry component. */
export interface PetInjected {
  /** The app-wide pet store instance (snapshot + feedback). */
  store: PetStoreInstance
  /** Ensure the first snapshot is fetched (called on mount). */
  ensure: () => void
  /** Pet the active companion (click). */
  pet: () => void
  /** Feed the active companion. */
  feed: () => void
  /** Hide the active companion. */
  hide: () => void
  /** Persist a drag position. */
  dragEnd: (right: number, bottom: number) => void
  /** Rename the pet (persisted by the host). */
  rename: (name: string) => void
  /** Clear the reaction bubble. */
  feedbackDone: () => void
}

/** Composed props of the global pet entry (locale + injected; no slot runtime share). */
export type PetDockEntryProps =
  PetInjected
  & PropsLocale<typeof NS>

const DEFAULT_DISPLAY: PetDisplayConfig = { visible: true, size: 160, right: 24, bottom: 20 }

/**
 * Dock entry: while the pet is visible, mount the floating PetCompanion (it
 * portals itself onto document.body); while hidden, render nothing so the
 * page stays clear until visibility is restored from Settings. The store is the plugin-owned
 * single instance — the slot system provides none because the pet is
 * host-global, not session-scoped.
 */
export function PetDockEntry(props: PetDockEntryProps): ReactElement {
  const { store, ensure } = props
  const ui = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const snapshot = ui.snapshot
  const feedback = ui.feedback
  const visible = snapshot?.display.visible ?? true

  useEffect(() => {
    ensure()
  }, [ensure])

  if (visible) {
    return (
      <span data-pet-dock data-testid="pet-dock">
        <PetCompanion
          snapshot={snapshot}
          display={snapshot?.display ?? DEFAULT_DISPLAY}
          feedback={feedback}
          onPet={props.pet}
          onFeed={props.feed}
          onHide={props.hide}
          onDragEnd={props.dragEnd}
          onRename={props.rename}
          onFeedbackDone={props.feedbackDone}
          t={props.t}
        />
      </span>
    )
  }
  return <></>
}

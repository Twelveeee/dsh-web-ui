/**
 * dsh-pet browser half — mounts the selected pet as a global floating surface
 * and drives it from the host's same-origin `/api/pet/*` JSON endpoints: poll
 * the host snapshot (~800 ms), forward interactions, persist drag positions.
 * The pet is host-global (no session dimension), so it mounts directly onto
 * `document.body` via a single React root rather than a session-scoped slot —
 * on the new-conversation screen no session exists, and a dock-mounted pet
 * would vanish there (issue #48). When hidden, the pet leaves no page-level
 * control and can be restored from Settings.
 * @module @linxin666/dsh-pet/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the settings-surface slot declarations used by the card.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PetDisplayConfig } from '../persist.ts'
import type { PetInteractResult, PetStateView } from '../service.ts'
import type { PetInteraction } from '../affinity.ts'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { createPetStore, type PetStoreInstance } from './pet-store.ts'
import { PetDockEntry, type PetInjected } from './PetDockEntry.tsx'
import { PetSettingsCard, PetSettingsCardController } from './PetSettingsCard.tsx'
import { PetDirectSettingsScope, type PetSettingsApi } from './pet-settings-scope.ts'
import { NS, en, zh, t } from './locales.ts'

/** The host pet API as the browser sees it (same-origin JSON endpoints). */
interface PetHttpApi extends PetSettingsApi {
  state(): Promise<PetStateView>
  interact(kind: PetInteraction): Promise<PetInteractResult>
  setVisible(visible: boolean): Promise<{ ok: true; display: PetDisplayConfig }>
  setConfig(patch: Partial<PetDisplayConfig>): Promise<{ ok: true; display: PetDisplayConfig }>
  setName(name: string): Promise<{ ok: true; name: string } | { ok: false; error: string }>
  setPet(petId: string): Promise<{ ok: true; petId: string } | { ok: false; error: string }>
}

/** Same-origin JSON fetch helper (GET without body, POST with JSON body). */
async function petFetch<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, body === undefined
    ? {}
    : {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
  if (!response.ok) {
    throw new Error(`pet ${path} failed: ${response.status}`)
  }
  return (await response.json()) as T
}

/** The live host API instance (always defined; failures surface per call). */
const petApi: PetHttpApi = {
  state: () => petFetch('/api/pet/state'),
  interact: (kind) => petFetch('/api/pet/interact', { kind }),
  setVisible: (visible) => petFetch('/api/pet/set-visible', { visible }),
  setConfig: (patch) => petFetch('/api/pet/set-config', patch),
  setName: (name) => petFetch('/api/pet/set-name', { name }),
  setPet: (petId) => petFetch('/api/pet/set-pet', { petId }),
}

/** Poll interval for the host snapshot. */
const POLL_MS = 800

/** Required services. */
export const inject = ['slots', 'locale']

/** Re-exported for consumers that type against the injected face. */
export type { PetInjected, PetDockEntryProps } from './PetDockEntry.tsx'
export type { PetUiState, PetFeedback } from './pet-store.ts'
export type { PetSettingsCardFace, PetSettingsCardState } from './PetSettingsCard.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /**
     * The child slot the Web UI plugin group declares; this card registers
     * into the group instead of the top-level `settings.plugin.item` list.
     * Spelled here with the same shape so this package can register without
     * depending on the sibling UI package.
     */
    'web-ui.plugin.item': { kind: 'list'; scope: 'root'; owner: SettingsPluginItemOwnerProps }
  }
}

/** Owner share of a plugin card (the group card supplies nothing). */
export interface SettingsPluginItemOwnerProps {
  /** Marker field: card owner props are intentionally empty. */
  children?: never
}

/**
 * Client plugin body: register dictionaries, mount the global pet entry and
 * poll loop, and seat the direct-API settings card in the Web UI plugin group.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'pet: dictionaries')

  // Current DSH releases expose only a fixed set of official settings
  // namespaces to browsers. This adapter uses dsh-pet's own host routes,
  // which persist the same values without changing DSH source.
  const settingsScope = new PetDirectSettingsScope(petApi)
  const petSettings = new PetSettingsCardController(settingsScope)
  ctx.slots.inject('web-ui.plugin.item', () => ctx.slots.register({
    name: 'web-ui.plugin.item',
    id: 'pet-settings',
    order: 140,
    locale: NS,
    inject: () => petSettings.inject(),
  }, PetSettingsCard))

  // ONE store instance for the whole app, owned by this apply body. The pet
  // is host-global, so session-scoped store ownership would reset it on
  // session switches and leave it absent on the new-conversation screen.
  const petStore: PetStoreInstance = createPetStore().create()
  const setSnapshot = petStore.actions.setSnapshot
  const setState = petStore.actions.setState
  const setFeedback = petStore.actions.setFeedback

  const acceptSnapshot = (snapshot: PetStateView): void => {
    setSnapshot(snapshot)
    settingsScope.accept(snapshot)
  }
  const pollNow = (): void => {
    petApi.state().then(acceptSnapshot, () => {
      setState('error', 'pet.state transport error')
    })
  }

  ctx.effect(() => {
    // Poll only while the tab is visible. Returning to the tab refreshes
    // both the floating pet and the settings card immediately.
    let timer: number | undefined
    const stop = (): void => {
      if (timer !== undefined) {
        window.clearInterval(timer)
        timer = undefined
      }
    }
    const start = (): void => {
      if (timer === undefined && document.visibilityState === 'visible') {
        timer = window.setInterval(pollNow, POLL_MS)
      }
    }
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        pollNow()
        start()
      } else {
        stop()
      }
    }
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, 'pet: poll')

  const injected: PetInjected = {
    store: petStore,
    ensure: pollNow,
    pet: () => {
      petApi.interact('pet').then((result) => {
        setFeedback({ text: result.reaction, kind: 'pet', at: Date.now() })
      }, () => {})
    },
    feed: () => {
      petApi.interact('feed').then((result) => {
        setFeedback({ text: result.reaction, kind: 'feed', at: Date.now() })
      }, () => {})
    },
    hide: () => {
      petApi.setVisible(false).then(pollNow, () => {})
    },
    dragEnd: (right, bottom) => {
      petApi.setConfig({ right, bottom }).then(pollNow, () => {})
    },
    rename: (name) => {
      petApi.setName(name).then((result) => {
        if (result.ok) pollNow()
      }, () => {})
    },
    feedbackDone: () => { setFeedback(null) },
  }

  // The official shell has no root-scoped slot for a global floating surface,
  // so mount one React root on document.body for the client plugin lifetime.
  ctx.effect(() => {
    const container = document.createElement('div')
    container.dataset.dshPetRoot = ''
    document.body.appendChild(container)
    const petRoot = createRoot(container)
    petRoot.render(createElement(PetDockEntry, { ...injected, t }))
    return () => {
      petRoot.unmount()
      container.remove()
    }
  }, 'pet: global UI')
}

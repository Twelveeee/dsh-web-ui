/**
 * The pet settings card: display layout and name, bound to the `pet` settings
 * namespace the host plugin registers. Registered into the
 * `settings.plugin.item` slot the plugin-configuration section renders.
 */

import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { PluginSettingsCard, ValueField, BooleanField, ChoiceField } from './PluginSettingsCard.tsx'
import { CardForm, booleanField, numberField, textField, type CardActions, type CardShell, type FieldState as CardFieldState } from './settings-form.ts'

/** The pet's settings fields this card edits (the namespace's full schema). */
export interface PetSettings {
  /** Active pet identity. */
  petId?: string
  /** Available pets shown by the settings selector. */
  pets?: {
    id: string
    name: string
    description?: string
  }[]
  /** Master switch. */
  visible?: boolean
  /** Scale of the rendered pet in px (sprite cell height). */
  size?: number
  /** Horizontal inset from the viewport right edge, px. */
  right?: number
  /** Vertical inset from the viewport bottom edge, px. */
  bottom?: number
  /** User-customizable pet display name. */
  name?: string
}

/** What the pet settings card renders. */
export interface PetSettingsCardState extends CardShell {
  /** Active pet identity. */
  petId: string
  /** Available pets shown by the settings selector. */
  pets: NonNullable<PetSettings['pets']>
  /** True while a pet switch is crossing the wire. */
  switchingPet: boolean
  /** Whether the latest pet switch failed. */
  switchPetFailed: boolean
  /** Master switch. */
  visible: CardFieldState
  /** Pet scale. */
  size: CardFieldState
  /** Right inset. */
  right: CardFieldState
  /** Bottom inset. */
  bottom: CardFieldState
  /** Pet name. */
  name: CardFieldState
}

/** The registration-side face the card's slot entry injects. */
export interface PetSettingsCardFace extends CardActions {
  hooks: {
    /** Card snapshot bound by the renderer as usePetSettingsCard. */
    petSettingsCard: SnapshotStore<PetSettingsCardState>
  }
  /** Switch the active pet immediately. */
  selectPet: (petId: string) => void
}

/** Bridges the `pet` scope onto the card's staged form. */
export class PetSettingsCardController {
  private readonly form: CardForm<PetSettings>
  private readonly store: SnapshotStore<PetSettingsCardState>
  private switchingPet = false
  private switchPetFailed = false

  /** @param scope - the bound settings scope for the `pet` namespace. */
  constructor(private readonly scope: SettingsScope<PetSettings>) {
    this.form = new CardForm(scope, [
      booleanField('visible'),
      numberField('size'),
      numberField('right'),
      numberField('bottom'),
      textField('name'),
    ])
    this.store = this.form.bind(() => this.projection())
    let activePetId = scope.getSnapshot().value?.petId
    scope.subscribe(() => {
      const nextPetId = scope.getSnapshot().value?.petId
      if (activePetId !== undefined && nextPetId !== undefined && activePetId !== nextPetId) {
        this.form.discard()
      }
      activePetId = nextPetId
    })
  }

  private projection(): PetSettingsCardState {
    const value = this.scope.getSnapshot().value
    return {
      ...this.form.shell(),
      petId: value?.petId ?? '',
      pets: value?.pets ?? [],
      switchingPet: this.switchingPet,
      switchPetFailed: this.switchPetFailed,
      visible: this.form.field('visible'),
      size: this.form.field('size'),
      right: this.form.field('right'),
      bottom: this.form.field('bottom'),
      name: this.form.field('name'),
    }
  }

  /**
   * Build the face the card's slot registration injects.
   * @returns the card's snapshot and its form actions.
   */
  inject(): PetSettingsCardFace {
    return {
      hooks: { petSettingsCard: this.store },
      ...this.form.actions(),
      selectPet: (petId) => { void this.selectPet(petId) },
    }
  }

  private async selectPet(petId: string): Promise<void> {
    const current = this.scope.getSnapshot().value?.petId
    if (petId === '' || petId === current || this.switchingPet) return
    this.switchingPet = true
    this.switchPetFailed = false
    this.store.set(this.projection())
    try {
      await this.scope.set('petId', petId)
    } catch {
      this.switchPetFailed = true
    } finally {
      this.switchingPet = false
      this.store.set(this.projection())
    }
  }
}

/** Props the renderer binds for the pet settings card. */
export type PetSettingsCardProps =
  PropsLocale<'pet'>
  & InjectFace<PetSettingsCardFace>

/**
 * Render the pet settings card.
 * @param props - locale copy, the card snapshot, and its form actions.
 * @returns the card.
 */
export function PetSettingsCard(props: PetSettingsCardProps) {
  const { t } = props
  const state = props.usePetSettingsCard(snapshot => snapshot)
  const disabled = !state.writable
  const fieldProps = {
    overriddenLabel: t('settings.overridden'),
    resetLabel: t('settings.reset'),
    invalidLabel: t('settings.invalidNumber'),
    disabled,
  }
  return (
    <PluginSettingsCard
      t={t}
      titleKey="settings.title"
      descriptionKey="settings.description"
      state={state}
      onSave={props.save}
      onDiscard={props.discard}
    >
      <ChoiceField
        id="settings-pet-selection"
        label={t('settings.pet')}
        hint={state.dirty ? t('settings.petHintUnsaved') : t('settings.petHint')}
        value={state.petId}
        options={state.pets.map(pet => ({
          value: pet.id,
          label: pet.name,
          ...(pet.description === undefined ? {} : { description: pet.description }),
        }))}
        disabled={!state.writable || state.saving || state.switchingPet || state.dirty}
        failed={state.switchPetFailed}
        failedLabel={t('settings.petSwitchFailed')}
        onEdit={props.selectPet}
      />
      <BooleanField
        id="settings-pet-visible"
        label={t('settings.visible')}
        hint={t('settings.visibleHint')}
        onLabel={t('settings.on')}
        offLabel={t('settings.off')}
        {...fieldProps}
        {...state.visible}
        onEdit={(text) => { props.edit('visible', text) }}
        onReset={() => { props.resetField('visible') }}
      />
      <ValueField
        id="settings-pet-size"
        label={t('settings.size')}
        hint={t('settings.sizeHint')}
        numeric
        {...fieldProps}
        {...state.size}
        onEdit={(text) => { props.edit('size', text) }}
        onReset={() => { props.resetField('size') }}
      />
      <ValueField
        id="settings-pet-right"
        label={t('settings.right')}
        hint={t('settings.rightHint')}
        numeric
        {...fieldProps}
        {...state.right}
        onEdit={(text) => { props.edit('right', text) }}
        onReset={() => { props.resetField('right') }}
      />
      <ValueField
        id="settings-pet-bottom"
        label={t('settings.bottom')}
        hint={t('settings.bottomHint')}
        numeric
        {...fieldProps}
        {...state.bottom}
        onEdit={(text) => { props.edit('bottom', text) }}
        onReset={() => { props.resetField('bottom') }}
      />
      <ValueField
        id="settings-pet-name"
        label={t('settings.name')}
        hint={t('settings.nameHint')}
        {...fieldProps}
        {...state.name}
        onEdit={(text) => { props.edit('name', text) }}
        onReset={() => { props.resetField('name') }}
      />
    </PluginSettingsCard>
  )
}

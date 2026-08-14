/**
 * dsh-pet locale dictionaries (zh/en).
 * @module @linxin666/dsh-pet/client/locales
 */

/** Dictionary namespace this package registers. */
export const NS = 'pet'

/** Chinese copy. */
export const zh = {
  'pet.feed': '喂食',
  'pet.hide': '隐藏',
  'pet.rename': '改名',
  'pet.confirm': '确定',
  'pet.defaultName': '宠物',
  'pet.namePlaceholder': '输入新名字',
  'pet.spriteLabel': '{name}，点击互动，拖动可移动',
  'pet.rank': '亲密度 {rank}',
  'pet.points': '{points} 点',
  'pet.treats': '零食 ×{n}',
  'pet.state.loading': '宠物正在赶来…',
  'pet.state.error': '宠物暂时走丢了（连接失败）',
  // 插件设置卡片（settings.plugin.item 席位）。
  'settings.title': '宠物',
  'settings.description': '选择宠物并配置显示布局。',
  'settings.enabled': '启用宠物',
  'settings.enabledHint': '关闭后隐藏宠物并停止轮询，可在设置里重新启用。',
  'settings.pet': '选择宠物',
  'settings.petHint': '切换后立即生效；每只宠物保留自己的名字。',
  'settings.petHintUnsaved': '请先保存或放弃当前修改，再切换宠物。',
  'settings.petSwitchFailed': '切换失败，请重试。',
  'settings.visible': '显示宠物',
  'settings.visibleHint': '隐藏后页面不保留按钮，可回到这里重新显示。',
  'settings.size': '大小（px）',
  'settings.sizeHint': '精灵单元高度，范围 32–512。',
  'settings.right': '距右侧（px）',
  'settings.rightHint': '距视口右边缘的水平内缩距离。',
  'settings.bottom': '距底部（px）',
  'settings.bottomHint': '距视口底边的垂直内缩距离。',
  'settings.name': '名字',
  'settings.nameHint': '宠物显示名，1–20 个字符。',
  'settings.on': '显示',
  'settings.off': '隐藏',
  'settings.overridden': '已覆盖',
  'settings.reset': '恢复默认',
  'settings.notExposed': '暂时无法连接宠物设置服务。请确认插件宿主已启用，然后重新加载页面。',
  'settings.readOnly': '当前部署的设置只读。',
  'settings.expand': '展开设置',
  'settings.collapse': '收起设置',
  'settings.save': '保存',
  'settings.saving': '保存中…',
  'settings.discard': '放弃',
  'settings.unsaved': '未保存',
  'settings.saveFailed': '部署未接受这些值，已保留供你修改。',
  'settings.invalidNumber': '请输入数字，留空则使用默认值。',
} as const

/** English copy. */
export const en = {
  'pet.feed': 'Feed',
  'pet.hide': 'Hide',
  'pet.rename': 'Rename',
  'pet.confirm': 'OK',
  'pet.defaultName': 'Pet',
  'pet.namePlaceholder': 'Enter a new name',
  'pet.spriteLabel': '{name}; click to interact, drag to move',
  'pet.rank': 'Affinity {rank}',
  'pet.points': '{points} pts',
  'pet.treats': 'Treats ×{n}',
  'pet.state.loading': 'Your pet is on the way…',
  'pet.state.error': 'Your pet is temporarily lost (connection failed)',
  // Plugin settings card (the `settings.plugin.item` seat).
  'settings.title': 'Pet',
  'settings.description': 'Choose a pet and configure its display layout.',
  'settings.enabled': 'Enable the pet',
  'settings.enabledHint': 'When off, the pet hides and polling stops; re-enable it here.',
  'settings.pet': 'Choose a pet',
  'settings.petHint': 'Changes apply immediately; each pet keeps its own name.',
  'settings.petHintUnsaved': 'Save or discard the current edits before switching pets.',
  'settings.petSwitchFailed': 'Could not switch pets. Try again.',
  'settings.visible': 'Show the pet',
  'settings.visibleHint': 'When hidden, no button remains on the page; return here to show the pet again.',
  'settings.size': 'Size (px)',
  'settings.sizeHint': 'Sprite cell height, 32\u2013512.',
  'settings.right': 'Right inset (px)',
  'settings.rightHint': 'Horizontal inset from the viewport right edge.',
  'settings.bottom': 'Bottom inset (px)',
  'settings.bottomHint': 'Vertical inset from the viewport bottom edge.',
  'settings.name': 'Name',
  'settings.nameHint': 'The pet\u2019s display name, 1\u201320 characters.',
  'settings.on': 'Show',
  'settings.off': 'Hide',
  'settings.overridden': 'Overridden',
  'settings.reset': 'Reset to default',
  'settings.notExposed': 'The pet settings service is temporarily unavailable. Confirm that the host plugin is enabled, then reload the page.',
  'settings.readOnly': 'This deployment stores settings read-only.',
  'settings.expand': 'Show settings',
  'settings.collapse': 'Hide settings',
  'settings.save': 'Save',
  'settings.saving': 'Saving\u2026',
  'settings.discard': 'Discard',
  'settings.unsaved': 'Unsaved',
  'settings.saveFailed': 'The deployment did not accept these values; they were left for you to correct.',
  'settings.invalidNumber': 'Enter a number, or leave blank to use the default.',
} as const

/** Key union for this namespace. */
export type PetKey = keyof typeof zh

/** The settings-card slice of the pet dictionary. */
export type SettingsCardKey = PetKey

/**
 * Active dictionary, picked by the document language at call time. The pet
 * mounts as a global floating surface (not a session-scoped slot), so it has
 * no framework locale seat and resolves its copy the same tiny way the
 * task-board's DOM-injected surface does.
 */
export function dictionary(): Record<PetKey, string> {
  const lang = typeof document !== 'undefined' ? document.documentElement.lang : 'zh'
  return lang.toLowerCase().startsWith('en') ? en : zh
}

/**
 * Translate a key with optional `{name}` template params. Mirrors the slot
 * `Translate` contract `(key, params?) => string` so it can be handed to the
 * same components that used to receive the framework-injected `t` seat. The
 * key is typed loosely (`string`) so the function is assignable to the slot's
 * `TranslateNS<'pet'>` (whose key domain also spans the shared common
 * vocabulary); a missing key degrades to the key itself rather than throwing.
 */
export function t(key: string, params?: Record<string, unknown>): string {
  let text: string = (dictionary() as Record<string, string>)[key] ?? key
  if (params !== undefined) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-pet UI copy. */
    pet: PetKey
  }
}

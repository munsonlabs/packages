/**
 * `@munsonlabs/reel/vue`: the picker as a Vue component, built on `@munsonlabs/video-player` (a peer
 * dependency, with Vue). Import `@munsonlabs/reel/style` and the player's stylesheet alongside it.
 * Reel's core and Mediabunny load only when a picker opens.
 */
export { default as ReelPicker } from '@/ui/picker/ReelPicker.vue'
export { getPickerDefaults, setPickerDefaults } from '@/registries/pickerDefaults'
export type { PickerDefaults, PickerLabels, PickerStamp, ShareCaptionInfo } from '@/registries/pickerDefaults'
export type { PickerApi, PickerState, ReelCopyDetail, ReelErrorDetail, ReelExportDetail, ShareResult } from '@/ui/picker/types'
export type { Range } from '@/ui/picker/features/range'

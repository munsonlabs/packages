import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import { DEFAULT_LABELS } from '../utils'
import type { EditorLabels } from '@/types/editor'

const LABELS: InjectionKey<ComputedRef<EditorLabels>> = Symbol('splice-labels')

/**
 * Gives the editor's labels to every part of it, so none of them needs a labels prop.
 */
export function provideLabels(labels: ComputedRef<EditorLabels>): void {
  provide(LABELS, labels)
}

/**
 * Reads the labels SpliceEditor provides, falling back to the defaults.
 */
export function useLabels(): ComputedRef<EditorLabels> {
  return inject(LABELS, () => computed(() => DEFAULT_LABELS), true)
}

import type { EditorState, SpliceEditorProps } from '@/types/editor'

export interface SpliceEditorElement extends HTMLElement, SpliceEditorProps {
  readonly state: EditorState
  show(): void
  close(): void
  export(): Promise<void>
  cancel(): void
}

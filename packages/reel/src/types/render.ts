/**
 * How burned-in captions look: overrides on reel's one caption look, white bold text on a translucent
 * dark box near the bottom, made for desktop and TV viewing. Values left out (or `undefined`) keep the
 * defaults below. Sizes and vertical distances are fractions of the output height, widths fractions of
 * its width, so a caption looks the same at every output size. Long cues wrap onto more lines.
 */
export interface CaptionStyle {
  /** CSS font family. Defaults to a system sans-serif stack. */
  fontFamily?: string
  /** CSS font weight. Defaults to `700`. */
  fontWeight?: number | string
  /** Font size as a fraction of the output height. Defaults to `0.045`. */
  size?: number
  /** Text colour. Defaults to white. */
  color?: string
  /** Box behind each line, or `null` for none. Defaults to translucent black, `'rgba(0, 0, 0, 0.6)'`. */
  background?: string | null
  /** Vertical placement of the caption block. Defaults to `'bottom'`. */
  position?: 'top' | 'middle' | 'bottom'
  /**
   * Distance from the top or bottom edge to the block, as a fraction of the output height (unused for
   * `'middle'`). Defaults to `0.14`.
   */
  margin?: number
  /** Widest a line may run before wrapping, as a fraction of the output width. Defaults to `0.86`. */
  maxWidth?: number
}

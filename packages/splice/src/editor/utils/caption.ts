import type { ShareCaption, ShareCaptionInfo } from '@/types/editor'

/**
 * Fills in the template, or calls the function, then tidies the blank lines an empty title or url
 * leaves behind. A clip with no title just shares its link.
 */
export function formatShareCaption(template: ShareCaption, info: ShareCaptionInfo): string {
  const text =
    typeof template === 'function'
      ? template(info)
      : template.replace(/\{(title|url|publisher)\}/g, (_match, key: 'title' | 'url' | 'publisher') => info[key])
  return text
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

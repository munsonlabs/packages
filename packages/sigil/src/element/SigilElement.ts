import { watchIcon } from '../watch'
import { createIconNode } from './render'

const ATTRIBUTES = ['name', 'library', 'variant'] as const

const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement

/**
 * `<ml-sigil name="…" library="…" variant="…">`: renders the icon the registry resolves for its
 * attributes, into light DOM so page CSS can size and colour it. The three attributes are mirrored as
 * properties, and changing either re-resolves. While connected it follows the registry, so a library
 * registered later, a `use()` switch or an override from another script all show up in place.
 *
 * The class extends a stand-in when `HTMLElement` is missing so the module can be imported on a server;
 * `defineElements` is a no-op there too.
 */
export class SigilElement extends Base {
  static readonly observedAttributes = ATTRIBUTES

  #stop?: () => void

  get name(): string {
    return this.getAttribute('name') ?? ''
  }
  set name(value: string) {
    this.#reflect('name', value)
  }

  get library(): string | undefined {
    return this.getAttribute('library') ?? undefined
  }
  set library(value: string | undefined) {
    this.#reflect('library', value)
  }

  get variant(): string | undefined {
    return this.getAttribute('variant') ?? undefined
  }
  set variant(value: string | undefined) {
    this.#reflect('variant', value)
  }

  connectedCallback(): void {
    this.#watch()
  }

  disconnectedCallback(): void {
    this.#stop?.()
    this.#stop = undefined
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.#watch()
    }
  }

  /**
   * Writes a property back to its attribute, removing the attribute for `undefined` so the element's
   * markup always says exactly what it renders.
   */
  #reflect(attribute: string, value: string | undefined): void {
    if (value === undefined || value === null) {
      this.removeAttribute(attribute)
    } else {
      this.setAttribute(attribute, value)
    }
  }

  /**
   * Starts (or restarts) following the registry for the current attributes. Any previous watch is
   * stopped first, which is also what discards an asynchronous result still in flight for the old
   * attributes. With no `name` there is nothing to resolve, so the element is emptied.
   */
  #watch(): void {
    this.#stop?.()
    this.#stop = undefined

    const name = this.name
    if (!name) {
      this.replaceChildren()
      return
    }

    this.#stop = watchIcon(name, { library: this.library, variant: this.variant }, (icon) => {
      if (icon) {
        this.replaceChildren(createIconNode(icon, this.ownerDocument))
      } else {
        this.replaceChildren()
      }
    })
  }
}

/**
 * Registers `<ml-sigil>` (or another tag name) once. Safe to call repeatedly and from several copies of
 * the package: an already-defined tag is left alone rather than throwing.
 */
export function defineElements(tag = 'ml-sigil'): void {
  if (typeof customElements === 'undefined') {
    return
  }
  if (!customElements.get(tag)) {
    customElements.define(tag, SigilElement)
  }
}

import { computed, ref } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import { logCalls } from './logCalls'

/**
 * @typedef {object} Options
 * @property {() => unknown} context What the kit's sources get as `context`: the app, or a stand-in for it.
 * @property {(data: unknown) => string} describe
 */

/**
 * Logs what the previewed widget asks of the app. The context is wrapped so every function
 * called on it is recorded, however deep (`cart.add`), and still runs. Each interaction also
 * gets one toast naming everything it called.
 *
 * @param {Options} options
 */
export function useCallLog({ context, describe }) {
  const toast = useToast()
  const calls = ref([])
  let burst = []
  let flush

  function onCall(call) {
    calls.value = [call, ...calls.value].slice(0, 50)
    burst.push(call)
    clearTimeout(flush)
    flush = setTimeout(() => {
      toast.add({ title: burst.map((c) => c.method).join(' · '), icon: 'i-lucide-zap', duration: 2000 })
      burst = []
    }, 60)
  }

  /** The context the preview passes to the widget: the app's, recorded. */
  const previewContext = computed(() => (context() === undefined ? undefined : logCalls(context(), onCall)))

  const formatArg = (arg) => (arg && typeof arg === 'object' ? describe(arg) : JSON.stringify(arg))
  const clear = () => (calls.value = [])

  return { calls, previewContext, formatArg, clear }
}

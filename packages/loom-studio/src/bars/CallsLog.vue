<script setup>
import { useStudio } from '../studio'

/** Bottom left: every call the previewed widget made to the app (the context), newest first. */
const s = useStudio()
</script>

<template>
  <div class="absolute bottom-3 left-3">
    <UPopover v-model:open="s.open.calls" :content="{ side: 'top', align: 'start', sideOffset: 8 }">
      <UButton
        :label="s.callLog.calls.length ? `${s.callLog.calls.length} call${s.callLog.calls.length > 1 ? 's' : ''}` : 'No calls yet'"
        icon="i-lucide-activity"
        size="xs"
        color="neutral"
        variant="soft"
        class="loom-bar rounded-full"
        :disabled="s.props.context === undefined"
      />
      <template #content>
        <div class="max-h-80 w-[28rem] overflow-y-auto p-2 font-mono text-xs">
          <div class="mb-1 flex items-center px-1 font-sans text-muted">
            Calls made to the context
            <UButton v-if="s.callLog.calls.length" label="Clear" size="xs" color="neutral" variant="link" class="ml-auto" @click="s.callLog.clear" />
          </div>
          <p v-if="!s.callLog.calls.length" class="px-1 py-2 font-sans text-dimmed">Press Try, then use the widget.</p>
          <div v-for="call in s.callLog.calls" :key="call.at + call.method" class="flex gap-3 px-1 py-0.5">
            <span class="text-dimmed">{{ new Date(call.at).toLocaleTimeString() }}</span>
            <span class="text-primary">{{ call.method }}</span>
            <span class="truncate text-muted">{{ call.args.map(s.callLog.formatArg).join(', ') }}</span>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>

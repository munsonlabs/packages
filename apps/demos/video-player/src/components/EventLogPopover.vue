<script setup lang="ts">
import { ref } from 'vue'
import { useEventLog } from '../composables/useEventLog'
import { usePrebidLog } from '../composables/usePrebidLog'
import { usePopover } from '../composables/usePopover'

const { log, clearLog } = useEventLog()
const { prebidLogs, clearPrebidLogs } = usePrebidLog()
const { isOpen, toggle, close } = usePopover('events')

const tab = ref<'events' | 'prebid'>('events')
</script>

<template>
  <div class="popover-wrap">
    <button class="popover-btn" :class="{ 'popover-btn--active': isOpen }" @click="toggle">
      <svg
        class="popover-btn__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M3 12h4l3 8 4-16 3 8h4" />
      </svg>
      Events
      <span v-if="log.length" class="popover-btn__badge">{{ log.length }}</span>
    </button>
    <div v-if="isOpen" class="popover-backdrop" @click="close" />
    <Transition name="pop">
      <div v-if="isOpen" class="popover popover--wide">
        <div class="popover__header">
          <div class="log-tabs">
            <button class="log-tab" :class="{ 'log-tab--active': tab === 'events' }" @click="tab = 'events'">Events</button>
            <button class="log-tab" :class="{ 'log-tab--active': tab === 'prebid' }" @click="tab = 'prebid'">
              Prebid
              <span v-if="prebidLogs.length" class="log-tab__badge">{{ prebidLogs.length }}</span>
            </button>
          </div>
          <button class="theme__reset" @click="tab === 'events' ? clearLog() : clearPrebidLogs()">Clear</button>
        </div>
        <div class="log">
          <div class="log__chrome"><span /><span /><span /></div>
          <div v-if="tab === 'events'" class="log__body">
            <div v-if="log.length === 0" class="log__empty">No events yet, play a video to see them stream in here.</div>
            <div v-for="(entry, i) in log" :key="i" class="log__entry">
              <span class="log__time">{{ entry.time }}</span>
              <span class="log__type" :class="`log__type--${entry.type}`">{{ entry.type }}</span>
              <span class="log__data">{{ entry.ct }} {{ entry.dur }}</span>
              <span class="log__src">{{ entry.src }}</span>
            </div>
          </div>
          <div v-else class="log__body">
            <div v-if="prebidLogs.length === 0" class="log__empty">
              No Prebid activity yet, play the header-bidding video to see the auction logs stream in here.
            </div>
            <div v-for="(entry, i) in prebidLogs" :key="i" class="log__entry log__entry--prebid">
              <span class="log__time">{{ entry.time }}</span>
              <span class="log__type" :class="`log__type--${entry.level}`">{{ entry.level }}</span>
              <span class="log__src">{{ entry.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

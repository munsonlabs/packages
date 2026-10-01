<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    seal?: boolean
    glyph?: SealGlyph
    stripes?: boolean
    intro?: boolean
  }>(),
  { seal: false, glyph: 'labs', stripes: false, intro: false },
)

const LETTER = 'M7 24V14.5a4.5 4.5 0 0 1 9 0V24M16 14.5a4.5 4.5 0 0 1 9 0V18.4'
const maskId = useId()
</script>

<template>
  <span class="ml-mark" :class="{ 'has-stripes': stripes, 'is-intro': intro }">
    <template v-if="stripes">
      <span class="band b1" />
      <span class="band b2" />
      <span class="band b3" />
    </template>
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs v-if="seal">
        <mask :id="maskId" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect x="23.4" y="1.6" width="7" height="7" rx="1.3" fill="#fff" />
          <template v-for="part in SEAL_GLYPHS[props.glyph]" :key="part.d">
            <path
              v-if="part.kind === 'line'"
              :d="part.d"
              fill="none"
              stroke="#000"
              :stroke-width="'width' in part ? part.width : 0.9"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path v-else :d="part.d" fill="#000" />
          </template>
        </mask>
      </defs>
      <g transform="rotate(-8 16 16) translate(-0.9 -1.9)">
        <g class="bob" fill="none" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round">
          <g transform="translate(1.8 1.8)">
            <g class="shadow">
              <path :d="LETTER" stroke-width="8" style="stroke: var(--ui-bg)" />
              <circle cx="25" cy="24.1" r="4.1" style="fill: var(--ui-bg)" />
            </g>
          </g>
          <path :d="LETTER" stroke-width="8" style="stroke: var(--ui-bg)" />
          <circle cx="25" cy="24.1" r="4.1" style="fill: var(--ui-bg)" />
          <g transform="translate(1.8 1.8)">
            <g class="shadow">
              <path :d="LETTER" style="stroke: var(--ui-primary)" />
              <circle cx="25" cy="24.1" r="2.7" style="fill: var(--ui-primary)" />
            </g>
          </g>
          <g class="face">
            <g class="press">
              <path :d="LETTER" stroke="currentColor" />
              <circle cx="25" cy="24.1" r="2.7" fill="currentColor" />
            </g>
          </g>
        </g>
      </g>
      <g v-if="seal" class="seal">
        <rect x="23.4" y="1.6" width="7" height="7" rx="1.3" :mask="`url(#${maskId})`" style="fill: var(--ui-primary)" />
      </g>
    </svg>
  </span>
</template>

<style scoped>
.ml-mark {
  container-type: size;
  --face-delay: 80ms;
  --shadow-delay: 380ms;
  --seal-delay: 700ms;
  --breathe-delay: 1.2s;
  position: relative;
  display: inline-block;
  line-height: 0;
}

.ml-mark.has-stripes {
  --face-delay: 260ms;
  --shadow-delay: 560ms;
  --seal-delay: 860ms;
  --breathe-delay: 1.4s;
}

svg {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.band {
  position: absolute;
  left: 0;
  right: 0;
  height: 10.625%;
  transform-origin: 0 50%;
}

.b1 {
  top: 28.125%;
  background: var(--ui-secondary);
}

.b2 {
  top: 44.6875%;
  background: var(--ui-primary);
}

.b3 {
  top: 61.25%;
  background: var(--ui-color-primary-800);
}

.bob,
.face,
.press,
.shadow,
.seal {
  transform-box: fill-box;
  transform-origin: 50% 50%;
}

.bob {
  transition: transform 360ms cubic-bezier(0.3, 1.4, 0.5, 1);
}

.ml-mark:hover .bob {
  transform: rotate(8deg);
}

.press {
  transition: transform 120ms cubic-bezier(0.3, 0.7, 0.4, 1);
}

.ml-mark:active .press {
  transform: translate(1.2px, 1.2px);
}

.is-intro .band {
  animation: wipe 560ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.is-intro .b2 {
  animation-delay: 70ms;
}

.is-intro .b3 {
  animation-delay: 140ms;
}

.is-intro .face {
  animation: drop-in 520ms cubic-bezier(0.3, 1.5, 0.5, 1) both var(--face-delay);
}

.is-intro .shadow {
  animation:
    slide 380ms ease-out both var(--shadow-delay),
    breathe 4.8s ease-in-out var(--breathe-delay) infinite;
}

.is-intro .seal {
  animation: stamp 480ms cubic-bezier(0.3, 1.6, 0.5, 1) both var(--seal-delay);
}

@keyframes wipe {
  from {
    transform: scaleX(0);
  }
}

@keyframes drop-in {
  from {
    transform: translateY(-6px);
    opacity: 0;
  }
}

@keyframes slide {
  from {
    transform: translate(-1.8px, -1.8px);
  }
}

@keyframes breathe {
  50% {
    transform: translate(-0.7px, -0.7px);
  }
}

@keyframes stamp {
  from {
    transform: scale(1.8) rotate(-14deg);
    opacity: 0;
  }

  60% {
    opacity: 1;
  }
}

@container (max-width: 63px) {
  .seal {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ml-mark * {
    animation: none !important;
    transition: none !important;
  }
}
</style>

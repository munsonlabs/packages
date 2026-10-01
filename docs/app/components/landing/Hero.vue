<script setup lang="ts">
import videoPlayer from '../../../../packages/video-player/package.json'
import sigil from '../../../../packages/sigil/package.json'
import shipkit from '../../../../packages/shipkit/package.json'

const packages = [
  {
    name: 'Video Player',
    version: videoPlayer.version,
    to: '/video-player/getting-started/introduction',
    description: 'Vue 3 player for native, HLS, DASH, embeds and IMA ads.',
    install: 'npm i @munsonlabs/video-player',
    icon: 'i-lucide-play-circle',
  },
  {
    name: 'Sigil',
    version: sigil.version,
    to: '/sigil/getting-started/introduction',
    description: 'Framework-free icon registry with an <ml-sigil-icon> element. Swap whole libraries at runtime.',
    install: 'npm i @munsonlabs/sigil',
    icon: 'i-lucide-shapes',
  },
  {
    name: 'Shipkit',
    version: shipkit.version,
    to: '/shipkit/introduction',
    description: 'The shipkit CLI, shared Vite configs and tsconfigs, for building and releasing packages.',
    install: 'npm i -D @munsonlabs/shipkit',
    icon: 'i-lucide-terminal',
  },
]

const selected = ref(0)
const current = computed(() => packages[selected.value]!)
const copied = ref(false)
const command = useTemplateRef<HTMLElement>('command')

async function copyInstall() {
  try {
    await navigator.clipboard.writeText(current.value.install)
    copied.value = true
    setTimeout(() => (copied.value = false), 1400)
  } catch {
    if (command.value) getSelection()?.selectAllChildren(command.value)
  }
}
</script>

<template>
  <section>
    <UContainer class="landing-hero__inner">
      <div class="landing-hero__copy">
        <UBadge color="primary" variant="subtle" size="lg" class="rounded-md px-3 py-1.5">Open source · MIT</UBadge>
        <h1>Small, independent packages for the <em>web</em>.</h1>
        <p class="landing-hero__lede">
          A video player, an icon registry and the tooling that ships them, all under @munsonlabs. They live in one repo but share no code, so you
          install only what you need.
        </p>
        <div class="flex flex-wrap gap-3">
          <UButton size="xl" to="/getting-started/introduction" trailing-icon="i-lucide-arrow-right">Get started</UButton>
          <UButton
            size="xl"
            color="neutral"
            variant="outline"
            icon="i-simple-icons-github"
            to="https://github.com/munsonlabs/packages"
            target="_blank"
          >
            View on GitHub
          </UButton>
        </div>
        <div class="landing-hero__install">
          <div class="landing-hero__command">
            <code ref="command"><span>$</span> {{ current.install }}</code>
            <UButton size="xs" color="neutral" variant="outline" @click="copyInstall">
              {{ copied ? 'Copied' : 'Copy' }}
            </UButton>
          </div>
          <ULink :to="current.to" class="landing-hero__docs">Read the {{ current.name }} docs →</ULink>
        </div>
      </div>

      <div class="landing-hero__packages" role="group" aria-label="Choose a package to install">
        <UPageCard
          v-for="(pkg, k) in packages"
          :key="pkg.name"
          as="button"
          type="button"
          :icon="pkg.icon"
          :description="pkg.description"
          :highlight="selected === k"
          :aria-pressed="selected === k"
          class="text-left"
          @click="selected = k"
        >
          <template #title>
            {{ pkg.name }} <span class="landing-hero__version">v{{ pkg.version }}</span>
          </template>
        </UPageCard>
        <UPageCard icon="i-lucide-users" title="Contributors" description="The people behind these packages." to="/contributors" />
      </div>
    </UContainer>
  </section>
</template>

<style scoped>
.landing-hero__inner {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 48px 72px;
  align-items: center;
  padding-block: 88px 96px;
}

.landing-hero__copy {
  display: grid;
  gap: 22px;
  justify-items: start;
  min-width: 0;
}

h1 {
  margin: 0;
  font-size: clamp(2.4rem, 5.4vw, 3.75rem);
  line-height: 1.02;
  letter-spacing: -0.035em;
  font-weight: 700;
  color: var(--ui-text-highlighted);
  text-wrap: balance;
}

h1 em {
  font-style: normal;
  color: var(--ui-primary);
}

.landing-hero__lede {
  margin: 0;
  max-width: 46ch;
  font-size: 1.0625rem;
  color: var(--ui-text-muted);
}

.landing-hero__install {
  display: grid;
  gap: 8px;
  justify-self: stretch;
}

.landing-hero__command {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 8px 16px;
  border: 1px solid var(--ui-border);
  border-radius: calc(var(--ui-radius) * 2);
  background: var(--ui-bg-elevated);
  font-size: 14px;
}

.landing-hero__command code {
  flex: 1;
  overflow-x: auto;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
}

.landing-hero__command code span {
  color: var(--ui-primary);
}

.landing-hero__docs {
  justify-self: start;
  font-size: 13px;
  color: var(--ui-text-muted);
}

.landing-hero__packages {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  min-width: 0;
}

.landing-hero__version {
  margin-left: 4px;
  font: 500 12px var(--font-mono);
  color: var(--ui-text-muted);
}

@media (max-width: 639px) {
  .landing-hero__packages {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1023px) {
  .landing-hero__inner {
    grid-template-columns: 1fr;
    padding-block: 56px 64px;
  }
}
</style>

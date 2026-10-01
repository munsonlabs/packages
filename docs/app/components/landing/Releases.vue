<script setup lang="ts">
import videoPlayer from '../../../../packages/video-player/CHANGELOG.md?raw'
import sigil from '../../../../packages/sigil/CHANGELOG.md?raw'
import shipkit from '../../../../packages/shipkit/CHANGELOG.md?raw'

interface Release {
  pkg: string
  version: string
  note: string
  url: string
}

function latest(pkg: string, changelog: string): Release | null {
  const section = changelog.split(/^## /m)[1]
  if (!section) return null
  const version = section.split('\n', 1)[0]!.trim()
  const match = section.match(/^- (?:[0-9a-f]{7}: )?(.+)$(?:\n\n {2}([^\n-][^\n]*))?/m)
  if (!match) return null
  const note = match[1]!.length < 40 && match[2] ? `${match[1]} ${match[2].replace(/:$/, '.')}` : match[1]!
  const folder = pkg.replace('@munsonlabs/', '')
  const url = `https://github.com/munsonlabs/packages/blob/main/packages/${folder}/CHANGELOG.md`
  return { pkg, version, note: note.replace(/\*\*/g, ''), url }
}

const releases = [latest('@munsonlabs/video-player', videoPlayer), latest('@munsonlabs/sigil', sigil), latest('@munsonlabs/shipkit', shipkit)].filter(
  (r): r is Release => !!r,
)

function render(note: string) {
  const escaped = note.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(/`([^`]+)`/g, '<code>$1</code>')
}
</script>

<template>
  <LandingSection eyebrow="Latest releases" title="Recently shipped">
    <div class="grid gap-4 md:grid-cols-3">
      <UPageCard
        v-for="release in releases"
        :key="release.pkg"
        :to="release.url"
        target="_blank"
        spotlight
        spotlight-color="primary"
        :ui="{ container: 'h-full', wrapper: 'h-full', body: 'flex-1', footer: 'mt-auto' }"
      >
        <template #header>
          <div class="flex items-baseline justify-between gap-3">
            <span class="landing-release__version">{{ release.version }}</span>
            <span class="font-mono text-xs text-muted">{{ release.pkg }}</span>
          </div>
        </template>
        <template #description>
          <span class="text-default" v-html="render(release.note)" />
        </template>
        <template #footer>
          <span class="text-sm font-medium text-primary">Read the changelog →</span>
        </template>
      </UPageCard>
    </div>
    <p class="landing-releases__people">Built by <ULink to="/contributors" class="text-primary">munaibh and contributors</ULink>.</p>
  </LandingSection>
</template>

<style scoped>
.landing-release__version {
  font: 700 2rem/1 var(--font-mono);
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: var(--ui-primary);
}

.landing-releases__people {
  margin: 0;
  font-size: 14px;
  color: var(--ui-text-muted);
}
</style>

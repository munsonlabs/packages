<template>
  <div class="splice-toolbar">
    <slot />
  </div>
</template>

<style scoped>
.splice-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
}

.splice-toolbar > :slotted(:last-child) {
  flex: 1 1 auto;
  justify-content: flex-end;
}
</style>

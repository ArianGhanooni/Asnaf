<script setup lang="ts">
defineProps<{
  title?: string;
}>();
</script>

<template>
  <section class="panel-card shadow-card">
    <div v-if="title || $slots.action" class="panel-header">
      <h2 v-if="title" class="panel-title">{{ title }}</h2>
      <div v-if="$slots.action" class="panel-action">
        <slot name="action" />
      </div>
    </div>
    <div class="panel-body">
      <slot />
    </div>
  </section>
</template>

<style scoped lang="scss">
.panel-card {
  min-width: 0;
  max-width: 100%;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--card-foreground);
  padding: 1.25rem;
  overflow: hidden;

  @media (max-width: 640px) {
    padding: 1rem;
  }
}

.panel-body {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.panel-header {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.panel-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.panel-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>

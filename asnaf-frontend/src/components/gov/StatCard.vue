<script setup lang="ts">
import type { Component } from 'vue';
import { fa } from 'src/utils/fa';

export type Tone = 'primary' | 'success' | 'warning' | 'destructive' | 'accent';

const props = withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    icon: Component;
    tone?: Tone | undefined;
    hint?: string | undefined;
  }>(),
  {
    tone: 'primary',
  }
);
</script>

<template>
  <div class="stat-card shadow-card">
    <div class="stat-content">
      <div class="stat-info">
        <p class="stat-label">{{ label }}</p>
        <p class="stat-value">{{ typeof value === 'number' ? fa(value) : value }}</p>
        <p v-if="hint" class="stat-hint">{{ hint }}</p>
      </div>
      <div :class="['stat-icon-wrap', `tone-${tone}`]">
        <component :is="icon" class="stat-icon" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.stat-card {
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  background-color: var(--card);
  padding: 0.8rem 1.15rem;
}

.stat-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  margin-bottom: 0.2rem;
  font-weight: 500;
}

.stat-value {
  font-size: 1.625rem;
  font-weight: 800;
  line-height: 1.15;
}

.stat-hint {
  margin-top: 0.2rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.stat-icon-wrap {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border-radius: 0.65rem;
  flex-shrink: 0;
}

.stat-icon {
  width: 1.2rem;
  height: 1.2rem;
}

.tone-primary {
  background-color: oklch(from var(--primary) l c h / 10%);
  color: var(--primary);
}
.tone-success {
  background-color: oklch(from var(--success) l c h / 15%);
  color: var(--success);
}
.tone-warning {
  background-color: oklch(from var(--warning) l c h / 25%);
  color: var(--warning-foreground);
}
.tone-destructive {
  background-color: oklch(from var(--destructive) l c h / 12%);
  color: var(--destructive);
}
.tone-accent {
  background-color: var(--accent);
  color: var(--accent-foreground);
}
</style>

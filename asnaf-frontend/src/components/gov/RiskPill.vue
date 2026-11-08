<script setup lang="ts">
import type { RiskLevel } from 'src/types/asnaf';
import { riskLabels } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';

defineProps<{
  level: RiskLevel;
  score?: number;
}>();
</script>

<template>
  <span :class="['risk-pill', `risk-${level}`]">
    {{ riskLabels[level] }}
    <template v-if="score !== undefined"> · {{ fa(score) }}</template>
  </span>
</template>

<style scoped lang="scss">
.risk-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 0.125rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.risk-low {
  background-color: oklch(from var(--success) l c h / 15%);
  color: var(--success);
}
.risk-medium {
  background-color: var(--accent);
  color: var(--accent-foreground);
}
.risk-high {
  background-color: oklch(from var(--warning) l c h / 25%);
  color: var(--warning-foreground);
}
.risk-critical {
  background-color: oklch(from var(--destructive) l c h / 12%);
  color: var(--destructive);
}
</style>

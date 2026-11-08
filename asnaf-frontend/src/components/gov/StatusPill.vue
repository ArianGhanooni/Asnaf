<script setup lang="ts">
import type { CaseStatus } from 'src/types/asnaf';
import { statusLabels } from 'src/types/asnaf';

const props = defineProps<{
  status: CaseStatus;
}>();
</script>

<template>
  <span :class="['status-pill', `status-${status}`]">
    {{ statusLabels[status] }}
  </span>
</template>

<style scoped lang="scss">
.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 0.125rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid transparent;
}

.status-warning {
  background-color: var(--warning-bg);
  color: var(--warning-foreground);
  border-color: oklch(from var(--warning) l c h / 30%);
}
.status-readySeal {
  background-color: var(--destructive-bg);
  color: var(--destructive-foreground);
  border-color: oklch(from var(--destructive) l c h / 30%);
}
.status-sealed {
  background-color: oklch(from var(--primary) l c h / 15%);
  color: var(--primary);
  border-color: oklch(from var(--primary) l c h / 30%);
}
.status-unsealed {
  background-color: var(--destructive-bg);
  color: var(--destructive-foreground);
  border-color: oklch(from var(--destructive) l c h / 30%);
}
.status-collect {
  background-color: var(--accent);
  color: var(--accent-foreground);
  border-color: oklch(from var(--accent) l c h / 30%);
}
.status-licensed {
  background-color: var(--success-bg);
  color: var(--success-foreground);
  border-color: oklch(from var(--success) l c h / 30%);
}
</style>

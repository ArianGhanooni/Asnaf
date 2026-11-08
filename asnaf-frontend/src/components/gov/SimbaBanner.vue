<script setup lang="ts">
import { fa } from 'src/utils/fa';
import { ExternalLink } from 'lucide-vue-next';

defineProps<{
  code: string;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();
</script>

<template>
  <div
    class="simba-banner"
    role="button"
    tabindex="0"
    title="مشاهده چرخه کامل ۷ مرحله‌ای رسیدگی به شکایت"
    @click="emit('click')"
    @keydown.enter="emit('click')"
  >
    <div class="banner-title-wrap">
      <span>ارجاع از شکایات (سیمبا)</span>
      <ExternalLink class="icon-link" />
    </div>
    <span class="simba-code">{{ fa(code) }}</span>
  </div>
</template>

<style scoped lang="scss">
.simba-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: var(--radius-sm);
  background-color: var(--destructive);
  color: var(--destructive-foreground);
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.92;
  }
}

.banner-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.icon-link {
  width: 0.75rem;
  height: 0.75rem;
  opacity: 0.85;
}

.simba-code {
  font-family: monospace;
  letter-spacing: 0.05em;
  direction: ltr;
  background-color: rgba(0, 0, 0, 0.2);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm);
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Calendar, X, ChevronDown, Check } from 'lucide-vue-next';

export interface DateRange {
  from: string;
  to: string;
}

const props = withDefaults(
  defineProps<{
    modelValue?: DateRange;
    label?: string;
  }>(),
  {
    modelValue: () => ({ from: '', to: '' }),
    label: 'بازه زمانی',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: DateRange): void;
}>();

const isOpen = ref(false);
const localFrom = ref(props.modelValue.from);
const localTo = ref(props.modelValue.to);

const presets = [
  { label: 'همه', from: '', to: '' },
  { label: 'امروز', from: '۱۴۰۵/۰۸/۰۵', to: '۱۴۰۵/۰۸/۰۵' },
  { label: '۷ روز گذشته', from: '۱۴۰۵/۰۷/۲۸', to: '۱۴۰۵/۰۸/۰۵' },
  { label: 'ماه جاری (مهر/آبان)', from: '۱۴۰۵/۰۷/۰۱', to: '۱۴۰۵/۰۸/۰۵' },
];

const displayText = computed(() => {
  if (!props.modelValue.from && !props.modelValue.to) {
    return 'همه تاریخ‌ها';
  }
  if (props.modelValue.from && props.modelValue.to) {
    if (props.modelValue.from === props.modelValue.to) {
      return props.modelValue.from;
    }
    return `${props.modelValue.from} تا ${props.modelValue.to}`;
  }
  return props.modelValue.from || props.modelValue.to;
});

function applyPreset(p: { from: string; to: string }): void {
  localFrom.value = p.from;
  localTo.value = p.to;
  emit('update:modelValue', { from: p.from, to: p.to });
  isOpen.value = false;
}

function applyCustom(): void {
  emit('update:modelValue', { from: localFrom.value, to: localTo.value });
  isOpen.value = false;
}

function clear(): void {
  localFrom.value = '';
  localTo.value = '';
  emit('update:modelValue', { from: '', to: '' });
  isOpen.value = false;
}
</script>

<template>
  <div class="jalali-date-range-filter" data-testid="jalali-date-filter">
    <button
      type="button"
      class="filter-trigger-btn"
      :class="{ 'is-active': modelValue.from || modelValue.to }"
      @click="isOpen = !isOpen"
      data-testid="date-filter-trigger"
    >
      <Calendar class="icon-sm text-muted-foreground" />
      <span class="trigger-label">{{ displayText }}</span>
      <ChevronDown class="icon-xs chevron-icon" :class="{ 'rotate-180': isOpen }" />
      <button
        v-if="modelValue.from || modelValue.to"
        type="button"
        class="clear-inline-btn"
        title="حذف فیلتر تاریخ"
        @click.stop="clear"
      >
        <X class="icon-xs" />
      </button>
    </button>

    <div v-if="isOpen" class="dropdown-popover shadow-card" dir="rtl">
      <div class="popover-header">
        <span class="header-title">{{ label }} (تقویم شمسی)</span>
        <button type="button" class="close-popover-btn" @click="isOpen = false">
          <X class="icon-sm" />
        </button>
      </div>

      <div class="presets-row">
        <button
          v-for="p in presets"
          :key="p.label"
          type="button"
          :class="[
            'preset-chip',
            { 'is-selected': modelValue.from === p.from && modelValue.to === p.to },
          ]"
          @click="applyPreset(p)"
        >
          <span>{{ p.label }}</span>
        </button>
      </div>

      <div class="manual-inputs-grid">
        <div class="input-group">
          <label class="input-label">از تاریخ (شمسی):</label>
          <input
            v-model="localFrom"
            type="text"
            placeholder="مثال: ۱۴۰۵/۰۷/۰۱"
            class="jalali-input"
          />
        </div>
        <div class="input-group">
          <label class="input-label">تا تاریخ (شمسی):</label>
          <input
            v-model="localTo"
            type="text"
            placeholder="مثال: ۱۴۰۵/۰۸/۰۵"
            class="jalali-input"
          />
        </div>
      </div>

      <div class="popover-actions">
        <button type="button" class="btn-clear" @click="clear">
          حذف فیلتر
        </button>
        <button type="button" class="btn-apply" @click="applyCustom">
          <Check class="icon-xs" />
          <span>اعمال بازه</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.jalali-date-range-filter {
  position: relative;
  display: inline-block;
  font-family: var(--font-sans);
}

.filter-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.5rem;
  padding: 0 0.875rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    background-color: var(--muted);
    border-color: var(--ring);
  }

  &.is-active {
    border-color: var(--primary);
    background-color: oklch(from var(--primary) l c h / 6%);
    color: var(--primary);
  }
}

.trigger-label {
  font-weight: 600;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.icon-xs {
  width: 0.875rem;
  height: 0.875rem;
}

.chevron-icon {
  transition: transform 0.2s ease;
  color: var(--muted-foreground);

  &.rotate-180 {
    transform: rotate(180deg);
  }
}

.clear-inline-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--muted-foreground);
  margin-inline-start: 0.25rem;
  padding: 0.125rem;
  border-radius: 9999px;
  cursor: pointer;

  &:hover {
    color: var(--destructive);
    background-color: oklch(from var(--destructive) l c h / 10%);
  }
}

.dropdown-popover {
  position: absolute;
  top: calc(100% + 0.375rem);
  inset-inline-start: 0;
  z-index: 70;
  width: 20rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background-color: var(--popover);
  color: var(--popover-foreground);
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}

.header-title {
  font-size: 0.8125rem;
  font-weight: 700;
}

.close-popover-btn {
  background: none;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  padding: 0.125rem;

  &:hover {
    color: var(--foreground);
  }
}

.presets-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.preset-chip {
  background: var(--muted);
  border: 1px solid transparent;
  color: var(--foreground);
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--border);
    background-color: oklch(from var(--muted) l c h / 80%);
  }

  &.is-selected {
    background-color: var(--primary);
    color: var(--primary-foreground);
    font-weight: 600;
  }
}

.manual-inputs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.input-label {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.jalali-input {
  height: 2.25rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding: 0 0.5rem;
  font-size: 0.75rem;
  text-align: center;
  direction: ltr;
  outline: none;

  &:focus {
    border-color: var(--primary);
  }
}

.popover-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border);
  padding-top: 0.5rem;
  margin-top: 0.25rem;
}

.btn-clear {
  border: none;
  background: none;
  color: var(--muted-foreground);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;

  &:hover {
    color: var(--destructive);
  }
}

.btn-apply {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
}
</style>

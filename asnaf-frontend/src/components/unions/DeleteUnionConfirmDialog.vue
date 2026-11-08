<script setup lang="ts">
import type { UnionRegistryItem } from 'src/types/asnaf';
import { useUnionsStore } from 'src/stores/unions';
import { useQuasar } from 'quasar';
import { fa } from 'src/utils/fa';
import { AlertTriangle, Trash2, X } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: boolean;
  union: UnionRegistryItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirmed', unionId: number): void;
}>();

const $q = useQuasar();
const unionsStore = useUnionsStore();

function handleConfirmDelete(): void {
  if (!props.union) return;

  const unionName = props.union.name;
  const unionId = props.union.id;

  unionsStore.deleteUnion(unionId);

  $q.notify({
    type: 'negative',
    message: `اتحادیه «${unionName}» با موفقیت حذف گردید.`,
    position: 'top',
  });

  emit('confirmed', unionId);
  emit('update:modelValue', false);
}
</script>

<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    transition-show="scale"
    transition-hide="scale"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="delete-union-dialog" dir="rtl" data-testid="delete-union-confirm-dialog">
      <!-- Header -->
      <q-card-section class="dialog-header">
        <div class="header-content">
          <div class="warning-icon-wrap">
            <AlertTriangle class="warning-icon" />
          </div>
          <div>
            <h3 class="dialog-title">تایید حذف اتحادیه صنفی</h3>
          </div>
        </div>
        <button
          type="button"
          class="btn-close"
          @click="emit('update:modelValue', false)"
          aria-label="بستن"
        >
          <X class="icon-sm" />
        </button>
      </q-card-section>

      <q-separator />

      <!-- Body -->
      <q-card-section class="dialog-body" v-if="union">
        <p class="confirm-message">
          آیا از حذف کامل اتحادیه
          <strong class="highlight-union-name">«{{ union.name }}»</strong>
          از سامانه اتاق اصناف اطمینان دارید؟
        </p>

        <div class="union-summary-box">
          <div class="summary-row">
            <span class="label">رسته صنف:</span>
            <span class="value">{{ union.categoryLabel }}</span>
          </div>
          <div class="summary-row">
            <span class="label">رئیس اتحادیه:</span>
            <span class="value font-bold">{{ union.presidentName }}</span>
          </div>
          <div class="summary-row">
            <span class="label">تعداد کاربران فعال:</span>
            <span class="value">{{ fa(union.usersCount) }} نفر</span>
          </div>
          <div class="summary-row">
            <span class="label">واحدهای صنفی فعال:</span>
            <span class="value">{{ fa(union.activeMembersCount) }} واحد</span>
          </div>
        </div>

        <div class="alert-box-danger">
          <AlertTriangle class="icon-xs alert-icon" />
          <span>
            هشدار: این عملیات غیرقابل بازگشت است و دسترسی کاربران مرتبط با این اتحادیه نیز لغو خواهد شد.
          </span>
        </div>
      </q-card-section>

      <q-separator />

      <!-- Actions -->
      <q-card-actions class="dialog-footer">
        <button
          type="button"
          class="btn-cancel"
          @click="emit('update:modelValue', false)"
        >
          انصراف
        </button>
        <button
          type="button"
          class="btn-confirm-delete"
          @click="handleConfirmDelete"
          data-testid="btn-confirm-delete-union"
        >
          <Trash2 class="icon-sm" />
          <span>بله، حذف اتحادیه</span>
        </button>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.delete-union-dialog {
  width: 100%;
  max-width: 32rem;
  border-radius: var(--radius-xl, 1rem);
  background-color: var(--card);
  color: var(--card-foreground);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background-color: var(--muted);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.warning-icon-wrap {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  background-color: oklch(from var(--destructive) l c h / 14%);
  color: var(--destructive);
}

.warning-icon {
  width: 1.35rem;
  height: 1.35rem;
}

.dialog-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--foreground);
}

.btn-close {
  display: grid;
  place-items: center;
  background: none;
  border: none;
  padding: 0.35rem;
  border-radius: 0.375rem;
  color: var(--muted-foreground);
  cursor: pointer;

  &:hover {
    color: var(--foreground);
  }
}

.dialog-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.confirm-message {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--foreground);

  .highlight-union-name {
    color: var(--destructive);
    font-weight: 800;
  }
}

.union-summary-box {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem 1rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  background-color: var(--muted);
  border: 1px solid var(--border);
  font-size: 0.8125rem;

  .summary-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;

    .label {
      color: var(--muted-foreground);
    }
    .value {
      color: var(--foreground);
    }
  }
}

.alert-box-danger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-md);
  background-color: oklch(from var(--destructive) l c h / 8%);
  border: 1px solid oklch(from var(--destructive) l c h / 20%);
  color: var(--destructive);
  font-size: 0.75rem;
  line-height: 1.45;
  font-weight: 600;

  .alert-icon {
    flex-shrink: 0;
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  background-color: var(--muted);
}

.btn-cancel {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md, 0.375rem);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--foreground);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background-color: var(--muted);
  }
}

.btn-confirm-delete {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1.25rem;
  border-radius: var(--radius-md, 0.375rem);
  border: none;
  background-color: var(--destructive);
  color: white;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.9;
  }
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}
.icon-xs {
  width: 0.875rem;
  height: 0.875rem;
}
</style>


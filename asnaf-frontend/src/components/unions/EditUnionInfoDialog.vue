<script setup lang="ts">
import { ref, watch } from 'vue';
import type { UnionRegistryItem, UnionCategory } from 'src/types/asnaf';
import { useUnionsStore } from 'src/stores/unions';
import { useQuasar } from 'quasar';
import { Building2, X, Save } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: boolean;
  union: UnionRegistryItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved', updatedUnion: UnionRegistryItem): void;
}>();

const $q = useQuasar();
const unionsStore = useUnionsStore();

const form = ref<{
  name: string;
  category: UnionCategory;
  presidentName: string;
  phone: string;
  address: string;
}>({
  name: '',
  category: 'distributive',
  presidentName: '',
  phone: '',
  address: '',
});

watch(
  () => [props.union, props.modelValue],
  () => {
    if (props.union) {
      form.value = {
        name: props.union.name,
        category: props.union.category,
        presidentName: props.union.presidentName,
        phone: props.union.phone,
        address: props.union.address,
      };
    } else {
      form.value = {
        name: '',
        category: 'distributive',
        presidentName: '',
        phone: '',
        address: '',
      };
    }
  },
  { immediate: true }
);

function handleSave(): void {
  if (!form.value.name.trim() || !form.value.presidentName.trim() || !form.value.phone.trim()) {
    $q.notify({
      type: 'warning',
      message: 'لطفاً تمامی فیلدهای الزامی (نام، رئیس اتحادیه و شماره تماس) را پر نمایید.',
      position: 'top',
    });
    return;
  }

  if (props.union) {
    unionsStore.updateUnion(props.union.id, {
      name: form.value.name.trim(),
      category: form.value.category,
      presidentName: form.value.presidentName.trim(),
      phone: form.value.phone.trim(),
      address: form.value.address.trim(),
    });

    const updated = unionsStore.getUnionById(props.union.id);
    if (updated) {
      emit('saved', updated);
    }

    $q.notify({
      type: 'positive',
      message: 'اطلاعات اتحادیه با موفقیت به‌روزرسانی شد.',
      position: 'top',
    });
  } else {
    const created = unionsStore.addUnion({
      name: form.value.name.trim(),
      category: form.value.category,
      presidentName: form.value.presidentName.trim(),
      phone: form.value.phone.trim(),
      address: form.value.address.trim(),
    });

    emit('saved', created);

    $q.notify({
      type: 'positive',
      message: `اتحادیه «${created.name}» با موفقیت تعریف و ثبت شد.`,
      position: 'top',
    });
  }

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
    <q-card class="edit-union-card" dir="rtl" data-testid="edit-union-info-dialog">
      <!-- Header -->
      <q-card-section class="modal-header">
        <div class="header-content">
          <div class="header-icon-wrap">
            <Building2 class="header-icon" />
          </div>
          <div>
            <h3 class="header-title">{{ union ? 'ویرایش اطلاعات اتحادیه' : 'تعریف اتحادیه جدید' }}</h3>
          </div>
        </div>
        <button type="button" class="btn-close" @click="emit('update:modelValue', false)">
          <X class="icon-sm" />
        </button>
      </q-card-section>

      <q-separator />

      <!-- Form Body -->
      <q-card-section class="modal-body">
        <form @submit.prevent="handleSave" class="form-grid">
          <!-- نام اتحادیه -->
          <div class="form-group full-width">
            <label class="form-label" for="union-name-input">نام رسمی اتحادیه:</label>
            <input
              id="union-name-input"
              v-model="form.name"
              type="text"
              required
              class="form-input"
              data-testid="input-union-name"
            />
          </div>

          <!-- رسته / دسته‌بندی -->
          <div class="form-group">
            <label class="form-label" for="union-category-select">رسته اتحادیه:</label>
            <select
              id="union-category-select"
              v-model="form.category"
              class="form-select"
              data-testid="select-union-category"
            >
              <option value="distributive">توزیعی - خدماتی</option>
              <option value="productive">تولیدی - خدماتی</option>
            </select>
          </div>

          <!-- نام رئیس اتحادیه -->
          <div class="form-group">
            <label class="form-label" for="union-president-input">نام رئیس اتحادیه:</label>
            <input
              id="union-president-input"
              v-model="form.presidentName"
              type="text"
              required
              class="form-input"
              data-testid="input-union-president"
            />
          </div>

          <!-- شماره تماس -->
          <div class="form-group full-width">
            <label class="form-label" for="union-phone-input">شماره تماس دفتر اتحادیه:</label>
            <input
              id="union-phone-input"
              v-model="form.phone"
              type="text"
              required
              class="form-input ltr-input"
              data-testid="input-union-phone"
            />
          </div>

          <!-- نشانی دفتر مرکزی -->
          <div class="form-group full-width">
            <label class="form-label" for="union-address-input">نشانی کامل دفتر مرکزی:</label>
            <textarea
              id="union-address-input"
              v-model="form.address"
              rows="3"
              class="form-textarea"
              data-testid="textarea-union-address"
            ></textarea>
          </div>
        </form>
      </q-card-section>

      <q-separator />

      <!-- Footer Actions -->
      <q-card-actions class="modal-footer">
        <button type="button" class="btn-cancel" @click="emit('update:modelValue', false)">
          انصراف
        </button>
        <button type="button" class="btn-save" @click="handleSave" data-testid="btn-save-union-info">
          <Save class="icon-sm" />
          <span>{{ union ? 'ذخیره تغییرات اتحادیه' : 'ثبت و ایجاد اتحادیه' }}</span>
        </button>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.edit-union-card {
  width: 100%;
  max-width: 36rem;
  max-height: 90vh;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-xl, 1rem);
  background-color: var(--card);
  color: var(--card-foreground);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  overflow: hidden;
}

.modal-header {
  flex-shrink: 0;
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

.header-icon-wrap {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  background-color: oklch(from var(--primary) l c h / 12%);
  color: var(--primary);
}

.header-icon {
  width: 1.35rem;
  height: 1.35rem;
}

.header-title {
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

.modal-body {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.875rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  &.full-width {
    grid-column: 1 / -1;
  }
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--foreground);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: var(--radius-md, 0.375rem);
  border: 1px solid var(--border);
  background-color: var(--background);
  color: var(--foreground);
  font-family: inherit;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px oklch(from var(--primary) l c h / 20%);
  }

  &.ltr-input {
    direction: ltr;
    text-align: left;
    font-family: 'Vazirmatn', inherit, sans-serif;
  }
}

.form-textarea {
  resize: vertical;
  min-height: 4.5rem;
  line-height: 1.45;
}

.modal-footer {
  flex-shrink: 0;
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

.btn-save {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1.25rem;
  border-radius: var(--radius-md, 0.375rem);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}
</style>


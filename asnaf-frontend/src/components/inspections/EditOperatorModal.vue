<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Unit, OperatorFiveFields } from 'src/types/asnaf';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import { useQuasar } from 'quasar';
import { fa } from 'src/utils/fa';
import { UserCheck, Save, X } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: boolean;
  unit: Unit | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved', unit: Unit): void;
}>();

const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

// ۵ قلم داده مجاز مطابق بخش ۶.ج و ۵ سند مرجع
const form = ref<OperatorFiveFields>({
  firstName: '',
  lastName: '',
  nationalId: '',
  birthDate: '',
  mobile: '',
});

const isSubmitting = ref(false);

watch(
  () => props.unit,
  (u) => {
    if (u) {
      // تجزیه نام و نام خانوادگی متصدی
      const parts = u.operator.trim().split(' ');
      const fName = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] ?? '';
      const lName = parts.length > 1 ? parts[parts.length - 1] ?? '' : '';

      form.value = {
        firstName: fName,
        lastName: lName,
        nationalId: u.nationalId || '',
        birthDate: u.birthDate || '۱۳۶۵/۰۴/۱۵',
        mobile: u.mobile || '',
      };
    }
  },
  { immediate: true }
);

// اعتبارسنجی کد ملی ایران
function isValidNationalId(val: string): boolean | string {
  if (!val) return 'کد ملی الزامی است';
  if (!/^\d{10}$/.test(val)) return 'کد ملی باید دقیقاً ۱۰ رقم عددی باشد';
  return true;
}

// اعتبارسنجی شماره همراه
function isValidMobile(val: string): boolean | string {
  if (!val) return 'شماره همراه الزامی است';
  if (!/^09\d{9}$/.test(val)) return 'شماره همراه باید ۱۱ رقم و با ۰۹ آغاز شود';
  return true;
}

const hasChanged = computed(() => {
  if (!props.unit) return false;
  const currentFull = `${form.value.firstName.trim()} ${form.value.lastName.trim()}`.trim();
  return (
    currentFull !== props.unit.operator ||
    form.value.nationalId !== props.unit.nationalId ||
    form.value.mobile !== props.unit.mobile ||
    form.value.birthDate !== (props.unit.birthDate || '۱۳۶۵/۰۴/۱۵')
  );
});

function handleSave(): void {
  if (!props.unit) return;

  const validNational = isValidNationalId(form.value.nationalId);
  const validMobile = isValidMobile(form.value.mobile);

  if (validNational !== true) {
    $q.notify({ type: 'warning', message: String(validNational), position: 'top' });
    return;
  }

  if (validMobile !== true) {
    $q.notify({ type: 'warning', message: String(validMobile), position: 'top' });
    return;
  }

  isSubmitting.value = true;
  try {
    const user = sessionStore.session?.name ?? 'کارشناس بازرسی اماکن';
    const auditResult = unitsStore.editOperatorWithAudit(props.unit.id, form.value, user);

    $q.notify({
      type: 'positive',
      message: 'مشخصات متصدی با موفقیت به‌روزرسانی شد.',
      caption: auditResult.diffText.replace(/\n/g, ' · '),
      position: 'top',
    });

    emit('saved', props.unit);
    emit('update:modelValue', false);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'خطا در ثبت تغییرات';
    $q.notify({ type: 'negative', message: errorMsg, position: 'top' });
  } finally {
    isSubmitting.value = false;
  }
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
    <q-card class="edit-operator-card" dir="rtl" data-testid="edit-operator-modal">
      <!-- Modal Header -->
      <q-card-section class="modal-header">
        <div class="header-content">
          <div class="header-icon-wrap">
            <UserCheck class="header-icon" />
          </div>
          <div>
            <h3 class="header-title">ویرایش مشخصات متصدی</h3>
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

      <!-- Modal Body -->
      <q-card-section class="modal-body">
        <!-- مشخصات قفل واحد صنفی -->
        <div v-if="unit" class="locked-info-box">
          <div class="locked-item">
            <span class="locked-label">نام تابلو:</span>
            <span class="locked-val">{{ unit.name }}</span>
          </div>
          <div class="locked-item">
            <span class="locked-label">اتحادیه:</span>
            <span class="locked-val">{{ unit.union }}</span>
          </div>
          <div class="locked-item">
            <span class="locked-label">نشانی:</span>
            <span class="locked-val">{{ unit.address }}</span>
          </div>
        </div>

        <form @submit.prevent="handleSave" class="fields-grid">
          <!-- ۱. نام -->
          <div class="form-group">
            <label class="form-label" for="op-fname">۱. نام متصدی:</label>
            <input
              id="op-fname"
              v-model="form.firstName"
              type="text"
              required
              class="form-input"
              data-testid="input-operator-firstname"
            />
          </div>

          <!-- ۲. نام خانوادگی -->
          <div class="form-group">
            <label class="form-label" for="op-lname">۲. نام خانوادگی:</label>
            <input
              id="op-lname"
              v-model="form.lastName"
              type="text"
              required
              class="form-input"
              data-testid="input-operator-lastname"
            />
          </div>

          <!-- ۳. کد ملی -->
          <div class="form-group">
            <label class="form-label" for="op-national">۳. کد ملی (۱۰ رقم):</label>
            <input
              id="op-national"
              v-model="form.nationalId"
              type="text"
              maxlength="10"
              required
              class="form-input ltr-input"
              data-testid="input-operator-nationalid"
            />
          </div>

          <!-- ۴. تاریخ تولد -->
          <div class="form-group">
            <label class="form-label" for="op-bdate">۴. تاریخ تولد (شمسی):</label>
            <input
              id="op-bdate"
              v-model="form.birthDate"
              type="text"
              class="form-input ltr-input"
              data-testid="input-operator-birthdate"
            />
          </div>

          <!-- ۵. شماره تلفن همراه -->
          <div class="form-group full-width">
            <label class="form-label" for="op-mobile">۵. شماره تلفن همراه (پیامک به این شماره ارسال خواهد شد):</label>
            <input
              id="op-mobile"
              v-model="form.mobile"
              type="tel"
              maxlength="11"
              required
              class="form-input ltr-input"
              data-testid="input-operator-mobile"
            />
          </div>
        </form>
      </q-card-section>

      <q-separator />

      <!-- Modal Footer -->
      <q-card-actions class="modal-footer">
        <div class="footer-actions">
          <button
            type="button"
            class="btn-cancel"
            @click="emit('update:modelValue', false)"
          >
            انصراف
          </button>
          <button
            type="button"
            class="btn-save"
            :disabled="isSubmitting || !hasChanged"
            @click="handleSave"
            data-testid="btn-save-operator-mutation"
          >
            <Save class="icon-sm" />
            <span>{{ isSubmitting ? 'در حال ثبت...' : 'ذخیره تغییرات' }}</span>
          </button>
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.edit-operator-card {
  width: 100%;
  max-width: 36rem;
  border-radius: var(--radius-xl, 1rem);
  background-color: var(--card);
  color: var(--card-foreground);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  overflow: hidden;
}

.modal-header {
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
  transition: all 0.15s ease;

  &:hover {
    background-color: oklch(from var(--foreground) l c h / 10%);
    color: var(--foreground);
  }
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
}

.fields-grid {
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

.form-input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: var(--radius-md, 0.375rem);
  border: 1px solid var(--border);
  background-color: var(--background);
  color: var(--foreground);
  font-family: inherit;
  font-size: 0.875rem;
  transition: all 0.15s ease;

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

.locked-info-box {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background-color: var(--muted);
  padding: 0.75rem;
  border-radius: var(--radius-md, 0.375rem);
  border: 1px dashed var(--border);
}

.locked-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;

  .locked-label {
    color: var(--muted-foreground);
  }
  .locked-val {
    font-weight: 600;
    color: var(--foreground);
  }
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 1rem 1.25rem;
  background-color: var(--muted);
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  transition: all 0.15s ease;

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
  background-color: #16a34a; /* دکمه سبز مطابق سند */
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}
</style>

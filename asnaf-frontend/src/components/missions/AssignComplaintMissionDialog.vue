<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import { getInspectorsByUnion } from 'src/utils/data';
import type { Complaint, InspectorInfo, Mission } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import {
  X,
  Send,
  Building2,
  Clock,
  ShieldAlert,
  UserCheck,
  AlertTriangle,
  FileText,
  BadgeAlert,
} from 'lucide-vue-next';

interface Props {
  readonly modelValue: boolean;
  readonly initialComplaintId?: number | null | undefined;
}

const props = withDefaults(defineProps<Props>(), {
  initialComplaintId: null,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'assigned', mission: Mission): void;
}>();

const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

// نقش کاربر
const isUnionUser = computed(() => sessionStore.session?.role === 'union');
const currentUnionOrg = computed(() => sessionStore.session?.org ?? '');

// لیست شکایات در دسترس بر اساس نقش
const availableComplaints = computed<Complaint[]>(() => {
  return unitsStore.complaints.filter((c) => {
    if (c.stage === 'resolved' || c.stage === 'closed') return false;
    if (isUnionUser.value) {
      return (
        c.unionName.includes(currentUnionOrg.value) ||
        currentUnionOrg.value.includes(c.unionName)
      );
    }
    return true;
  });
});

const selectedComplaintId = ref<number | null>(null);
const selectedInspector = ref<string>('');
const selectedPriority = ref<'urgent' | 'high' | 'normal'>('urgent');
const missionTime = ref<string>('09:30');
const missionNotes = ref<string>('');
const isSubmitting = ref<boolean>(false);

// همگام‌سازی انتخاب اولیه
watch(
  [() => props.modelValue, () => props.initialComplaintId] as const,
  ([isOpen, initId]) => {
    if (isOpen) {
      if (typeof initId === 'number' && availableComplaints.value.some((c) => c.id === initId)) {
        selectedComplaintId.value = initId;
      } else if (availableComplaints.value.length > 0) {
        selectedComplaintId.value = availableComplaints.value[0]?.id ?? null;
      }
    }
  },
  { immediate: true }
);

// شکایت انتخاب‌شده فعلی
const selectedComplaint = computed<Complaint | null>(() => {
  if (!selectedComplaintId.value) return null;
  return availableComplaints.value.find((c) => c.id === selectedComplaintId.value) ?? null;
});

// بازرسان مجاز مطابق صنف و اتحادیه شکایت
const eligibleInspectors = computed<InspectorInfo[]>(() => {
  if (!selectedComplaint.value) return [];
  return getInspectorsByUnion(selectedComplaint.value.unionName);
});

// تنظیم پیش‌فرض بازرس با تغییر شکایت
watch(
  eligibleInspectors,
  (list) => {
    if (list.length > 0) {
      selectedInspector.value = list[0]?.name ?? '';
    } else {
      selectedInspector.value = '';
    }
  },
  { immediate: true }
);

function close(): void {
  emit('update:modelValue', false);
}

function submit(): void {
  if (!selectedComplaint.value) {
    $q.notify({ type: 'warning', message: 'لطفاً شکایت مورد نظر را انتخاب کنید.', position: 'top' });
    return;
  }

  if (!selectedInspector.value) {
    $q.notify({
      type: 'negative',
      message: 'انتخاب بازرس هم‌صنف اتحادیه الزامی است.',
      position: 'top',
    });
    return;
  }

  isSubmitting.value = true;
  try {
    const user = sessionStore.session?.name ?? 'مدیریت نظارت اصناف';
    const mission = unitsStore.assignComplaintMission(
      {
        complaintId: selectedComplaint.value.id,
        inspector: selectedInspector.value,
        priority: selectedPriority.value,
        time: missionTime.value,
        notes: missionNotes.value || selectedComplaint.value.violationSubject,
      },
      user
    );

    $q.notify({
      type: 'positive',
      message: `مأموریت رسیدگی به شکایت (کد سیمبا ${selectedComplaint.value.trackingCode}) به ${selectedInspector.value} تخصیص یافت.`,
      position: 'top',
    });

    emit('assigned', mission);
    close();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در ثبت ماموریت';
    $q.notify({ type: 'negative', message: msg, position: 'top' });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="emit('update:modelValue', $event)">
    <div class="assign-dialog-card shadow-card" dir="rtl" data-testid="assign-complaint-dialog">
      <!-- هدر دیالوگ -->
      <div class="dialog-header">
        <div class="header-title-wrap">
          <div class="header-icon-box tone-simba">
            <ShieldAlert class="icon-md" />
          </div>
          <div>
            <h3 class="header-title">تخصیص ماموریت رسیدگی به شکایت مردمی</h3>
            <p class="header-subtitle">ارجاع سیستمی از درگاه شکایات سیمبا به بازرسان تخصصی اتحادیه مربوطه</p>
          </div>
        </div>

        <button type="button" class="close-btn" @click="close" aria-label="بستن" data-testid="close-assign-dialog-btn">
          <X class="icon-sm" />
        </button>
      </div>

      <!-- بدنه فرم -->
      <form class="dialog-form" @submit.prevent="submit">
        <!-- ۱. انتخاب شکایت سیمبا -->
        <div class="form-group">
          <label class="form-label required">
            <FileText class="icon-xs" />
            <span>پرونده شکایت سیمبا (کد رهگیری):</span>
          </label>
          <select
            v-model="selectedComplaintId"
            class="form-select"
            required
            data-testid="complaint-select"
          >
            <option :value="null" disabled>انتخاب شکایت مردمی...</option>
            <option
              v-for="c in availableComplaints"
              :key="c.id"
              :value="c.id"
            >
              کد پیگیری {{ c.trackingCode }} · {{ c.unitName }} ({{ c.unionName }})
            </option>
          </select>
        </div>

        <!-- کارت پیش‌نمایش مشخصات پرونده انتخاب‌شده -->
        <div v-if="selectedComplaint" class="complaint-preview-box">
          <div class="preview-row">
            <span class="preview-label">کد پیگیری سیمبا:</span>
            <strong class="simba-code-badge">{{ selectedComplaint.trackingCode }}</strong>
            <span class="preview-label mr-auto">تاریخ ثبت:</span>
            <span>{{ selectedComplaint.registrationDate }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">واحد صنفی هدف:</span>
            <strong>{{ selectedComplaint.unitName }}</strong>
            <span class="preview-label">متصدی:</span>
            <span>{{ selectedComplaint.operatorName }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">اتحادیه صنف:</span>
            <span class="union-badge">{{ selectedComplaint.unionName }}</span>
            <span class="preview-label">موقعیت:</span>
            <span>{{ selectedComplaint.address }}</span>
          </div>
          <div class="preview-row violation-row">
            <span class="preview-label">موضوع تخلف:</span>
            <span class="violation-text">{{ selectedComplaint.violationSubject }}</span>
          </div>
        </div>

        <!-- ۲. قانون تطابق اتحادیه: انتخاب بازرس هم‌صنف -->
        <div class="form-group">
          <div class="label-with-rule">
            <label class="form-label required">
              <UserCheck class="icon-xs" />
              <span>بازرس مأمور (الزاماً عضو {{ selectedComplaint?.unionName || 'اتحادیه مربوطه' }}):</span>
            </label>
            <span class="rule-hint-pill">قانون تطابق صنف</span>
          </div>

          <select
            v-if="eligibleInspectors.length > 0"
            v-model="selectedInspector"
            class="form-select inspector-select"
            required
            data-testid="inspector-select"
          >
            <option value="" disabled>انتخاب بازرس هم‌صنف...</option>
            <option
              v-for="ins in eligibleInspectors"
              :key="ins.id"
              :value="ins.name"
            >
              {{ ins.name }} · {{ ins.union }} ({{ ins.region }})
            </option>
          </select>

          <!-- پیام هشدار در صورت نبود بازرس در این اتحادیه -->
          <div v-else class="no-inspector-warning">
            <AlertTriangle class="icon-sm" />
            <span>هیچ بازرسی برای {{ selectedComplaint?.unionName || 'این اتحادیه' }} تعریف نشده است.</span>
          </div>
        </div>

        <!-- ۳. اولویت و ساعت اعزام -->
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label required">
              <BadgeAlert class="icon-xs" />
              <span>اولویت رسیدگی:</span>
            </label>
            <select
              v-model="selectedPriority"
              class="form-select"
              data-testid="priority-select"
            >
              <option value="urgent">فوری و آنی (رسیدگی زیر ۲ ساعت)</option>
              <option value="high">دارای اولویت (همان روز)</option>
              <option value="normal">عادی و نوبتی</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label required">
              <Clock class="icon-xs" />
              <span>ساعت اعزام / مهلت حضور:</span>
            </label>
            <input
              v-model="missionTime"
              type="text"
              placeholder="مثال: ۰۹:۳۰"
              class="form-input"
              required
              data-testid="time-input"
            />
          </div>
        </div>

        <!-- ۴. دستور کار و توضیحات تکمیلی -->
        <div class="form-group">
          <label class="form-label">
            <span>دستور کار اختصاصی بازرس:</span>
          </label>
          <textarea
            v-model="missionNotes"
            rows="3"
            placeholder="بررسی ادعای شاکی، تطبیق نرخ‌نامه، کنترل ترازو یا پروانه و تنظیم گزارش..."
            class="form-textarea"
            data-testid="notes-input"
          />
        </div>

        <!-- دکمه‌های اکشن -->
        <div class="dialog-actions">
          <button
            type="button"
            class="btn-secondary"
            @click="close"
            :disabled="isSubmitting"
            data-testid="cancel-assign-btn"
          >
            انصراف
          </button>
          <button
            type="submit"
            class="btn-primary"
            :disabled="isSubmitting || eligibleInspectors.length === 0"
            data-testid="submit-assign-complaint-btn"
          >
            <Send class="icon-xs" />
            <span>{{ isSubmitting ? 'در حال تخصیص...' : 'تخصیص ماموریت و ارسال به اپلیکیشن میدانی' }}</span>
          </button>
        </div>
      </form>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.assign-dialog-card {
  width: 100%;
  max-width: 620px;
  background-color: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  padding-bottom: 1rem;
}

.header-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon-box {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.tone-simba {
    background-color: oklch(from var(--primary) l c h / 12%);
    color: var(--primary);
  }
}

.header-title {
  font-size: 1.0625rem;
  font-weight: 700;
  margin: 0;
  color: var(--foreground);
}

.header-subtitle {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0.2rem 0 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  padding: 0.35rem;
  border-radius: var(--radius-md);
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--foreground);

  &.required::after {
    content: '*';
    color: var(--destructive);
    margin-inline-start: 0.2rem;
  }
}

.label-with-rule {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.rule-hint-pill {
  font-size: 0.625rem;
  font-weight: 700;
  color: #0284c7;
  background-color: rgba(2, 132, 199, 0.12);
  border: 1px solid rgba(2, 132, 199, 0.25);
  padding: 0.05rem 0.4rem;
  border-radius: 9999px;
}

.form-select,
.form-input {
  width: 100%;
  height: 2.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding-inline: 0.75rem;
  font-size: 0.8125rem;
  outline: none;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: var(--primary);
  }
}

.form-textarea {
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  font-family: inherit;
  outline: none;
  resize: vertical;
  line-height: 1.5;

  &:focus {
    border-color: var(--primary);
  }
}

.complaint-preview-box {
  background-color: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.75rem;
}

.preview-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;

  &.violation-row {
    align-items: flex-start;
  }
}

.preview-label {
  color: var(--muted-foreground);
  font-size: 0.6875rem;
}

.simba-code-badge {
  font-family: monospace;
  font-weight: 700;
  color: var(--primary);
  background-color: oklch(from var(--primary) l c h / 12%);
  border: 1px solid oklch(from var(--primary) l c h / 25%);
  padding: 0.05rem 0.4rem;
  border-radius: var(--radius-sm);
}

.union-badge {
  font-weight: 600;
  background-color: var(--card);
  color: var(--foreground);
  border: 1px solid var(--border);
  padding: 0.05rem 0.4rem;
  border-radius: var(--radius-sm);
}

.violation-text {
  color: var(--foreground);
  font-weight: 500;
  line-height: 1.4;
}

.mr-auto {
  margin-inline-start: auto;
}

.no-inspector-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: oklch(from var(--warning) l c h / 15%);
  color: var(--warning-foreground);
  border: 1px solid oklch(from var(--warning) l c h / 30%);
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 600;
}

.dialog-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}

.btn-secondary {
  height: 2.375rem;
  padding-inline: 1.125rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--muted);
  color: var(--foreground);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--card);
  }
}

.btn-primary {
  height: 2.375rem;
  padding-inline: 1.25rem;
  border-radius: var(--radius-md);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: opacity 0.15s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.icon-xs {
  width: 0.875rem;
  height: 0.875rem;
}
.icon-sm {
  width: 1.125rem;
  height: 1.125rem;
}
.icon-md {
  width: 1.375rem;
  height: 1.375rem;
}
</style>

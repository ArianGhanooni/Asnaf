<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import type { Complaint } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import { CheckCircle2, Send, X, ExternalLink, MessageSquare } from 'lucide-vue-next';

interface Props {
  readonly modelValue: boolean;
  readonly complaint: Complaint | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'finalized'): void;
}>();

const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

const outcomesList = [
  'صدور اخطار قانونی و اخذ تعهد کتبی متصدی',
  'صدور برگ جریمه تعزیراتی و الزام به استرداد اضافه دریافتی به شاکی',
  'اجرای حکم پلمب اماکن و معرفی به مراجع قضایی',
  'رفع کامل تخلف، اصلاح نرخ و اعلام رضایت قطعی شاکی',
  'رد شکایت به علت عدم احراز تخلف در بازرسی میدانی',
];

const selectedOutcome = ref(outcomesList[0]);
const additionalNotes = ref('');
const syncSimba = ref(true);

function submit(): void {
  if (!props.complaint) return;
  if (!selectedOutcome.value) {
    $q.notify({ type: 'negative', message: 'انتخاب نتیجه نهایی الزامی است', position: 'top' });
    return;
  }

  const currentUser = sessionStore.session?.name ?? 'مدیریت نظارت اصناف';
  unitsStore.finalizeComplaint(
    props.complaint.id,
    {
      outcome: selectedOutcome.value,
      notes: additionalNotes.value.trim(),
    },
    currentUser
  );

  $q.notify({
    type: 'positive',
    message: 'خروجی نهایی پرونده ثبت و چرخه رسیدگی با موفقیت پایان یافت.',
    caption: 'بازخورد به سامانه سیمبا منعکس شد و پیامک برای شاکی و متصدی ارسال گردید.',
    position: 'top',
  });

  emit('finalized');
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
    <div v-if="complaint" class="finalize-dialog-card" dir="rtl" data-testid="finalize-complaint-dialog">
      <div class="dialog-header">
        <div>
          <div class="step-badge">مرحله ۷ · نتیجه نهایی و اطلاع‌رسانی</div>
          <h3 class="dialog-title">ثبت خروجی پرونده و بازخورد به سامانه شکایات (سیمبا)</h3>
          <p class="dialog-sub">شکایت شماره {{ fa(complaint.trackingCode) }} · شاکی: {{ complaint.complainantName }}</p>
        </div>
        <button
          type="button"
          class="close-btn"
          @click="emit('update:modelValue', false)"
          data-testid="close-finalize-dialog-btn"
          aria-label="بستن"
        >
          <X class="icon-sm" />
        </button>
      </div>

      <div class="summary-meta-box">
        <p class="meta-line"><b>واحد صنفی:</b> {{ complaint.unitName }} ({{ complaint.unionName }})</p>
        <p class="meta-line"><b>تخلف بررسی‌شده:</b> {{ complaint.violationSubject }}</p>
      </div>

      <form class="dialog-form" @submit.prevent="submit">
        <div class="field-item">
          <label class="field-label">تعیین خروجی و رأی نهایی پرونده *</label>
          <div class="outcomes-options-list">
            <label
              v-for="out in outcomesList"
              :key="out"
              :class="['outcome-option-row', { 'is-selected': selectedOutcome === out }]"
            >
              <input
                v-model="selectedOutcome"
                type="radio"
                :value="out"
                class="outcome-radio"
              />
              <span class="outcome-text">{{ out }}</span>
            </label>
          </div>
        </div>

        <div class="field-item">
          <label class="field-label">توضیحات و مستندات تکمیلی رأی</label>
          <textarea
            v-model="additionalNotes"
            rows="2"
            placeholder="شرح جزئیات جریمه، شماره فیش تعزیرات، یا تاریخ اجرای حکم..."
            class="form-textarea"
          />
        </div>

        <!-- Simba Sync toggle -->
        <div class="sync-simba-row">
          <input
            v-model="syncSimba"
            type="checkbox"
            id="sync-simba-chk"
            class="chk-input"
          />
          <label for="sync-simba-chk" class="chk-label">
            <ExternalLink class="icon-xs text-primary" />
            <span>ارسال خودکار وب‌سرویس بازخورد وضعیت نهایی به سامانه مرجع شکایات (سیمبا)</span>
          </label>
        </div>

        <!-- SMS Notice Preview -->
        <div class="sms-preview-card">
          <div class="sms-preview-header">
            <MessageSquare class="icon-xs text-success" />
            <span>پیامک‌های خودکار پایان رسیدگی</span>
          </div>
          <p class="sms-preview-text">
            <b>پیامک به شاکی ({{ complaint.complainantMobile }}):</b> شاکی گرامی، رسیدگی به پرونده {{ complaint.trackingCode }} با نتیجه «{{ selectedOutcome }}» پایان یافت.
          </p>
          <p class="sms-preview-text">
            <b>پیامک به متصدی ({{ complaint.operatorMobile }}):</b> متصدی محترم {{ complaint.unitName }}، پرونده شکایت با نتیجه «{{ selectedOutcome }}» تعیین تکلیف گردید.
          </p>
        </div>

        <div class="dialog-footer">
          <button type="submit" class="submit-btn" data-testid="confirm-finalize-btn">
            <CheckCircle2 class="icon-xs" />
            <span>ثبت خروجی نهایی، ارسال پیامک و اعلام به سیمبا</span>
          </button>
          <button
            type="button"
            class="cancel-btn"
            @click="emit('update:modelValue', false)"
          >
            انصراف
          </button>
        </div>
      </form>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.finalize-dialog-card {
  width: 100%;
  max-width: 40rem;
  background-color: var(--card);
  color: var(--foreground);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.25rem 1.5rem;
  background-color: var(--muted);
  border-bottom: 1px solid var(--border);
}

.step-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #059669;
  background-color: rgba(16, 185, 129, 0.12);
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  display: inline-block;
  margin-bottom: 0.25rem;
}

.dialog-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}

.dialog-sub {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0.25rem 0 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
}

.summary-meta-box {
  margin: 1.25rem 1.5rem 0;
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-line {
  font-size: 0.8125rem;
  margin: 0;
}

.dialog-form {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--foreground);
}

.outcomes-options-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.outcome-option-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.625rem 0.75rem;
  cursor: pointer;
  background-color: var(--card);
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--primary);
  }

  &.is-selected {
    border-color: var(--primary);
    background-color: oklch(from var(--primary) l c h / 8%);
  }
}

.outcome-radio {
  margin: 0;
}

.outcome-text {
  font-size: 0.8125rem;
  font-weight: 500;
}

.form-textarea {
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--background);
  color: var(--foreground);
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  outline: none;
  resize: vertical;
}

.sync-simba-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: oklch(from var(--primary) l c h / 10%);
  border: 1px solid oklch(from var(--primary) l c h / 20%);
  border-radius: var(--radius-md);
  padding: 0.75rem;
}

.chk-input {
  width: 1.125rem;
  height: 1.125rem;
}

.chk-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.sms-preview-card {
  background-color: var(--background);
  border: 1px dashed var(--border);
  border-radius: var(--radius-lg);
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.sms-preview-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--foreground);
}

.sms-preview-text {
  font-size: 0.6875rem;
  line-height: 1.6;
  margin: 0;
  color: var(--muted-foreground);
}

.dialog-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.5rem;
}

.submit-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  height: 2.75rem;
  border-radius: var(--radius-md);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
}

.cancel-btn {
  height: 2.75rem;
  padding: 0 1.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: none;
  color: var(--foreground);
  cursor: pointer;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.icon-xs {
  width: 0.875rem;
  height: 0.875rem;
}

.text-primary {
  color: var(--primary);
}

.text-success {
  color: var(--success);
}
</style>

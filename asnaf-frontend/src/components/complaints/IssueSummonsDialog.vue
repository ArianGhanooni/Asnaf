<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import type { Complaint } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import { FileText, Send, X, AlertTriangle, Calendar, Building2 } from 'lucide-vue-next';

interface Props {
  readonly modelValue: boolean;
  readonly complaint: Complaint | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'issued'): void;
}>();

const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

const randomNum = Math.floor(100 + Math.random() * 900);
const summonsNo = ref(`د/۱۴۰۵/${randomNum}`);
const summonsDate = ref('۱۴۰۵/۰۸/۰۵');
const hearingDate = ref('۱۴۰۵/۰۸/۱۲ ساعت ۱۰:۰۰');
const chamber = ref('کمیسیون بدوی رسیدگی به تخلفات صنفی - شعبه ۱');

function submit(): void {
  if (!props.complaint) return;
  if (!summonsNo.value.trim()) {
    $q.notify({ type: 'negative', message: 'شماره دعوتنامه الزامی است', position: 'top' });
    return;
  }
  if (!hearingDate.value.trim()) {
    $q.notify({ type: 'negative', message: 'تاریخ و ساعت جلسه الزامی است', position: 'top' });
    return;
  }

  const currentUser = sessionStore.session?.name ?? 'دبیرخانه کمیسیون تخلفات';
  unitsStore.issueComplaintSummons(
    props.complaint.id,
    {
      summonsNo: summonsNo.value.trim(),
      summonsDate: summonsDate.value.trim(),
      hearingDate: hearingDate.value.trim(),
      chamber: chamber.value.trim(),
    },
    currentUser
  );

  $q.notify({
    type: 'positive',
    message: `دعوتنامه شماره ${summonsNo.value} صادر شد.`,
    caption: 'پیامک احضار رسمی به شماره متصدی ارسال گردید.',
    position: 'top',
  });

  emit('issued');
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
    <div v-if="complaint" class="summons-dialog-card" dir="rtl" data-testid="issue-summons-dialog">
      <div class="dialog-header">
        <div>
          <div class="step-badge">مرحله ۵ · رسیدگی به تخلفات</div>
          <h3 class="dialog-title">صدور دعوتنامه رسمی حضور در مرجع رسیدگی</h3>
          <p class="dialog-sub">پرونده شکایت شماره {{ fa(complaint.trackingCode) }} · {{ complaint.unitName }}</p>
        </div>
        <button
          type="button"
          class="close-btn"
          @click="emit('update:modelValue', false)"
          data-testid="close-summons-dialog-btn"
          aria-label="بستن"
        >
          <X class="icon-sm" />
        </button>
      </div>

      <div class="notice-callout">
        <AlertTriangle class="icon-sm text-warning" />
        <span>
          در این مرحله جهت بررسی اسناد، فاکتورها یا استماع دفاعیات متصدی، دعوتنامه رسمی صادر شده و پرونده به بخش <b>«رسیدگی به تخلفات»</b> منتقل می‌گردد.
        </span>
      </div>

      <form class="dialog-form" @submit.prevent="submit">
        <div class="grid-2">
          <div class="field-item">
            <label class="field-label">شماره اندیکاتور دعوتنامه *</label>
            <input
              v-model="summonsNo"
              type="text"
              class="form-input"
              data-testid="summons-no-input"
            />
          </div>
          <div class="field-item">
            <label class="field-label">تاریخ صدور *</label>
            <input
              v-model="summonsDate"
              type="text"
              class="form-input"
              data-testid="summons-date-input"
            />
          </div>
        </div>

        <div class="field-item">
          <label class="field-label">تاریخ و ساعت جلسه رسیدگی *</label>
          <input
            v-model="hearingDate"
            type="text"
            placeholder="مثلاً ۱۴۰۵/۰۸/۱۲ ساعت ۱۰:۰۰"
            class="form-input"
            data-testid="hearing-date-input"
          />
        </div>

        <div class="field-item">
          <label class="field-label">مرجع و محل برگزاری جلسه رسیدگی *</label>
          <input
            v-model="chamber"
            type="text"
            class="form-input"
            data-testid="chamber-input"
          />
        </div>

        <!-- SMS Preview -->
        <div class="sms-preview-card">
          <p class="sms-preview-title">پیش‌نمایش پیامک ارسالی به متصدی ({{ complaint.operatorMobile }}):</p>
          <p class="sms-preview-body">
            متصدی محترم {{ complaint.unitName }}، پیرو شکایت {{ complaint.trackingCode }} دعوتنامه رسیدگی به تخلفات شماره {{ summonsNo }} صادر شد. لطفاً در تاریخ {{ hearingDate }} جهت رسیدگی در {{ chamber }} با در دست داشتن مدارک حضور یابید. عدم حضور مانع از اتخاذ تصمیم قانونی نخواهد بود.
          </p>
        </div>

        <div class="dialog-footer">
          <button type="submit" class="submit-btn" data-testid="confirm-summons-btn">
            <Send class="icon-xs" />
            <span>صدور و ابلاغ پیامکی دعوتنامه</span>
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
.summons-dialog-card {
  width: 100%;
  max-width: 38rem;
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
  color: #7c3aed;
  background-color: rgba(124, 58, 237, 0.12);
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

.notice-callout {
  margin: 1.25rem 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: oklch(from var(--warning) l c h / 12%);
  border: 1px solid oklch(from var(--warning) l c h / 25%);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  line-height: 1.6;
}

.dialog-form {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.form-input {
  height: 2.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--background);
  color: var(--foreground);
  padding: 0 0.75rem;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: var(--primary);
  }
}

.sms-preview-card {
  background-color: var(--background);
  border: 1px dashed var(--border);
  border-radius: var(--radius-lg);
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sms-preview-title {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--muted-foreground);
  margin: 0;
}

.sms-preview-body {
  font-size: 0.75rem;
  line-height: 1.6;
  margin: 0;
  color: var(--foreground);
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

.text-warning {
  color: var(--warning);
}
</style>

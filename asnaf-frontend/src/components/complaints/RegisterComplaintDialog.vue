<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useUnitsStore } from 'src/stores/units';
import type { Complaint } from 'src/types/asnaf';
import {
  FilePlus,
  Send,
  X,
  Building2,
  User,
  MapPin,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-vue-next';

interface Props {
  readonly modelValue: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'registered', complaint: Complaint): void;
}>();

const $q = useQuasar();
const unitsStore = useUnitsStore();

const complainantName = ref('');
const complainantMobile = ref('0916');
const unitName = ref('');
const operatorName = ref('');
const operatorMobile = ref('0916');
const unionName = ref('اتحادیه خواربار و سوپرمارکت');
const region = ref('منطقه ۲ (اهواز - کیانپارس)');
const address = ref('');
const violationSubject = ref('گران‌فروشی و عدم درج قیمت');
const description = ref('');

const isSubmitting = ref(false);
const createdComplaint = ref<Complaint | null>(null);

const unionsList = [
  'اتحادیه خواربار و سوپرمارکت',
  'اتحادیه نانوایان',
  'اتحادیه لبنیات و بستنی',
  'اتحادیه مبل‌سازان و درودگران',
  'اتحادیه تعمیرکاران خودرو',
  'اتحادیه اغذیه‌فروشان و رستوران',
  'اتحادیه قصابان',
  'اتحادیه میوه و تره‌بار',
];

const regionsList = [
  'منطقه ۱ (اهواز - امانیه)',
  'منطقه ۲ (اهواز - کیانپارس)',
  'منطقه ۳ (اهواز - زیتون کارمندی)',
  'منطقه ۴ (اهواز - گلستان و عین ۲)',
  'منطقه ۵ (اهواز - کوت عبدالله)',
  'منطقه ۶ (اهواز - کمپلو جنوبی)',
  'منطقه ۸ (اهواز - پادادشهر)',
];

const violationSubjectsList = [
  'گران‌فروشی و عدم درج قیمت',
  'فاقد پروانه کسب معتبر (ماده ۲۷)',
  'کم‌فروشی آرد یارانه‌ای و تعطیلی خودسرانه',
  'عدم همکاری با بازرس اماکن و اصناف',
  'عدم صدور فاکتور رسمی و گران‌فروشی خدمات',
  'عدم رعایت ضوابط بهداشتی و ایمنی',
  'تداخل صنفی و فروش اقلام غیرمجاز',
];

function submit(): void {
  if (!complainantName.value.trim()) {
    $q.notify({ type: 'negative', message: 'لطفاً نام شاکی را وارد کنید', position: 'top' });
    return;
  }
  if (!/^09\d{9}$/.test(complainantMobile.value.trim())) {
    $q.notify({ type: 'negative', message: 'شماره موبایل شاکی باید ۱۱ رقمی باشد (مثلاً 0916...)', position: 'top' });
    return;
  }
  if (!unitName.value.trim()) {
    $q.notify({ type: 'negative', message: 'نام واحد صنفی الزامی است', position: 'top' });
    return;
  }
  if (!operatorName.value.trim()) {
    $q.notify({ type: 'negative', message: 'نام متصدی الزامی است', position: 'top' });
    return;
  }
  if (!address.value.trim()) {
    $q.notify({ type: 'negative', message: 'نشانی واحد صنفی الزامی است', position: 'top' });
    return;
  }

  isSubmitting.value = true;

  try {
    const comp = unitsStore.registerComplaint({
      complainantName: complainantName.value.trim(),
      complainantMobile: complainantMobile.value.trim(),
      unitName: unitName.value.trim(),
      operatorName: operatorName.value.trim(),
      operatorMobile: operatorMobile.value.trim(),
      unionName: unionName.value,
      region: region.value,
      address: address.value.trim(),
      violationSubject: violationSubject.value,
      description: description.value.trim() || 'شکایت شهروندی جهت بررسی میدانی و اعمال قانون.',
    });

    createdComplaint.value = comp;
    emit('registered', comp);

    $q.notify({
      type: 'positive',
      message: `شکایت با کد پیگیری ${comp.trackingCode} در سامانه سیمبا ثبت شد.`,
      caption: 'پیامک رهگیری به شاکی ارسال گردید و در نوبت ارجاع bazras360 قرار گرفت.',
      position: 'top',
    });
  } finally {
    isSubmitting.value = false;
  }
}

function handleDone(): void {
  createdComplaint.value = null;
  emit('update:modelValue', false);
}

function closeDialog(): void {
  createdComplaint.value = null;
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
    <div class="register-dialog-card" dir="rtl" data-testid="register-complaint-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <div class="dialog-header-info">
          <div class="simba-tag">سامانه هوشمند دریافت شکایات (سیمبا)</div>
          <h3 class="dialog-title">ثبت شکایت مردمی جدید و صدور کد پیگیری</h3>
          <p class="dialog-desc">مرحله اول چرخه رسیدگی: ثبت اطلاعات، تخصیص شناسه رهگیری و ارسال خودکار پیامک</p>
        </div>
        <button
          type="button"
          class="close-btn"
          @click="closeDialog"
          data-testid="close-register-dialog-btn"
          aria-label="بستن"
        >
          <X class="icon-sm" />
        </button>
      </div>

      <!-- Success Screen after registration -->
      <div v-if="createdComplaint" class="success-screen-body">
        <div class="success-badge-wrap">
          <CheckCircle2 class="success-icon" />
        </div>
        <h3 class="success-title">شکایت با موفقیت در سامانه سیمبا ثبت گردید</h3>
        <p class="success-sub">پیامک حاوی شماره پیگیری به شماره همراه شاکی ارسال شد.</p>

        <div class="tracking-code-showcase">
          <span class="showcase-label">شماره پیگیری رسمی شکایت:</span>
          <span class="showcase-number" data-testid="created-complaint-tracking-code">{{ createdComplaint.trackingCode }}</span>
        </div>

        <div class="details-summary-box">
          <p class="summary-line"><b>واحد صنفی:</b> {{ createdComplaint.unitName }} (متصدی: {{ createdComplaint.operatorName }})</p>
          <p class="summary-line"><b>موضوع تخلف:</b> {{ createdComplaint.violationSubject }}</p>
          <p class="summary-line"><b>منطقه شهری:</b> {{ createdComplaint.region }}</p>
          <p class="summary-line"><b>وضعیت فعلی:</b> ارجاع خودکار به کارتابل بازرسی (bazras360)</p>
        </div>

        <div class="success-actions">
          <button
            type="button"
            class="action-btn-primary"
            @click="handleDone"
            data-testid="finish-registration-btn"
          >
            مشاهده در کارتابل رسیدگی به شکایات
          </button>
        </div>
      </div>

      <!-- Form Body -->
      <form v-else class="dialog-form-body" @submit.prevent="submit">
        <!-- Complainant Section -->
        <div class="form-section-group">
          <div class="section-group-header">
            <User class="icon-xs text-primary" />
            <span>مشخصات شاکی (شهروند)</span>
          </div>

          <div class="grid-2">
            <div class="field-item">
              <label class="field-label">نام و نام خانوادگی شاکی *</label>
              <input
                v-model="complainantName"
                type="text"
                placeholder="مثلاً کامران بهبهانی"
                class="form-input"
                data-testid="complainant-name-input"
              />
            </div>
            <div class="field-item">
              <label class="field-label">شماره همراه شاکی (جهت ارسال پیامک رهگیری) *</label>
              <input
                v-model="complainantMobile"
                type="text"
                dir="ltr"
                placeholder="0916..."
                class="form-input text-left"
                data-testid="complainant-mobile-input"
              />
            </div>
          </div>
        </div>

        <!-- Accused Unit Section -->
        <div class="form-section-group">
          <div class="section-group-header">
            <Building2 class="icon-xs text-warning" />
            <span>مشخصات واحد صنفی مورد شکایت</span>
          </div>

          <div class="grid-2">
            <div class="field-item">
              <label class="field-label">نام واحد صنفی / تابلو *</label>
              <input
                v-model="unitName"
                type="text"
                placeholder="مثلاً سوپرمارکت زیتون"
                class="form-input"
                data-testid="unit-name-input"
              />
            </div>
            <div class="field-item">
              <label class="field-label">نام متصدی واحد *</label>
              <input
                v-model="operatorName"
                type="text"
                placeholder="مثلاً احمد رضایی"
                class="form-input"
                data-testid="operator-name-input"
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="field-item">
              <label class="field-label">شماره همراه متصدی (جهت ارسال اخطار و احضار)</label>
              <input
                v-model="operatorMobile"
                type="text"
                dir="ltr"
                placeholder="0916..."
                class="form-input text-left"
                data-testid="operator-mobile-input"
              />
            </div>
            <div class="field-item">
              <label class="field-label">اتحادیه صنف مربوطه *</label>
              <select v-model="unionName" class="form-select" data-testid="union-select">
                <option v-for="u in unionsList" :key="u" :value="u">{{ u }}</option>
              </select>
            </div>
          </div>

          <div class="grid-2">
            <div class="field-item">
              <label class="field-label">محدوده / منطقه بازرسی *</label>
              <select v-model="region" class="form-select" data-testid="region-select">
                <option v-for="r in regionsList" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>
            <div class="field-item">
              <label class="field-label">نشانی دقیق واحد صنفی *</label>
              <input
                v-model="address"
                type="text"
                placeholder="خیابان، پلاک، جنب یا روبروی..."
                class="form-input"
                data-testid="address-input"
              />
            </div>
          </div>
        </div>

        <!-- Violation Section -->
        <div class="form-section-group">
          <div class="section-group-header">
            <AlertTriangle class="icon-xs text-danger" />
            <span>موضوع و شرح شکایت</span>
          </div>

          <div class="field-item">
            <label class="field-label">عنوان تخلف اصلی *</label>
            <select v-model="violationSubject" class="form-select" data-testid="violation-subject-select">
              <option v-for="v in violationSubjectsList" :key="v" :value="v">{{ v }}</option>
            </select>
          </div>

          <div class="field-item">
            <label class="field-label">توضیحات تکمیلی شاکی</label>
            <textarea
              v-model="description"
              rows="3"
              placeholder="شرح جزئیات گران‌فروشی، فاکتور خرید، تاریخ مراجعه و ..."
              class="form-textarea"
              data-testid="description-textarea"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="dialog-footer">
          <button
            type="submit"
            :disabled="isSubmitting"
            class="submit-btn"
            data-testid="submit-complaint-btn"
          >
            <Send class="icon-xs" />
            <span>{{ isSubmitting ? 'در حال ثبت...' : 'ثبت نهایی شکایت و دریافت کد پیگیری' }}</span>
          </button>
          <button
            type="button"
            class="cancel-btn"
            @click="closeDialog"
            data-testid="cancel-complaint-btn"
          >
            انصراف
          </button>
        </div>
      </form>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.register-dialog-card {
  width: 100%;
  max-width: 44rem;
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
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
  background-color: var(--muted);
}

.simba-tag {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #2563eb;
  background-color: rgba(37, 99, 235, 0.12);
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  margin-bottom: 0.25rem;
}

.dialog-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}

.dialog-desc {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0.25rem 0 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  padding: 0.25rem;

  &:hover {
    color: var(--foreground);
  }
}

.dialog-form-body {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-height: 80vh;
  overflow-y: auto;
}

.form-section-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.section-group-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 700;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
  color: var(--foreground);
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

.form-input,
.form-select {
  height: 2.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding: 0 0.75rem;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: var(--primary);
  }

  &.text-left {
    text-align: left;
  }
}

.form-textarea {
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  outline: none;
  resize: vertical;
  line-height: 1.6;

  &:focus {
    border-color: var(--primary);
  }
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
  transition: opacity 0.15s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
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

.success-screen-body {
  padding: 3rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.success-badge-wrap {
  display: grid;
  place-items: center;
  width: 4rem;
  height: 4rem;
  border-radius: 9999px;
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
  margin-bottom: 1rem;
}

.success-icon {
  width: 2.25rem;
  height: 2.25rem;
}

.success-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.success-sub {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  margin: 0.25rem 0 1.5rem;
}

.tracking-code-showcase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  background-color: oklch(from var(--primary) l c h / 10%);
  border: 2px dashed var(--primary);
  border-radius: var(--radius-xl);
  padding: 1rem 2rem;
  margin-bottom: 1.5rem;
}

.showcase-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.showcase-number {
  font-family: monospace;
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--primary);
  letter-spacing: 0.1em;
}

.details-summary-box {
  background-color: var(--muted);
  border-radius: var(--radius-lg);
  padding: 1rem;
  width: 100%;
  max-width: 30rem;
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1.5rem;
}

.summary-line {
  font-size: 0.8125rem;
  margin: 0;
}

.success-actions {
  width: 100%;
  max-width: 20rem;
}

.action-btn-primary {
  width: 100%;
  height: 2.75rem;
  border-radius: var(--radius-md);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-weight: 700;
  cursor: pointer;
}

.icon-sm {
  width: 1.125rem;
  height: 1.125rem;
}

.icon-xs {
  width: 0.875rem;
  height: 0.875rem;
}

.text-primary {
  color: var(--primary);
}

.text-warning {
  color: var(--warning);
}

.text-danger {
  color: var(--destructive);
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import type { Unit, UnsealLetter } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import { useQuasar } from 'quasar';
import emblem from 'src/assets/emblem.png';
import {
  Printer,
  CheckCircle2,
  X,
  FileCheck,
  QrCode,
  Building,
} from 'lucide-vue-next';

const props = defineProps<{
  modelValue: boolean;
  unit: Unit | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'issued', letter: UnsealLetter): void;
}>();

const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

const letterNumber = ref(`۱۴۰۵/ص/${Math.floor(1000 + Math.random() * 9000)}`);
const letterDate = ref('۱۴۰۵/۰۸/۰۵');
const destination = ref('فرماندهی محترم نظارت بر اماکن عمومی فراجا استان خوزستان');
const reason = ref('اخذ پروانه کسب معتبر و پرداخت عوارض صنفی');

const destinations = [
  'فرماندهی محترم نظارت بر اماکن عمومی فراجا استان خوزستان',
  'ریاست محترم شعبه تعزیرات حکومتی شهرستان اهواز',
  'ریاست محترم دادسرای عمومی و انقلاب اهواز',
  'هیئت رئیسه محترم اتاق اصناف اهواز',
];

const reasons = [
  'اخذ پروانه کسب معتبر و پرداخت عوارض صنفی',
  'تعهد ثبتی متصدی و رفع موانع فنی/بهداشتی',
  'صدور مجوز موقت فعالیت تا پایان تشریفات قانونی',
  'تسویه کامل جرائم و احکام تعزیراتی صادره',
];

const canIssue = computed(() => !!props.unit && !!letterNumber.value);

function printLetter(): void {
  window.print();
}

function handleConfirm(): void {
  if (!props.unit) return;

  const letter: UnsealLetter = {
    id: `LTR-${Date.now()}`,
    unitId: props.unit.id,
    unitName: props.unit.name,
    operator: props.unit.operator,
    letterNumber: letterNumber.value,
    letterDate: letterDate.value,
    destination: destination.value,
    reason: reason.value,
    qrCode: `ASNAF-VERIFY-${props.unit.id}-${letterNumber.value}`,
    issuedBy: sessionStore.session?.name ?? 'دبیرخانه اصناف',
  };

  const userName = sessionStore.session?.name ?? 'کارشناس نظارت';
  unitsStore.issueUnsealLetter(letter, userName);

  $q.notify({
    type: 'positive',
    message: `نامه فک پلمپ به شماره ${letter.letterNumber} صادر و وضعیت واحد به «دارای پروانه» تغییر یافت.`,
    position: 'top',
  });

  emit('issued', letter);
  emit('update:modelValue', false);
}
</script>

<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="unseal-dialog-container" dir="rtl" data-testid="unseal-dialog">
      <!-- Top Bar -->
      <div class="dialog-header">
        <div class="header-info">
          <FileCheck class="header-icon text-success" />
          <div>
            <h3 class="header-title">صدور نامه اداری فک پلمپ و منع تعقیب</h3>
            <p v-if="unit" class="header-sub">
              واحد صنفی: {{ unit.name }} · متصدی: {{ unit.operator }} (شناسه پرونده: {{ fa(unit.id) }})
            </p>
          </div>
        </div>
        <div class="header-actions">
          <button type="button" class="btn-print" @click="printLetter">
            <Printer class="icon-sm" />
            <span>چاپ سربرگ (A4)</span>
          </button>
          <button type="button" class="btn-close" @click="emit('update:modelValue', false)">
            <X class="icon-sm" />
          </button>
        </div>
      </div>

      <!-- Main Layout: Form Inputs + A4 Preview -->
      <div class="dialog-content">
        <!-- Settings Form -->
        <div class="form-pane">
          <div class="pane-card shadow-card">
            <h4 class="pane-title">تنظیمات و مشخصات نامه</h4>

            <div class="form-group">
              <label class="form-label">شماره نامه دبیرخانه:</label>
              <input v-model="letterNumber" type="text" class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">تاریخ صدور نامه (شمسی):</label>
              <input v-model="letterDate" type="text" class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">مرجع مخاطب نامه:</label>
              <select v-model="destination" class="form-select">
                <option v-for="d in destinations" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">علت صدور منع پیگیری / فک پلمپ:</label>
              <select v-model="reason" class="form-select">
                <option v-for="r in reasons" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>

            <div class="form-actions">
              <button
                type="button"
                class="btn-confirm-issue"
                :disabled="!canIssue"
                @click="handleConfirm"
                data-testid="confirm-unseal-btn"
              >
                <CheckCircle2 class="icon-sm" />
                <span>تأیید و صدور نهایی نامه اداری</span>
              </button>
            </div>
          </div>
        </div>

        <!-- A4 Printable Sheet Preview -->
        <div class="preview-pane">
          <div class="a4-sheet" id="printable-letter">
            <!-- Sheet Header -->
            <div class="sheet-header">
              <div class="sheet-meta-right">
                <p>جمهوری اسلامی ایران</p>
                <p>اتاق اصناف شهرستان اهواز</p>
                <p>کمیسیون بازرسی و نظارت بر اصناف</p>
              </div>

              <div class="sheet-emblem">
                <img :src="emblem" alt="نشان اتاق اصناف" class="emblem-img" />
              </div>

              <div class="sheet-meta-left">
                <p>شماره نامه: <strong>{{ letterNumber }}</strong></p>
                <p>تاریخ صدور: <strong>{{ letterDate }}</strong></p>
                <p>پیوست: <strong>دارد (مستندات پروانه)</strong></p>
              </div>
            </div>

            <div class="sheet-divider" />

            <!-- Sheet Recipient -->
            <div class="sheet-recipient">
              <p class="recipient-title">به: {{ destination }}</p>
              <p class="recipient-subject">
                موضوع: <strong>دستور رفع پلمپ و منع پیگیری انتظامی واحد صنفی «{{ unit?.name }}»</strong>
              </p>
            </div>

            <!-- Sheet Body Text -->
            <div class="sheet-body">
              <p>سلام علیکم؛</p>
              <p class="paragraph">
                احتراماً، پیرو گزارش بازرسی و دستور پلمپ شماره <strong>{{ unit?.warningNo ?? '۱۴۰۵-۲۳۱' }}</strong>
                مربوط به واحد صنفی <strong>«{{ unit?.name }}»</strong> به شناسه پرونده
                <strong>{{ fa(unit?.id ?? 0) }}</strong> و تصدی آقای/خانم
                <strong>{{ unit?.operator }}</strong> (کد ملی: {{ fa(unit?.nationalId ?? '') }} / موبایل: {{ fa(unit?.mobile ?? '') }})
                مستقر در آدرس <em>{{ unit?.address }}</em>، به استحضار می‌رساند:
              </p>
              <p class="paragraph">
                با عنایت به مراجعه متصدی محترم و <strong>{{ reason }}</strong>
                تحت نظارت اتحادیه صنف <strong>{{ unit?.union }}</strong>، اقدامات مقتضی جهت تطبیق با مقررات قانون نظام صنفی انجام پذیرفته است.
              </p>
              <p class="paragraph">
                علی‌هذا مستدعی است دستور فرمایید ضمن <strong>فک پلمپ و رفع اثر از احکام صادره قبلی</strong>،
                نسبت به منع پیگیری پرونده یادشده در مراجع انتظامی و نظارتی اقدام لازم مبذول و نتیجه به این کمیسیون اعلام گردد.
              </p>
            </div>

            <!-- Sheet Signatures -->
            <div class="sheet-signatures">
              <div class="qr-box">
                <QrCode class="qr-icon" />
                <span class="qr-text">شناسه اعتبارسنجی اصناف:<br />{{ letterNumber }}</span>
              </div>

              <div class="sign-box">
                <p class="sign-title">رئیس اتاق اصناف شهرستان اهواز</p>
                <p class="sign-role">و دبیر کمیسیون نظارت استان خوزستان</p>
                <div class="sign-placeholder">
                  <span>[امضا و مهر رسمی دبیرخانه]</span>
                </div>
              </div>
            </div>

            <!-- Sheet Footnote -->
            <div class="sheet-footer">
              <p>رونوشت: فرمانداری محترم اهواز جهت استحضار / مدیریت محترم بازرسی و نظارت اصناف / پرونده واحد صنفی بایگانی.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.unseal-dialog-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.5rem;
  background-color: var(--card);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  width: 1.75rem;
  height: 1.75rem;
}

.header-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.header-sub {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0.125rem 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-print {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background-color: var(--primary);
  color: var(--primary-foreground);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
}

.btn-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted-foreground);
  border-radius: var(--radius-md);
  cursor: pointer;

  &:hover {
    color: var(--foreground);
    background-color: var(--muted);
  }
}

.dialog-content {
  display: grid;
  flex: 1;
  overflow: hidden;
  grid-template-columns: 1fr;

  @media (min-width: 900px) {
    grid-template-columns: 22rem 1fr;
  }
}

.form-pane {
  padding: 1.25rem;
  overflow-y: auto;
  border-inline-end: 1px solid var(--border);
  background-color: oklch(from var(--muted) l c h / 30%);
}

.pane-card {
  background-color: var(--card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pane-title {
  font-size: 0.875rem;
  font-weight: 700;
  margin: 0;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.form-input,
.form-select {
  height: 2.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--background);
  color: var(--foreground);
  padding: 0 0.75rem;
  font-size: 0.8125rem;
  outline: none;

  &:focus {
    border-color: var(--primary);
  }
}

.btn-confirm-issue {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  background-color: var(--success);
  color: var(--success-foreground);
  border: none;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: 0.5rem;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.preview-pane {
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background-color: oklch(from var(--muted) l c h / 40%);
}

/* Printable A4 Sheet Design */
.a4-sheet {
  width: 100%;
  max-width: 210mm;
  min-height: 297mm;
  background-color: #ffffff;
  color: #1a1a1a;
  padding: 20mm 20mm;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  line-height: 1.8;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: #333333;
}

.sheet-meta-right {
  text-align: right;
  p {
    margin: 0.125rem 0;
  }
}

.sheet-emblem {
  width: 4rem;
  height: 4rem;
  flex-shrink: 0;

  .emblem-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.sheet-meta-left {
  text-align: left;
  direction: rtl;
  p {
    margin: 0.125rem 0;
  }
}

.sheet-divider {
  height: 2px;
  background-color: #0f172a;
  margin: 1rem 0;
}

.sheet-recipient {
  margin: 1rem 0 1.5rem;

  .recipient-title {
    font-size: 0.9375rem;
    font-weight: 700;
    margin: 0;
  }

  .recipient-subject {
    font-size: 0.875rem;
    margin: 0.5rem 0 0;
    color: #1e293b;
  }
}

.sheet-body {
  font-size: 0.875rem;
  color: #1e293b;

  .paragraph {
    margin-top: 1rem;
    text-align: justify;
    text-indent: 1.5rem;
  }
}

.sheet-signatures {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 3rem;
  padding-top: 1rem;
}

.qr-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid #cbd5e1;
  padding: 0.5rem;
  border-radius: 4px;

  .qr-icon {
    width: 2.5rem;
    height: 2.5rem;
    color: #0f172a;
  }

  .qr-text {
    font-size: 0.6875rem;
    color: #64748b;
    direction: ltr;
  }
}

.sign-box {
  text-align: center;

  .sign-title {
    font-weight: 700;
    font-size: 0.875rem;
    margin: 0;
  }

  .sign-role {
    font-size: 0.75rem;
    color: #475569;
    margin: 0.25rem 0 0;
  }

  .sign-placeholder {
    margin-top: 1.5rem;
    font-size: 0.75rem;
    color: #94a3b8;
    border: 1px dashed #cbd5e1;
    padding: 0.5rem 1rem;
    border-radius: 4px;
  }
}

.sheet-footer {
  border-top: 1px solid #e2e8f0;
  padding-top: 0.75rem;
  font-size: 0.6875rem;
  color: #64748b;
  margin-top: 2rem;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

/* Print Styles */
@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }

  body * {
    visibility: hidden;
  }
  #printable-letter,
  #printable-letter * {
    visibility: visible;
  }
  #printable-letter {
    position: absolute;
    inset-inline-start: 0;
    top: 0;
    width: 210mm !important;
    max-width: 210mm !important;
    margin: 0 auto;
    padding: 14mm 18mm !important;
    box-shadow: none;
    box-sizing: border-box !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
</style>

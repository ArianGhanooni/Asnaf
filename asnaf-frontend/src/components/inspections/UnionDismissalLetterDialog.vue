<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import type { Unit } from 'src/types/asnaf';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import { useQuasar } from 'quasar';
import { fa } from 'src/utils/fa';
import emblem from 'src/assets/emblem.png';
import { Printer, CheckCircle2, X, FileText, QrCode } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    unit: Unit | null;
    requestType?: 'dismissal' | 'unseal';
    mode?: 'dismissal' | 'unseal';
  }>(),
  {}
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submitted'): void;
}>();

const route = useRoute();
const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

const requestType = computed<'dismissal' | 'unseal'>(() => {
  if (props.requestType) return props.requestType;
  if (props.mode) return props.mode;

  const path = route?.path || '';
  const queryStage = (route?.query?.stage as string) || '';

  if (path.includes('unseal') || path.includes('/seal') || queryStage === 'unsealed') {
    return 'unseal';
  }
  if (path.includes('dismissed') || queryStage === 'dismissed') {
    return 'dismissal';
  }

  if (
    props.unit?.status === 'sealed' ||
    props.unit?.status === 'unsealed' ||
    (props.unit as any)?.isSealed
  ) {
    return 'unseal';
  }

  return 'dismissal';
});
const fineTrackingNo = ref(`PAY-27-${Math.floor(10000000 + Math.random() * 90000000)}`);
const graceDate = ref('1405/09/15');
const commerceCode = ref(`TC-${Math.floor(10000 + Math.random() * 90000)}`);
const letterDate = ref('1405/08/05');
const letterNo = ref(`اتحادیه/ص/${Math.floor(1000 + Math.random() * 9000)}`);

const trackingSmsId = computed(() => {
  return props.unit?.simba || String(props.unit ? props.unit.id + 1000 : 12263);
});

function printLetter(): void {
  window.print();
}

function handleSubmit(): void {
  if (!props.unit) return;

  const user = sessionStore.session?.name ?? 'کاربر اتحادیه صنفی';
  unitsStore.submitUnionDismissalDraft(
    props.unit.id,
    requestType.value,
    fineTrackingNo.value,
    graceDate.value,
    user
  );

  $q.notify({
    type: 'positive',
    message: `پیش‌نویس نامه ${requestType.value === 'dismissal' ? 'منع پیگیری' : 'فک پلمپ'} با موفقیت به کارتابل اتاق اصناف ارسال شد.`,
    caption: `شماره پیگیری جریمه: ${fineTrackingNo.value}`,
    position: 'top',
  });

  emit('submitted');
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
    <div class="letter-dialog-container" dir="rtl" data-testid="union-dismissal-letter-dialog">
      <!-- Top Action Bar -->
      <div class="top-bar no-print">
        <div class="top-bar-info">
          <FileText class="top-icon" />
          <div>
            <h3 class="top-title">
              {{ requestType === 'unseal' ? 'صدور پیش‌نویس نامه فک پلمپ اتحادیه به اتاق اصناف' : 'صدور پیش‌نویس نامه منع پیگیری اتحادیه به اتاق اصناف' }}
            </h3>
          </div>
        </div>

        <div class="top-actions">
          <button type="button" class="btn-print" @click="printLetter">
            <Printer class="icon-sm" />
            <span>چاپ سربرگ رسمی (A4)</span>
          </button>
          <button type="button" class="btn-submit" @click="handleSubmit">
            <CheckCircle2 class="icon-sm" />
            <span>{{ requestType === 'unseal' ? 'ثبت و فک پلمپ' : 'ثبت و منع پیگیری' }}</span>
          </button>
          <button type="button" class="btn-close" @click="emit('update:modelValue', false)">
            <X class="icon-sm" />
          </button>
        </div>
      </div>

      <!-- Main Body: Input Controls + Official Letterhead Paper Preview -->
      <div class="main-body">
        <!-- Settings Sidebar Pane (Hidden in Print) -->
        <div class="settings-pane no-print">
          <div class="pane-card">
            <h4 class="pane-title">مشخصات و متغیرهای نامه اتحادیه</h4>

            <div class="form-group">
              <label class="form-label">شماره نامه دبیرخانه اتحادیه:</label>
              <input v-model="letterNo" type="text" class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">تاریخ صدور نامه اتحادیه:</label>
              <div class="date-picker-field">
                <input
                  v-model="letterDate"
                  type="text"
                  class="form-input ltr-input date-input"
                  placeholder="1405/08/05"
                />
                <button type="button" class="btn-picker" title="انتخاب تاریخ از تقویم شمسی">
                  <q-icon name="event" size="1.25rem" />
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date
                      v-model="letterDate"
                      calendar="persian"
                      mask="YYYY/MM/DD"
                      today-btn
                    >
                      <div class="row items-center justify-end q-pa-xs">
                        <q-btn v-close-popup label="انتخاب و بستن" color="primary" dense flat />
                      </div>
                    </q-date>
                  </q-popup-proxy>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">شماره پیگیری پرداخت جریمه ماده ۲۷:</label>
              <input v-model="fineTrackingNo" type="text" class="form-input ltr-input" />
            </div>

            <div class="form-group">
              <label class="form-label">تاریخ امهال (مهلت اعطایی به متصدی):</label>
              <div class="date-picker-field">
                <input
                  v-model="graceDate"
                  type="text"
                  class="form-input ltr-input date-input"
                  placeholder="1405/09/15"
                />
                <button type="button" class="btn-picker" title="انتخاب تاریخ از تقویم شمسی">
                  <q-icon name="event" size="1.25rem" />
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date
                      v-model="graceDate"
                      calendar="persian"
                      mask="YYYY/MM/DD"
                      today-btn
                    >
                      <div class="row items-center justify-end q-pa-xs">
                        <q-btn v-close-popup label="انتخاب و بستن" color="primary" dense flat />
                      </div>
                    </q-date>
                  </q-popup-proxy>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">کد پیگیری احکام تجارت:</label>
              <input v-model="commerceCode" type="text" class="form-input ltr-input" />
            </div>
          </div>
        </div>

        <!-- A4 Letterhead Paper -->
        <div class="letter-paper-wrap">
          <div class="official-letter-page" id="printable-letter">
            <!-- Header -->
            <div class="letter-header">
              <div class="header-right">
                <p class="bismillah">بسمه تعالی</p>
                <h2 class="union-official-title">{{ unit?.union || 'اتحادیه صنف نانوایان اهواز' }}</h2>
                <p class="affiliated-sub">تحت نظارت اتاق اصناف اهواز</p>
              </div>

              <div class="header-center">
                <img :src="emblem" alt="لوگوی اتاق اصناف" class="letter-emblem" />
              </div>

              <div class="header-left">
                <p><strong>تاریخ:</strong> {{ fa(letterDate) }}</p>
                <p><strong>شماره:</strong> {{ fa(letterNo) }}</p>
                <p><strong>پیوست:</strong> دارد</p>
              </div>
            </div>

            <div class="letter-divider"></div>

            <!-- Recipient -->
            <div class="letter-addressee">
              <p class="to-text"><strong>به:</strong> هیئت رئیسه محترم اتاق اصناف اهواز - واحد اجرائیات</p>
              <p class="subject-text">
                <strong>موضوع:</strong> تقاضای
                <span class="highlight-request">
                  {{ requestType === 'dismissal' ? '«منع پیگیری تخلف صنفی»' : '«فک پلمپ واحد صنفی»' }}
                </span>
                ماده ۲۷ و ۲۸ قانون نظام صنفی
              </p>
            </div>

            <!-- Letter Body -->
            <div class="letter-text-body">
              <p>سلام علیکم؛</p>
              <p class="par-body">
                احتراماً عطف به پرونده اخطار نظارتی واحد صنفی مشروحه ذیل، با عنایت به مراجعه حضوری متصدی مربوطه به این اتحادیه تخصصی، تسویه حساب کامل دیون و جریمه ماده ۲۷ و اخذ تعهد رسمی مبنی بر تکمیل تشریفات قانونی پروانه کسب در مهلت مقرر، خواهشمند است دستور فرمایید اقدامات لازم جهت
                <strong>{{ requestType === 'dismissal' ? 'منع پیگیری' : 'فک پلمپ' }}</strong>
                مشارالیه مبذول و نتیجه به این اتحادیه و اداره نظارت بر اماکن عمومی ابلاغ گردد.
              </p>
            </div>

            <!-- Case Specifications Table -->
            <table class="specs-table">
              <tbody>
                <tr>
                  <td class="td-label">نوع درخواست:</td>
                  <td class="td-val font-bold">
                    <span v-if="requestType === 'unseal'">[✔] فک پلمپ</span>
                    <span v-else>[✔] منع پیگیری</span>
                  </td>
                  <td class="td-label">شناسه ساماندهی:</td>
                  <td class="td-val ltr-text font-bold">{{ fa(trackingSmsId) }}</td>
                </tr>
                <tr>
                  <td class="td-label">نام و نام خانوادگی متصدی:</td>
                  <td class="td-val font-bold">{{ unit?.operator }}</td>
                  <td class="td-label">کد ملی متصدی:</td>
                  <td class="td-val ltr-text">{{ fa(unit?.nationalId || '') }}</td>
                </tr>
                <tr>
                  <td class="td-label">نام تابلو واحد صنفی:</td>
                  <td class="td-val font-bold">{{ unit?.name }}</td>
                  <td class="td-label">شماره تلفن همراه:</td>
                  <td class="td-val ltr-text">{{ fa(unit?.mobile || '') }}</td>
                </tr>
                <tr>
                  <td class="td-label">رسته شغلی دقیق:</td>
                  <td class="td-val">{{ unit?.violation || 'صنوف تحت نظارت' }}</td>
                  <td class="td-label">منطقه شهری:</td>
                  <td class="td-val">{{ fa(unit?.region || '') }}</td>
                </tr>
                <tr>
                  <td class="td-label">نشانی کامل محل کسب:</td>
                  <td colspan="3" class="td-val">{{ unit?.address }}</td>
                </tr>
              </tbody>
            </table>

            <!-- Audit Trail Box (تغییرات انجام شده در اخطار) -->
            <div class="audit-changes-section">
              <h5 class="audit-section-title">گزارش تغییرات انجام شده در اخطار (لاگ ممیزی مشخصات متصدی):</h5>
              <div class="audit-box-content">
                <template v-if="unit?.auditTrail && unit.auditTrail.length > 0">
                  <div
                    v-for="(log, idx) in unit.auditTrail"
                    :key="idx"
                    class="audit-row"
                  >
                    <span class="audit-time">{{ log.timestamp }}:</span>
                    <span class="audit-text">{{ log.diffText }}</span>
                    <span class="audit-user">({{ log.modifiedBy }})</span>
                  </div>
                </template>
                <p v-else class="text-muted-audit">
                  هیچ‌گونه تغییر در مشخصات اولیه ثبت‌نشده و اطلاعات هویتی متصدی با کارت ملی مطابقت دارد.
                </p>
              </div>
            </div>

            <!-- Financial and Legal Tracking Box -->
            <div class="financial-tracking-grid">
              <div class="fin-box">
                <span class="fin-label">تاریخ امهال (مهلت اعطایی):</span>
                <span class="fin-val font-bold">{{ fa(graceDate) }}</span>
              </div>
              <div class="fin-box">
                <span class="fin-label">کد پیگیری احکام تجارت:</span>
                <span class="fin-val ltr-text">{{ commerceCode }}</span>
              </div>
              <div class="fin-box">
                <span class="fin-label">شماره پیگیری فیش جریمه ماده ۲۷:</span>
                <span class="fin-val ltr-text font-bold">{{ fineTrackingNo }}</span>
              </div>
            </div>

            <!-- Guide Box for Citizen -->
            <div class="operator-guide-notice">
              <strong>راهنمای متصدی واحد صنفی:</strong>
              پرونده شما در وضعیت «در انتظار تکمیل» قرار دارد. جهت خروج از این وضعیت و دریافت مهلت رسمی، لطفاً با در دست داشتن این نامه فوراً به اتاق اصناف اهواز (واحد اجرائیات) مراجعه فرمایید.
            </div>

            <!-- Signatures and Footer Stamp Area -->
            <div class="letter-footer">
              <div class="footer-qr">
                <QrCode class="qr-icon" />
                <span class="qr-caption">شناسه اعتبارسنجی: {{ trackingSmsId }}</span>
              </div>

              <div class="footer-signature">
                <p class="sign-title">رئیس / دبیر اجرایی اتحادیه صنف مربوطه</p>
                <p class="sign-name">مهر رسمی و امضای الکترونیک</p>
                <div class="stamp-placeholder">مهر و امضای اتحادیه صنفی</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.letter-dialog-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: #0f172a;
  color: #f8fafc;
  overflow: hidden;
}

.top-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background-color: #1e293b;
  border-bottom: 1px solid #334155;
}

.top-bar-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  .top-icon {
    width: 1.5rem;
    height: 1.5rem;
    color: #38bdf8;
  }

  .top-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }

  .top-sub {
    margin: 0.15rem 0 0;
    font-size: 0.75rem;
    color: #94a3b8;
  }
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.btn-print {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md, 0.375rem);
  border: 1px solid #475569;
  background-color: #334155;
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: #475569;
  }
}

.btn-submit {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1.25rem;
  border-radius: var(--radius-md, 0.375rem);
  border: none;
  background-color: #16a34a;
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.9;
  }
}

.btn-close {
  display: grid;
  place-items: center;
  background: none;
  border: none;
  color: #94a3b8;
  padding: 0.5rem;
  cursor: pointer;

  &:hover {
    color: #ffffff;
  }
}

.main-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.settings-pane {
  width: 22rem;
  flex-shrink: 0;
  padding: 1.25rem;
  background-color: #1e293b;
  border-inline-end: 1px solid #334155;
  overflow-y: auto;
}

.pane-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pane-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #38bdf8;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #cbd5e1;
}

.form-input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #475569;
  background-color: #0f172a;
  color: #ffffff;
  font-family: 'Vazirmatn', inherit, sans-serif;
  font-size: 0.875rem;

  &.ltr-input {
    direction: ltr;
    text-align: left;
    font-family: 'Vazirmatn', inherit, sans-serif;
  }
}

.date-picker-field {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;

  .date-input {
    width: 100%;
    padding-left: 0.75rem !important;
    padding-right: 2.75rem !important;
    direction: ltr;
    text-align: left;
  }

  .btn-picker {
    position: absolute;
    right: 0.4rem !important;
    left: auto !important;
    top: 50%;
    transform: translateY(-50%);
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    background: transparent;
    border: none;
    color: #38bdf8;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: background-color 0.15s ease, color 0.15s ease;

    &:hover {
      background-color: rgba(56, 189, 248, 0.15);
      color: #7dd3fc;
    }
  }
}

.letter-paper-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  justify-content: center;
  background-color: #0b1120;
}

.official-letter-page {
  width: 210mm;
  min-height: 297mm;
  background-color: #ffffff;
  color: #111827;
  padding: 20mm;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  font-family: 'Vazirmatn', Tahoma, sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  position: relative;
  box-sizing: border-box;
}

.letter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.header-right {
  flex: 1;

  .bismillah {
    margin: 0;
    font-size: 10pt;
    font-weight: 700;
    color: #4b5563;
  }

  .union-official-title {
    margin: 0.25rem 0 0;
    font-size: 13pt;
    font-weight: 800;
    color: #111827;
  }

  .affiliated-sub {
    margin: 0.15rem 0 0;
    font-size: 9pt;
    color: #6b7280;
  }
}

.header-center {
  display: grid;
  place-items: center;
  padding: 0 1rem;

  .letter-emblem {
    width: 65px;
    height: 65px;
    object-fit: contain;
  }
}

.header-left {
  font-size: 9.5pt;
  line-height: 1.5;
  color: #374151;
  text-align: left;
  direction: rtl;

  p {
    margin: 0;
  }
}

.letter-divider {
  height: 2px;
  background: linear-gradient(90deg, #1e3a8a 0%, #3b82f6 50%, #1e3a8a 100%);
  margin: 0.5rem 0 1rem;
}

.letter-addressee {
  margin-bottom: 1rem;

  .to-text {
    font-size: 11.5pt;
    margin: 0 0 0.35rem;
  }

  .subject-text {
    font-size: 11pt;
    margin: 0;
  }

  .highlight-request {
    font-weight: 800;
    color: #1e3a8a;
  }
}

.letter-text-body {
  margin-bottom: 1rem;
  text-align: justify;

  p {
    margin: 0 0 0.5rem;
  }

  .par-body {
    text-indent: 1.5rem;
  }
}

.specs-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
  font-size: 9.5pt;
  table-layout: fixed;

  td {
    border: 1px solid #d1d5db;
    padding: 0.45rem 0.6rem;
    vertical-align: middle;
    word-break: break-word;
  }

  .td-label {
    background-color: #f3f4f6;
    font-weight: 700;
    color: #374151;
    width: 20%;
  }

  .td-val {
    color: #111827;
    width: 30%;
  }

  .ltr-text {
    direction: ltr;
    text-align: left;
    font-family: 'Vazirmatn', inherit, sans-serif;
  }
}

.audit-changes-section {
  border: 1px solid #e5e7eb;
  background-color: #f9fafb;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 1rem;

  .audit-section-title {
    margin: 0 0 0.35rem;
    font-size: 9pt;
    font-weight: 700;
    color: #b45309;
  }

  .audit-row {
    font-size: 8.5pt;
    line-height: 1.4;
    color: #374151;
    margin-bottom: 0.25rem;

    .audit-time {
      font-weight: 700;
      color: #6b7280;
      margin-inline-end: 0.35rem;
    }
    .audit-user {
      color: #9ca3af;
      margin-inline-start: 0.35rem;
    }
  }

  .text-muted-audit {
    margin: 0;
    font-size: 8.5pt;
    color: #6b7280;
    font-style: italic;
  }
}

.financial-tracking-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.fin-box {
  border: 1px solid #e5e7eb;
  background-color: #f8fafc;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;

  .fin-label {
    font-size: 8pt;
    color: #64748b;
  }
  .fin-val {
    font-size: 9pt;
    color: #0f172a;
  }
}

.operator-guide-notice {
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 8.5pt;
  margin-bottom: 1.5rem;
}

.letter-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 2rem;
}

.footer-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;

  .qr-icon {
    width: 60px;
    height: 60px;
    color: #111827;
  }

  .qr-caption {
    font-size: 7.5pt;
    color: #6b7280;
    font-family: 'Vazirmatn', inherit, sans-serif;
  }
}

.footer-signature {
  text-align: center;
  min-width: 180px;

  .sign-title {
    margin: 0;
    font-size: 10pt;
    font-weight: 700;
  }
  .sign-name {
    margin: 0.15rem 0 0.5rem;
    font-size: 8.5pt;
    color: #6b7280;
  }
  .stamp-placeholder {
    width: 120px;
    height: 70px;
    border: 1px dashed #9ca3af;
    border-radius: 50%;
    margin: 0 auto;
    display: grid;
    place-items: center;
    font-size: 8pt;
    color: #9ca3af;
  }
}

@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }

  html,
  body {
    width: 210mm !important;
    height: auto !important;
    min-height: 297mm !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    overflow: visible !important;
  }

  #q-app,
  .q-dialog__backdrop,
  .no-print {
    display: none !important;
  }

  .q-dialog,
  .q-dialog__inner {
    padding: 0 !important;
    margin: 0 !important;
    position: static !important;
    display: block !important;
    overflow: visible !important;
    width: 210mm !important;
    height: auto !important;
    max-width: none !important;
    max-height: none !important;
    transform: none !important;
    background: transparent !important;
  }

  .letter-dialog-container,
  .main-body,
  .letter-paper-wrap {
    display: block !important;
    position: static !important;
    width: 210mm !important;
    height: auto !important;
    min-height: auto !important;
    max-width: 210mm !important;
    overflow: visible !important;
    padding: 0 !important;
    margin: 0 auto !important;
    background: #ffffff !important;
    box-shadow: none !important;
    border: none !important;
  }

  .official-letter-page {
    width: 210mm !important;
    max-width: 210mm !important;
    min-height: 297mm !important;
    margin: 0 auto !important;
    padding: 14mm 18mm !important;
    box-sizing: border-box !important;
    box-shadow: none !important;
    border: none !important;
    background-color: #ffffff !important;
    color: #111827 !important;
    overflow: visible !important;
    page-break-after: avoid !important;
    break-after: avoid !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .specs-table,
  .audit-changes-section,
  .financial-tracking-grid,
  .operator-guide-notice,
  .letter-footer {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
</style>

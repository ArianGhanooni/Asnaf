<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Unit } from 'src/types/asnaf';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import { useQuasar } from 'quasar';
import { fa } from 'src/utils/fa';
import emblem from 'src/assets/emblem.png';
import { Printer, CheckCircle2, X, FileText, QrCode } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: boolean;
  unit: Unit | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submitted'): void;
}>();

const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

// متغیرها و فیلدهای قابل نگارش نامه فک پلمپ
const letterNo = ref(`اتحادیه/فک/${Math.floor(1000 + Math.random() * 9000)}`);
const letterDate = ref('1405/08/05');
const fineTrackingNo = ref(`PAY-UNSEAL-${Math.floor(10000000 + Math.random() * 90000000)}`);
const sealReportNo = ref(`اماکن/پلمپ/${Math.floor(1000 + Math.random() * 9000)}`);
const sealReportDate = ref('1405/07/15');
const commerceCode = ref(`TC-${Math.floor(10000 + Math.random() * 90000)}`);
const unsealReason = ref('تسویه حساب کامل دیون صنفی، اخذ تعهد رسمی و ارائه مدارک پروانه کسب');

// متن رسمی قابل ویرایش بدنه نامه
const customBodyText = ref(
  'احتراماً عطف به پرونده اجرای حکم پلمپ واحد صنفی موصوف و پیرو مراجعات و پیگیری‌های قانونی متصدی مربوطه، با عنایت به تسویه کامل دیون و جرائم مقرر، اخذ تعهد محضری مبنی بر رعایت ضوابط نظام صنفی و ارائه مدارک معتبر جهت تکمیل تشریفات صدور پروانه کسب، مستدعی است دستور فرمایید اقدامات لازم و عاجل جهت فک پلمپ و رفع اثر از احکام صادره قبلی مشارالیه مبذول و نتیجه به این اتحادیه و اداره نظارت بر اماکن عمومی فراجا ابلاغ گردد.'
);

const trackingSmsId = computed(() => {
  return props.unit?.simba || String(props.unit ? props.unit.id + 1000 : 12263);
});

function printLetter(): void {
  window.print();
}

function handleSubmit(): void {
  if (!props.unit) return;

  const user = sessionStore.session?.name ?? 'کارشناس اتاق اصناف';
  unitsStore.submitUnionDismissalDraft(
    props.unit.id,
    'unseal',
    fineTrackingNo.value,
    '۱۴۰۵/۰۹/۱۵',
    user
  );

  unitsStore.addAudit(
    user,
    `صدور و ارسال پیش‌نویس نامه فک پلمپ به شماره ${letterNo.value}`,
    `واحد: ${props.unit.name} (شناسه رهگیری: ${fineTrackingNo.value})`
  );

  $q.notify({
    type: 'positive',
    message: `پیش‌نویس نامه فک پلمپ واحد «${props.unit.name}» با موفقیت ثبت و ارسال شد.`,
    caption: `شماره نامه: ${letterNo.value} | فیش پرداخت: ${fineTrackingNo.value}`,
    position: 'top',
    timeout: 3500,
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
    <div class="unseal-dialog-container" dir="rtl" data-testid="union-unseal-letter-dialog">
      <!-- نوار اقدامات فوقانی (مخفی در خروجی چاپ) -->
      <div class="top-bar no-print">
        <div class="top-bar-info">
          <FileText class="top-icon" />
          <div>
            <h3 class="top-title">نگارش و صدور پیش‌نویس نامه فک پلمپ</h3>
            <p v-if="unit" class="top-sub">
              {{ unit.union }} · واحد صنفی: {{ unit.name }} (شناسه ساماندهی: {{ fa(trackingSmsId) }})
            </p>
          </div>
        </div>

        <div class="top-actions">
          <button type="button" class="btn-print" @click="printLetter" data-testid="print-unseal-letter-btn">
            <Printer class="icon-sm" />
            <span>چاپ و خروجی سربرگ رسمی (A4)</span>
          </button>
          <button type="button" class="btn-submit" @click="handleSubmit" data-testid="submit-unseal-letter-btn">
            <CheckCircle2 class="icon-sm" />
            <span>ثبت و فک پلمپ</span>
          </button>
          <button type="button" class="btn-close" @click="emit('update:modelValue', false)">
            <X class="icon-sm" />
          </button>
        </div>
      </div>

      <!-- بدنه اصلی: پنل متغیرها و نگارش نامه + پیش‌نمایش سربرگ A4 -->
      <div class="main-body">
        <!-- پنل تنظیمات و نگارش نامه (مخفی در پرینت) -->
        <div class="settings-pane no-print">
          <div class="pane-card">
            <h4 class="pane-title">تنظیمات و نگارش نامه فک پلمپ</h4>

            <div class="form-group">
              <label class="form-label">شماره نامه دبیرخانه:</label>
              <input v-model="letterNo" type="text" class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">تاریخ صدور نامه:</label>
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
              <label class="form-label">شماره صورتمجلس پلمپ اماکن:</label>
              <input v-model="sealReportNo" type="text" class="form-input ltr-input" />
            </div>

            <div class="form-group">
              <label class="form-label">تاریخ صورتمجلس پلمپ:</label>
              <div class="date-picker-field">
                <input
                  v-model="sealReportDate"
                  type="text"
                  class="form-input ltr-input date-input"
                  placeholder="1405/07/15"
                />
                <button type="button" class="btn-picker" title="انتخاب تاریخ از تقویم شمسی">
                  <q-icon name="event" size="1.25rem" />
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date
                      v-model="sealReportDate"
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
              <label class="form-label">شماره فیش پرداخت جریمه / تسویه:</label>
              <input v-model="fineTrackingNo" type="text" class="form-input ltr-input" />
            </div>

            <div class="form-group">
              <label class="form-label">کد پیگیری احکام تجارت:</label>
              <input v-model="commerceCode" type="text" class="form-input ltr-input" />
            </div>

            <div class="form-group">
              <label class="form-label">علت صدور فک پلمپ:</label>
              <input v-model="unsealReason" type="text" class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">متن تقاضای فک پلمپ (قابل ویرایش):</label>
              <textarea
                v-model="customBodyText"
                rows="5"
                class="form-textarea"
                placeholder="متن نامه را در این قسمت بنویسید..."
              ></textarea>
            </div>
          </div>
        </div>

        <!-- پیش‌نمایش برگه رسمی A4 -->
        <div class="letter-paper-wrap">
          <div class="official-letter-page" id="printable-unseal-letter">
            <!-- سربرگ رسمی -->
            <div class="letter-header">
              <div class="header-right">
                <p class="bismillah">بسمه تعالی</p>
                <h2 class="union-official-title">{{ unit?.union || 'اتحادیه صنفی اهواز' }}</h2>
                <p class="affiliated-sub">تحت نظارت اتاق اصناف اهواز</p>
              </div>

              <div class="header-center">
                <img :src="emblem" alt="لوگوی اتاق اصناف" class="letter-emblem" />
              </div>

              <div class="header-left">
                <p><strong>تاریخ:</strong> {{ letterDate }}</p>
                <p><strong>شماره:</strong> {{ letterNo }}</p>
                <p><strong>پیوست:</strong> صورتمجلس پلمپ</p>
              </div>
            </div>

            <div class="letter-divider"></div>

            <!-- گیرنده و موضوع نامه -->
            <div class="letter-addressee">
              <p class="to-text"><strong>به:</strong> فرماندهی محترم نظارت بر اماکن عمومی فراجا استان خوزستان / واحد اجرائیات اتاق اصناف اهواز</p>
              <p class="subject-text">
                <strong>موضوع:</strong> تقاضای
                <span class="highlight-request">«فک پلمپ و رفع اثر از احکام پلمپ واحد صنفی»</span>
                ماده ۲۷ و ۲۸ قانون نظام صنفی
              </p>
            </div>

            <!-- متن نامه نگارش‌شده -->
            <div class="letter-text-body">
              <p>سلام علیکم؛</p>
              <p class="par-body">
                {{ customBodyText }}
              </p>
            </div>

            <!-- جدول مشخصات تفصیلی واحد صنفی -->
            <table class="specs-table">
              <tbody>
                <tr>
                  <td class="td-label">نوع درخواست:</td>
                  <td class="td-val font-bold">
                    <span>[✔] فک پلمپ</span>
                  </td>
                  <td class="td-label">شناسه ساماندهی:</td>
                  <td class="td-val ltr-text font-bold">{{ trackingSmsId }}</td>
                </tr>
                <tr>
                  <td class="td-label">نام و نام خانوادگی متصدی:</td>
                  <td class="td-val font-bold">{{ unit?.operator }}</td>
                  <td class="td-label">کد ملی متصدی:</td>
                  <td class="td-val ltr-text">{{ unit?.nationalId }}</td>
                </tr>
                <tr>
                  <td class="td-label">نام تابلو واحد صنفی:</td>
                  <td class="td-val font-bold">{{ unit?.name }}</td>
                  <td class="td-label">شماره تلفن همراه:</td>
                  <td class="td-val ltr-text">{{ unit?.mobile }}</td>
                </tr>
                <tr>
                  <td class="td-label">رسته شغلی / اتحادیه:</td>
                  <td class="td-val">{{ unit?.union }}</td>
                  <td class="td-label">منطقه شهری:</td>
                  <td class="td-val">{{ unit?.region }}</td>
                </tr>
                <tr>
                  <td class="td-label">شماره صورتمجلس پلمپ:</td>
                  <td class="td-val font-bold ltr-text">{{ sealReportNo }} (مورخ {{ sealReportDate }})</td>
                  <td class="td-label">علت اولیه بازرسی:</td>
                  <td class="td-val">{{ unit?.violation || 'ماده ۲۷ قانون نظام صنفی' }}</td>
                </tr>
                <tr>
                  <td class="td-label">نشانی کامل محل کسب:</td>
                  <td colspan="3" class="td-val">{{ unit?.address }}</td>
                </tr>
              </tbody>
            </table>

            <!-- جعبه سوابق ممیزی و تغییرات -->
            <div class="audit-changes-section">
              <h5 class="audit-section-title">گزارش وضعیت و سوابق پرونده نظارتی:</h5>
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
                  واحد صنفی پس از اجرای پلمپ اماکن، با مراجعه حضوری به دبیرخانه نسبت به رفع موانع قانونی و اخذ مجوزات لازم اقدام نموده است.
                </p>
              </div>
            </div>

            <!-- اطلاعات مالی و رهگیری حقوقی -->
            <div class="financial-tracking-grid">
              <div class="fin-box">
                <span class="fin-label">علت صدور فک پلمپ:</span>
                <span class="fin-val font-bold">{{ unsealReason }}</span>
              </div>
              <div class="fin-box">
                <span class="fin-label">کد پیگیری احکام تجارت:</span>
                <span class="fin-val ltr-text">{{ commerceCode }}</span>
              </div>
              <div class="fin-box">
                <span class="fin-label">شماره فیش پرداخت جریمه / تسویه:</span>
                <span class="fin-val ltr-text font-bold">{{ fineTrackingNo }}</span>
              </div>
            </div>

            <!-- پیام راهنمای متصدی -->
            <div class="operator-guide-notice">
              <strong>راهنمای متصدی محترم:</strong>
              پس از امضا و ممهور شدن این نامه توسط اتاق اصناف و اتحادیه متبوع، نسخه رونوشت جهت اعزام اکیپ اجرای احکام پلیس نظارت بر اماکن عمومی به محل کسب شما ارجاع خواهد شد.
            </div>

            <!-- مهر و امضای رسمی دبیرخانه -->
            <div class="letter-footer">
              <div class="footer-qr">
                <QrCode class="qr-icon" />
                <span class="qr-caption">شناسه اعتبارسنجی: {{ trackingSmsId }}</span>
              </div>

              <div class="footer-signature">
                <p class="sign-title">رئیس / دبیر اجرایی اتاق اصناف و اتحادیه مربوطه</p>
                <p class="sign-name">مهر رسمی و امضای الکترونیک اجرائیات</p>
                <div class="stamp-placeholder">مهر و امضای اتاق اصناف اهواز</div>
              </div>
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
  font-size: 0.8125rem;

  &.ltr-input {
    direction: ltr;
    text-align: left;
    font-family: 'Vazirmatn', inherit, sans-serif;
  }

  &:focus {
    outline: none;
    border-color: #38bdf8;
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

.form-textarea {
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #475569;
  background-color: #0f172a;
  color: #ffffff;
  font-size: 0.8125rem;
  line-height: 1.5;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #38bdf8;
  }
}

.letter-paper-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background-color: #0b1120;
  display: flex;
  justify-content: center;
}

.official-letter-page {
  width: 210mm;
  min-height: 297mm;
  background-color: #ffffff;
  color: #0f172a;
  padding: 15mm 20mm;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  font-family: inherit;
  box-sizing: border-box;
}

.letter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .header-right {
    flex: 1;

    .bismillah {
      font-size: 9pt;
      margin: 0 0 0.25rem;
      font-weight: 600;
      color: #334155;
    }

    .union-official-title {
      font-size: 13pt;
      font-weight: 800;
      margin: 0;
      color: #0f172a;
    }

    .affiliated-sub {
      font-size: 8pt;
      margin: 0.2rem 0 0;
      color: #64748b;
    }
  }

  .header-center {
    flex-shrink: 0;
    padding: 0 1rem;

    .letter-emblem {
      width: 68px;
      height: 68px;
      object-fit: contain;
    }
  }

  .header-left {
    flex: 1;
    text-align: left;
    font-size: 8.5pt;
    line-height: 1.5;
    color: #1e293b;

    p {
      margin: 0;
    }
  }
}

.letter-divider {
  height: 2px;
  background: linear-gradient(to right, #0284c7, #0f172a, #0284c7);
  margin: 0.75rem 0 1.25rem;
}

.letter-addressee {
  margin-bottom: 1rem;

  .to-text {
    font-size: 10pt;
    margin: 0 0 0.35rem;
  }

  .subject-text {
    font-size: 10.5pt;
    margin: 0;

    .highlight-request {
      color: #0284c7;
      font-weight: 800;
    }
  }
}

.letter-text-body {
  font-size: 9.5pt;
  line-height: 1.75;
  text-align: justify;
  margin-bottom: 1rem;

  p {
    margin: 0 0 0.5rem;
  }
}

.specs-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.25rem;
  font-size: 8.5pt;

  td {
    border: 1px solid #cbd5e1;
    padding: 0.45rem 0.65rem;
  }

  .td-label {
    background-color: #f8fafc;
    font-weight: 600;
    width: 22%;
    color: #475569;
  }

  .td-val {
    color: #0f172a;
  }

  .ltr-text {
    direction: ltr;
    text-align: left;
  }

  .font-bold {
    font-weight: 700;
  }
}

.audit-changes-section {
  border: 1px dashed #94a3b8;
  border-radius: 4px;
  padding: 0.65rem 0.85rem;
  margin-bottom: 1.25rem;
  background-color: #f8fafc;

  .audit-section-title {
    margin: 0 0 0.4rem;
    font-size: 8.5pt;
    font-weight: 700;
    color: #334155;
  }

  .audit-box-content {
    font-size: 8pt;
    color: #475569;

    .audit-row {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.2rem;

      .audit-time {
        font-weight: 600;
      }
      .audit-user {
        color: #64748b;
      }
    }

    .text-muted-audit {
      margin: 0;
      color: #64748b;
      font-style: italic;
    }
  }
}

.financial-tracking-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.25rem;

  .fin-box {
    border: 1px solid #e2e8f0;
    background-color: #f8fafc;
    border-radius: 4px;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;

    .fin-label {
      font-size: 7.5pt;
      color: #64748b;
    }

    .fin-val {
      font-size: 8.5pt;
      color: #0f172a;
    }

    .ltr-text {
      direction: ltr;
      text-align: left;
    }

    .font-bold {
      font-weight: 700;
    }
  }
}

.operator-guide-notice {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 4px;
  padding: 0.6rem 0.85rem;
  color: #166534;
  font-size: 8pt;
  line-height: 1.5;
  margin-bottom: 1.5rem;
}

.letter-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 1.5rem;
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
  min-width: 200px;

  .sign-title {
    margin: 0;
    font-size: 9.5pt;
    font-weight: 700;
  }
  .sign-name {
    margin: 0.15rem 0 0.5rem;
    font-size: 8pt;
    color: #6b7280;
  }
  .stamp-placeholder {
    width: 130px;
    height: 70px;
    border: 1px dashed #9ca3af;
    border-radius: 50%;
    margin: 0 auto;
    display: grid;
    place-items: center;
    font-size: 7.5pt;
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

  .unseal-dialog-container,
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
  .unseal-order-detail-box,
  .legal-statement-box,
  .financial-tracking-grid,
  .operator-guide-notice,
  .letter-footer {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
</style>


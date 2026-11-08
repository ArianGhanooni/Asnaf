<script setup lang="ts">
import { ref } from 'vue';
import type { Unit } from 'src/types/asnaf';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import { useQuasar } from 'quasar';
import { fa } from 'src/utils/fa';
import emblem from 'src/assets/emblem.png';
import { Printer, CheckCircle2, X, ShieldAlert, QrCode } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: boolean;
  unit: Unit | null;
  mode: 'seal_order' | 'resolution'; // دستور پلمپ یا تایید فک پلمپ/منع پیگیری
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirmed'): void;
}>();

const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

const orderLetterNo = ref(`۱۴۰۵/اج/${Math.floor(10000 + Math.random() * 90000)}`);
const orderDate = ref('۱۴۰۵/۰۸/۰۵');
const amakenChief = ref('جناب سرهنگ اسدی، رئیس محترم اداره نظارت بر اماکن عمومی ف.ا.ا خوزستان');
const finePaymentMethod = ref('سامانه پرداخت پایا / شبا بانک ملی');
const fineTracking = ref(props.unit?.fineTrackingCode || `IR-P27-${Math.floor(10000000 + Math.random() * 90000000)}`);

function printLetter(): void {
  window.print();
}

function handleConfirm(): void {
  if (!props.unit) return;

  const user = sessionStore.session?.name ?? 'کاربر اتاق اصناف اهواز';

  if (props.mode === 'seal_order') {
    unitsStore.issueChamberSealOrder(props.unit.id, orderLetterNo.value, user);
    $q.notify({
      type: 'positive',
      message: `دستور رسمی پلمپ به شماره ${orderLetterNo.value} صادر و به اداره اماکن ابلاغ شد.`,
      position: 'top',
    });
  } else {
    const resType = props.unit.status === 'sealed' ? 'unseal' : 'dismissal';
    unitsStore.approveChamberResolution(props.unit.id, resType, orderLetterNo.value, user);
    $q.notify({
      type: 'positive',
      message: `نامه رسمی ${resType === 'unseal' ? 'فک پلمپ' : 'منع پیگیری'} تایید، ممهور به مهر اجرائیات و ابلاغ گردید.`,
      position: 'top',
    });
  }

  emit('confirmed');
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
    <div class="chamber-order-container" dir="rtl" data-testid="chamber-amaken-order-dialog">
      <!-- Top Action Bar -->
      <div class="top-bar no-print">
        <div class="top-bar-info">
          <ShieldAlert class="top-icon" />
          <div>
            <h3 class="top-title">
              {{ mode === 'seal_order' ? 'صدور رسمی دستور پلمپ اتاق اصناف به اداره اماکن' : 'تایید نهایی و ابلاغ نامه رفع تعقیب / فک پلمپ به اماکن' }}
            </h3>
            <p v-if="unit" class="top-sub">
              واحد: {{ unit.name }} · متصدی: {{ unit.operator }} (شماره پرونده: {{ fa(unit.id) }})
            </p>
          </div>
        </div>

        <div class="top-actions">
          <button type="button" class="btn-print" @click="printLetter">
            <Printer class="icon-sm" />
            <span>چاپ سربرگ رسمی (A4)</span>
          </button>
          <button type="button" class="btn-confirm" @click="handleConfirm">
            <CheckCircle2 class="icon-sm" />
            <span>{{ mode === 'seal_order' ? 'امضا، ممهور و ابلاغ به اماکن' : 'تایید و ابلاغ فک پلمپ / منع پیگیری' }}</span>
          </button>
          <button type="button" class="btn-close" @click="emit('update:modelValue', false)">
            <X class="icon-sm" />
          </button>
        </div>
      </div>

      <!-- Main Layout -->
      <div class="main-body">
        <!-- Settings Sidebar -->
        <div class="settings-pane no-print">
          <div class="pane-card">
            <h4 class="pane-title">تنظیمات دبیرخانه و امضای اجرائیات</h4>

            <div class="form-group">
              <label class="form-label">شماره نامه ابلاغیه اجرائیات:</label>
              <input v-model="orderLetterNo" type="text" class="form-input ltr-input" />
            </div>

            <div class="form-group">
              <label class="form-label">مقام مخاطب انتظامی:</label>
              <input v-model="amakenChief" type="text" class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">روش پرداخت جریمه ماده ۲۷:</label>
              <input v-model="finePaymentMethod" type="text" class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">شماره پیگیری تراکنش بانکی جریمه:</label>
              <input v-model="fineTracking" type="text" class="form-input ltr-input" />
            </div>
          </div>
        </div>

        <!-- A4 Printable Paper Preview -->
        <div class="letter-paper-wrap">
          <div class="official-letter-page" id="chamber-printable-letter">
            <!-- Header -->
            <div class="letter-header">
              <div class="header-right">
                <p class="bismillah">جمهوری اسلامی ایران</p>
                <h2 class="chamber-official-title">اتاق اصناف اهواز</h2>
                <p class="unit-sub">واحد اجرائیات و نظارت بر احکام صنفی</p>
              </div>

              <div class="header-center">
                <img :src="emblem" alt="نشان رسمی اتاق اصناف اهواز" class="letter-emblem" />
              </div>

              <div class="header-left">
                <p><strong>تاریخ:</strong> {{ orderDate }}</p>
                <p><strong>شماره پرونده:</strong> {{ fa(unit?.id || 14152) }}</p>
                <p><strong>شماره ابلاغیه:</strong> {{ orderLetterNo }}</p>
              </div>
            </div>

            <div class="chamber-divider"></div>

            <!-- Addressee -->
            <div class="letter-addressee">
              <p class="chief-recipient">{{ amakenChief }}</p>
              <p class="subject-line">
                <strong>موضوع:</strong>
                {{ mode === 'seal_order' ? 'دستور رسمی اجرای پلمپ واحد صنفی متخلف (ماده ۲۷ و ۲۸ قانون نظام صنفی)' : 'دستور فک پلمپ و منع پیگیری با موافقت اتحادیه و تایید اتاق اصناف' }}
              </p>
            </div>

            <!-- Operator and QR Strip -->
            <div class="operator-meta-banner">
              <div>
                <p class="op-title">متصدی پرونده: <strong>{{ unit?.operator }}</strong></p>
                <p class="op-sub">کد ملی: {{ unit?.nationalId }} · تلفن همراه: {{ unit?.mobile }}</p>
              </div>
              <div class="qr-judicial">
                <QrCode class="qr-judicial-icon" />
                <span>اعتبارسنجی قضایی</span>
              </div>
            </div>

            <!-- Legal Text Body -->
            <div class="legal-text-body">
              <p>سلام علیکم؛</p>
              <template v-if="mode === 'seal_order'">
                <p class="par">
                  احتراماً، پیرو گزارش بازرسی‌های میدانی و اخطارهای قانونی ابلاغ‌شده (اخطار اولیه و ثانویه) و با عنایت به انقضای مهلت‌های مقرر قانونی و عدم تمکین و مراجعه متصدی واحد صنفی فوق‌الذکر جهت اخذ پروانه کسب معتبر، مستنداً به ماده ۲۷ قانون نظام صنفی، دستور فرمایید با اعزام مأمورین آن اداره محترم نسبت به <strong>اجرای فوری حکم پلمپ و تعطیلی محل کسب</strong> اقدام و صورتمجلس تنظیمی را به این واحد ارسال فرمایند.
                </p>
              </template>
              <template v-else>
                <p class="par">
                  احتراماً، پیرو مکاتبه اتحادیه متبوع و با عنایت به رفع کامل تخلفات، تودیع جرائم ماده ۲۷ و اخذ تعهدات قانونی لازم از مشارالیه، خواهشمند است دستور فرمایید نسبت به <strong>فک پلمپ و منع تعقیب انتظامی</strong> واحد مذکور اقدام لازم معمول و از نتیجه این اتاق را مطلع فرمایند.
                </p>
              </template>
            </div>

            <!-- Unit Specs Table -->
            <table class="chamber-table">
              <tbody>
                <tr>
                  <td class="col-lbl">نام تابلو واحد صنفی:</td>
                  <td class="col-val font-bold">{{ unit?.name }}</td>
                  <td class="col-lbl">اتحادیه متبوع:</td>
                  <td class="col-val">{{ unit?.union }}</td>
                </tr>
                <tr>
                  <td class="col-lbl">منطقه شهرداری:</td>
                  <td class="col-val">{{ unit?.region }}</td>
                  <td class="col-lbl">موضوع تخلف انتسابی:</td>
                  <td class="col-val text-destructive font-bold">{{ unit?.violation }}</td>
                </tr>
                <tr>
                  <td class="col-lbl">نشانی دقیق محل کسب:</td>
                  <td colspan="3" class="col-val">{{ unit?.address }}</td>
                </tr>
              </tbody>
            </table>

            <!-- Financial Box for Article 27 Fine -->
            <div class="fine-payment-box">
              <h5 class="box-title">مشخصات پرداختی جریمه ماده ۲۷ قانون نظام صنفی:</h5>
              <div class="fine-details-row">
                <div class="fine-item">
                  <span class="fine-lbl">روش پرداخت:</span>
                  <span class="fine-txt font-bold">{{ finePaymentMethod }}</span>
                </div>
                <div class="fine-item">
                  <span class="fine-lbl">شماره پیگیری تراکنش:</span>
                  <span class="fine-txt ltr-text font-bold">{{ fineTracking }}</span>
                </div>
              </div>
            </div>

            <!-- Action Status Checks -->
            <div class="order-action-checks">
              <span class="action-check-item">
                <span class="box-check">{{ mode === 'seal_order' ? '✔' : ' ' }}</span>
                دستور اجرای پلمپ و تعطیلی محل کسب
              </span>
              <span class="action-check-item">
                <span class="box-check">{{ mode !== 'seal_order' ? '✔' : ' ' }}</span>
                فک پلمپ و منع پیگیری انتظامی
              </span>
            </div>

            <!-- Signatures and Blue Ink Official Stamp -->
            <div class="chamber-signatures">
              <div class="sig-col">
                <p class="sig-title">رئیس اتاق اصناف اهواز</p>
                <p class="sig-name">مراد مروانی</p>
                <div class="signature-line">امضاء رسمی ریاست</div>
              </div>

              <!-- Official Blue Stamp -->
              <div class="official-blue-stamp">
                <div class="stamp-outer-ring">
                  <div class="stamp-inner-ring">
                    <p class="stamp-top">اتاق اصناف اهواز</p>
                    <p class="stamp-center">واحد اجرائیات</p>
                    <p class="stamp-bottom">★ نظارت بر اماکن ★</p>
                  </div>
                </div>
              </div>

              <div class="sig-col">
                <p class="sig-title">مسئول واحد اجرائیات و احکام</p>
                <p class="sig-name">سجاد فتاحی</p>
                <div class="signature-line">مهر و ثبت دبیرخانه</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.chamber-order-container {
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
    color: #ef4444;
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

  &:hover {
    background-color: #475569;
  }
}

.btn-confirm {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1.25rem;
  border-radius: var(--radius-md, 0.375rem);
  border: none;
  background-color: #2563eb;
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;

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
  font-family: inherit;
  font-size: 0.875rem;

  &.ltr-input {
    direction: ltr;
    text-align: left;
    font-family: 'Vazirmatn', inherit, sans-serif;
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
}

.header-right {
  flex: 1;

  .bismillah {
    margin: 0;
    font-size: 9.5pt;
    font-weight: 700;
    color: #4b5563;
  }

  .chamber-official-title {
    margin: 0.2rem 0 0;
    font-size: 14pt;
    font-weight: 800;
    color: #1e3a8a;
  }

  .unit-sub {
    margin: 0.1rem 0 0;
    font-size: 9.5pt;
    color: #4b5563;
  }
}

.header-center {
  padding: 0 1rem;

  .letter-emblem {
    width: 70px;
    height: 70px;
    object-fit: contain;
  }
}

.header-left {
  font-size: 9.5pt;
  line-height: 1.5;
  text-align: left;
  direction: rtl;

  p {
    margin: 0;
  }
}

.chamber-divider {
  height: 2px;
  background: linear-gradient(90deg, #1e3a8a 0%, #dc2626 50%, #1e3a8a 100%);
  margin: 0.75rem 0 1.25rem;
}

.letter-addressee {
  margin-bottom: 1rem;

  .chief-recipient {
    font-size: 11.5pt;
    font-weight: 700;
    margin: 0 0 0.35rem;
    color: #0f172a;
  }

  .subject-line {
    margin: 0;
    font-size: 10.5pt;
  }
}

.operator-meta-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 0.6rem 0.85rem;
  margin-bottom: 1rem;

  .op-title {
    margin: 0;
    font-size: 11pt;
  }

  .op-sub {
    margin: 0.15rem 0 0;
    font-size: 9pt;
    color: #64748b;
  }

  .qr-judicial {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;

    .qr-judicial-icon {
      width: 48px;
      height: 48px;
      color: #0f172a;
    }

    span {
      font-size: 7.5pt;
      color: #64748b;
    }
  }
}

.legal-text-body {
  text-align: justify;
  margin-bottom: 1rem;

  p {
    margin: 0 0 0.5rem;
  }

  .par {
    text-indent: 1.5rem;
    line-height: 1.7;
  }
}

.chamber-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
  font-size: 9.5pt;

  td {
    border: 1px solid #cbd5e1;
    padding: 0.45rem 0.6rem;
  }

  .col-lbl {
    background-color: #f1f5f9;
    font-weight: 700;
    color: #334155;
    width: 22%;
  }

  .col-val {
    color: #0f172a;
  }
}

.fine-payment-box {
  border: 1px solid #cbd5e1;
  background-color: #f8fafc;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 1rem;

  .box-title {
    margin: 0 0 0.35rem;
    font-size: 9pt;
    font-weight: 700;
    color: #0f172a;
  }

  .fine-details-row {
    display: flex;
    gap: 2rem;
  }

  .fine-item {
    font-size: 9pt;

    .fine-lbl {
      color: #64748b;
      margin-inline-end: 0.35rem;
    }
  }
}

.order-action-checks {
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
  padding: 0.5rem;
  background-color: #f1f5f9;
  border-radius: 4px;
  font-size: 9.5pt;
  font-weight: 700;

  .box-check {
    display: inline-grid;
    place-items: center;
    width: 1.25rem;
    height: 1.25rem;
    border: 1px solid #475569;
    border-radius: 3px;
    background-color: #ffffff;
    margin-inline-end: 0.35rem;
  }
}

.chamber-signatures {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2rem;
  position: relative;
}

.sig-col {
  text-align: center;
  min-width: 140px;

  .sig-title {
    margin: 0;
    font-size: 9.5pt;
    font-weight: 700;
  }
  .sig-name {
    margin: 0.15rem 0 0.5rem;
    font-size: 8.5pt;
    color: #64748b;
  }
  .signature-line {
    font-size: 7.5pt;
    color: #94a3b8;
    border-top: 1px dashed #cbd5e1;
    padding-top: 0.25rem;
  }
}

/* مهر استامپ آبی‌رنگ رسمی اتاق اصناف اهواز - واحد اجرائیات */
.official-blue-stamp {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  position: relative;
  transform: rotate(-12deg);
  opacity: 0.92;

  .stamp-outer-ring {
    width: 100%;
    height: 100%;
    border: 3px double #1d4ed8; // رنگ استامپ آبی پررنگ
    border-radius: 50%;
    display: grid;
    place-items: center;
  }

  .stamp-inner-ring {
    width: 82%;
    height: 82%;
    border: 1.5px dashed #1d4ed8;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #1d4ed8;
    font-weight: 800;
    text-align: center;
    line-height: 1.15;
  }

  .stamp-top {
    font-size: 7.5pt;
    margin: 0;
  }
  .stamp-center {
    font-size: 8.5pt;
    margin: 0.1rem 0;
    border-top: 1px solid #1d4ed8;
    border-bottom: 1px solid #1d4ed8;
    padding: 0.1rem 0.25rem;
  }
  .stamp-bottom {
    font-size: 6.5pt;
    margin: 0;
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

  .order-dialog-container,
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
  .seal-order-detail-box,
  .amaken-instruction-box,
  .chamber-tracking-grid,
  .letter-footer {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
</style>

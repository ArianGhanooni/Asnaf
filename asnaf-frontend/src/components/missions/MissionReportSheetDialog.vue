<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import type { Mission, MissionCompletionReport } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import emblem from 'src/assets/emblem.png';
import {
  X,
  Printer,
  CheckCircle2,
  Send,
  QrCode,
  Edit3,
  Building2,
  FileCheck2,
} from 'lucide-vue-next';

interface Props {
  readonly modelValue: boolean;
  readonly mission: Mission | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'updated', mission: Mission): void;
}>();

const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

const isInspector = computed(() => sessionStore.session?.role === 'inspector');
const isUnion = computed(() => sessionStore.session?.role === 'union');
const isChamber = computed(() => sessionStore.session?.role === 'general');
const currentUser = computed(() => sessionStore.session?.name ?? 'بازرس اصناف');

// فیلدهای فرم اداری و قابل ویرایش
const letterNumber = ref<string>('');
const letterDate = ref<string>('۱۴۰۵/۰۸/۰۵');
const recipient = ref<string>('به: ریاست محترم اتاق اصناف و کمیسیون نظارت شهرستان اهواز');
const subject = ref<string>('');
const findings = ref<string>('');
const actionTaken = ref<string>('');
const notes = ref<string>('');
const isSubmitting = ref<boolean>(false);

// بارگذاری اطلاعات ماموریت
watch(
  () => [props.modelValue, props.mission],
  ([isOpen]) => {
    if (isOpen && props.mission) {
      const m = props.mission;
      letterNumber.value =
        m.completionReport?.letterNumber ||
        `۱۴۰۵/ص/${m.id}`;
      letterDate.value =
        m.completionReport?.letterDate ||
        '۱۴۰۵/۰۸/۰۵';
      recipient.value =
        m.completionReport?.recipient ||
        `به: ریاست محترم ${m.union} و کمیسیون نظارت اتاق اصناف اهواز`;
      subject.value =
        m.completionReport?.subject ||
        `گزارش نهایی بازرسی و پایان مأموریت واحد صنفی «${m.targetUnit || m.place}»`;
      findings.value =
        m.completionReport?.findings ||
        `پیرو مأموریت کد ${m.id}، بازرسی میدانی در تاریخ فوق از واحد صنفی «${m.targetUnit || m.place}» واقع در ${m.place} به عمل آمد. وضعیت پروانه کسب، تطبیق نرخ‌نامه مصوب و ضوابط صنفی بررسی گردید.`;
      actionTaken.value =
        m.completionReport?.actionTaken ||
        (m.source === 'simba_complaint'
          ? `رسیدگی کامل به موضوع شکایت سامانه سیمبا (کد رهگیری ${m.simbaCode || '—'}) انجام پذیرفته و تذکرات لازم جهت رفع ابهام و رضایت شاکی ابلاغ گردید.`
          : 'بررسی ضوابط انتظامی و صنفی انجام شد و وضعیت واحد جهت ثبت نهایی در پرونده الکترونیک به اتحادیه ارسال می‌گردد.');
      notes.value =
        m.completionReport?.notes ||
        m.notes ||
        'اقدامات لازم جهت تطبیق با مقررات نظام صنفی انجام شد.';
    }
  },
  { immediate: true }
);

function close(): void {
  emit('update:modelValue', false);
}

// بازرس: ثبت گزارش و اعلام پایان مأموریت
function submitInspectorReport(): void {
  if (!props.mission) return;
  isSubmitting.value = true;
  try {
    const report: MissionCompletionReport = {
      letterNumber: letterNumber.value,
      letterDate: letterDate.value,
      recipient: recipient.value,
      subject: subject.value,
      findings: findings.value,
      actionTaken: actionTaken.value,
      notes: notes.value,
      submittedBy: currentUser.value,
      submittedAt: '۱۴۰۵/۰۸/۰۵ ۱۱:۳۰',
    };

    unitsStore.submitMissionReport(props.mission.id, report, currentUser.value);

    $q.notify({
      type: 'positive',
      message: 'گزارش مأموریت با موفقیت ثبت شد و جهت تأیید به اتحادیه مربوطه ارسال گردید.',
      position: 'top',
    });

    emit('updated', props.mission);
    close();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در ثبت گزارش مأموریت';
    $q.notify({ type: 'negative', message: msg, position: 'top' });
  } finally {
    isSubmitting.value = false;
  }
}

// اتحادیه یا اتاق اصناف: تأیید پایان مأموریت
function approveReport(): void {
  if (!props.mission) return;
  isSubmitting.value = true;
  try {
    unitsStore.approveMissionReport(props.mission.id, currentUser.value);

    $q.notify({
      type: 'positive',
      message: 'مأموریت توسط اتحادیه تأیید شد و اعلان نهایی برای اتاق اصناف ارسال گردید.',
      position: 'top',
    });

    emit('updated', props.mission);
    close();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در تأیید مأموریت';
    $q.notify({ type: 'negative', message: msg, position: 'top' });
  } finally {
    isSubmitting.value = false;
  }
}

function handlePrint(): void {
  window.print();
}
</script>

<template>
  <q-dialog
    :model-value="modelValue"
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="report-sheet-dialog" dir="rtl" data-testid="mission-report-sheet-dialog">
      <!-- نوار ابزار بالا -->
      <header class="dialog-top-bar">
        <div class="top-bar-title-wrap">
          <div class="title-icon-box">
            <FileCheck2 class="icon-md" />
          </div>
          <div>
            <h2 class="top-bar-title">نامه اداری و گزارش رسمی پایان مأموریت</h2>
            <p class="top-bar-subtitle">
              مأموریت کد {{ fa(mission?.id ?? 0) }} · واحد {{ mission?.targetUnit || mission?.place }} ({{ mission?.union }})
            </p>
          </div>
        </div>

        <div class="top-bar-actions">
          <button
            type="button"
            class="action-btn-print"
            @click="handlePrint"
            data-testid="print-mission-sheet-btn"
          >
            <Printer class="icon-xs" />
            <span>چاپ برگه A4</span>
          </button>

          <!-- دکمه ثبت گزارش بازرس -->
          <button
            v-if="isInspector || mission?.status === 'active'"
            type="button"
            class="action-btn-submit"
            @click="submitInspectorReport"
            :disabled="isSubmitting"
            data-testid="submit-mission-report-btn"
          >
            <Send class="icon-xs" />
            <span>تحویل گزارش و اعلام پایان مأموریت</span>
          </button>

          <!-- دکمه تایید پایان توسط اتحادیه یا اتاق -->
          <button
            v-if="(isUnion || isChamber) && mission?.status === 'pending_approval'"
            type="button"
            class="action-btn-approve"
            @click="approveReport"
            :disabled="isSubmitting"
            data-testid="approve-mission-report-btn"
          >
            <CheckCircle2 class="icon-xs" />
            <span>تأیید پایان مأموریت (ارسال اعلان به اتاق)</span>
          </button>

          <button
            type="button"
            class="action-btn-close"
            @click="close"
            aria-label="بستن"
            data-testid="close-report-dialog-btn"
          >
            <X class="icon-sm" />
          </button>
        </div>
      </header>

      <!-- محتوای دوسطحی: فرم ویرایش در راست، برگه A4 در چپ -->
      <main class="dialog-main-content">
        <!-- ستون سمت راست: پنل ویرایش مقادیر گزارش -->
        <aside class="edit-pane no-print">
          <div class="pane-header">
            <Edit3 class="icon-xs" />
            <span>تنظیم و ویرایش محتوای نامه رسمی</span>
          </div>

          <div class="edit-fields-list">
            <div class="field-item">
              <label class="field-label">شماره نامه رسمی:</label>
              <input v-model="letterNumber" type="text" class="field-input" data-testid="edit-letter-no" />
            </div>

            <div class="field-item">
              <label class="field-label">تاریخ صدور:</label>
              <input v-model="letterDate" type="text" class="field-input" data-testid="edit-letter-date" />
            </div>

            <div class="field-item">
              <label class="field-label">مخاطب نامه (گیرنده):</label>
              <input v-model="recipient" type="text" class="field-input" data-testid="edit-recipient" />
            </div>

            <div class="field-item">
              <label class="field-label">موضوع گزارش:</label>
              <input v-model="subject" type="text" class="field-input" data-testid="edit-subject" />
            </div>

            <div class="field-item">
              <label class="field-label">یافته‌های بازرسی میدانی:</label>
              <textarea v-model="findings" rows="4" class="field-textarea" data-testid="edit-findings" />
            </div>

            <div class="field-item">
              <label class="field-label">اقدامات انجام‌شده و نتیجه تخلف:</label>
              <textarea v-model="actionTaken" rows="3" class="field-textarea" data-testid="edit-action" />
            </div>

            <div class="field-item">
              <label class="field-label">توضیحات تکمیلی و جمع‌بندی:</label>
              <textarea v-model="notes" rows="2" class="field-textarea" data-testid="edit-notes" />
            </div>
          </div>
        </aside>

        <!-- ستون سمت چپ: برگه اداری قابل پرینت A4 -->
        <section class="preview-pane">
          <div class="a4-sheet" id="printable-mission-report">
            <!-- سربرگ رسمی -->
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
                <p>پیوست: <strong>دارد (مستندات بازرسی)</strong></p>
              </div>
            </div>

            <div class="sheet-divider" />

            <!-- مخاطب و موضوع -->
            <div class="sheet-recipient">
              <p class="recipient-title">{{ recipient }}</p>
              <p class="recipient-subject">
                موضوع: <strong>{{ subject }}</strong>
              </p>
            </div>

            <!-- بدنه گزارش -->
            <div class="sheet-body">
              <p>سلام علیکم؛</p>
              <p class="paragraph">
                احتراماً، پیرو اعزام و صدور مأموریت بازرسی شماره <strong>{{ fa(mission?.id ?? 0) }}</strong>
                مربوط به واحد صنفی <strong>«{{ mission?.targetUnit || mission?.place }}»</strong>
                تحت نظارت <strong>{{ mission?.union }}</strong>
                ${
                  mission?.operatorName
                    ? `و تصدی آقای/خانم <strong>${mission.operatorName}</strong>`
                    : ''
                }
                مستقر در آدرس <em>{{ mission?.place }} · {{ mission?.region }}</em>، گزارش اقدامات میدانی به شرح ذیل به استحضار می‌رسد:
              </p>

              <div class="report-section-box">
                <h4 class="section-box-title">۱. مشروح مشاهدات و یافته‌های بازرس میدانی:</h4>
                <p class="section-box-text">{{ findings }}</p>
              </div>

              <div class="report-section-box">
                <h4 class="section-box-title">۲. اقدامات صورت‌گرفته و تعیین تکلیف پرونده:</h4>
                <p class="section-box-text">{{ actionTaken }}</p>
              </div>

              <p class="paragraph">
                {{ notes }}
              </p>

              <p class="paragraph">
                علی‌هذا مراتب جهت درج در سامانه جامع نظارت، پایان فرایند مأموریت و انعکاس نتیجه به مراجع ذی‌ربط
                ${mission?.simbaCode ? `(از جمله بازخورد سیستمی به درگاه شکایات سیمبا با کد رهگیری <strong>${mission.simbaCode}</strong>)` : ''}
                تقدیم می‌گردد.
              </p>
            </div>

            <!-- امضاها و تأییدیه‌ها -->
            <div class="sheet-signatures">
              <div class="qr-box">
                <QrCode class="qr-icon" />
                <span class="qr-text">شناسه اعتبارسنجی اصناف:<br />{{ letterNumber }}</span>
              </div>

              <div class="sign-box">
                <p class="sign-title">بازرس مأمور کمیسیون نظارت</p>
                <p class="sign-role">{{ mission?.inspector || currentUser }}</p>
                <div class="sign-placeholder">
                  <span>[امضا و گزارش ثبت‌شده]</span>
                </div>
              </div>

              <div class="sign-box">
                <p class="sign-title">ریاست محترم {{ mission?.union }}</p>
                <p class="sign-role">و نماینده کمیسیون نظارت شهرستان اهواز</p>
                <div class="sign-placeholder">
                  <span>{{ mission?.status === 'done' ? '[مهر و تأیید نهایی اتحادیه]' : '[در انتظار تأیید اتحادیه]' }}</span>
                </div>
              </div>
            </div>

            <!-- پانوشت -->
            <div class="sheet-footer">
              <p>رونوشت: مدیریت محترم بازرسی و نظارت اصناف اهواز / اداره نظارت بر اماکن عمومی فراجا / بایگانی کمیسیون.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.report-sheet-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--background);
  color: var(--foreground);
}

.dialog-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-block: 0.875rem;
  padding-inline: 1.5rem;
  background-color: var(--card);
  border-bottom: 1px solid var(--border);
  gap: 1rem;
  flex-wrap: wrap;
}

.top-bar-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title-icon-box {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-md);
  background-color: oklch(from var(--primary) l c h / 12%);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.top-bar-title {
  font-size: 1.0625rem;
  font-weight: 700;
  margin: 0;
}

.top-bar-subtitle {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0.15rem 0 0;
}

.top-bar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-inline-start: auto;
}

.action-btn-print {
  height: 2.25rem;
  padding-inline: 0.875rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--muted);
  color: var(--foreground);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;

  &:hover {
    background-color: var(--card);
    border-color: var(--primary);
  }
}

.action-btn-submit {
  height: 2.25rem;
  padding-inline: 1rem;
  border-radius: var(--radius-md);
  border: none;
  background-color: #2563eb;
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;

  &:hover:not(:disabled) {
    background-color: #1d4ed8;
  }
}

.action-btn-approve {
  height: 2.25rem;
  padding-inline: 1rem;
  border-radius: var(--radius-md);
  border: none;
  background-color: #059669;
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;

  &:hover:not(:disabled) {
    background-color: #047857;
  }
}

.action-btn-close {
  background: transparent;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  padding: 0.35rem;
  border-radius: var(--radius-md);

  &:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }
}

.dialog-main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 340px 1fr;
  overflow: hidden;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
}

.edit-pane {
  background-color: var(--card);
  border-inline-end: 1px solid var(--border);
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pane-header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--primary);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}

.edit-fields-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.field-input,
.field-textarea {
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--background);
  color: var(--foreground);
  padding: 0.5rem 0.65rem;
  font-size: 0.8125rem;
  font-family: inherit;
  outline: none;

  &:focus {
    border-color: var(--primary);
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
  padding: 18mm 18mm;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  line-height: 1.8;
  font-family: inherit;
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
  margin: 0.875rem 0;
}

.sheet-recipient {
  margin: 0.75rem 0 1.25rem;

  .recipient-title {
    font-size: 0.9375rem;
    font-weight: 700;
    margin: 0;
  }

  .recipient-subject {
    font-size: 0.875rem;
    margin: 0.35rem 0 0;
    color: #1e293b;
  }
}

.sheet-body {
  font-size: 0.875rem;
  color: #1e293b;

  .paragraph {
    margin-top: 0.75rem;
    text-align: justify;
    text-indent: 1.25rem;
    line-height: 1.75;
  }
}

.report-section-box {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 0.65rem 0.875rem;
  margin-top: 0.75rem;

  .section-box-title {
    font-size: 0.8125rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 0.25rem;
  }

  .section-box-text {
    font-size: 0.8125rem;
    color: #334155;
    margin: 0;
    line-height: 1.6;
  }
}

.sheet-signatures {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 1rem;
}

.qr-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px dashed #94a3b8;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;

  .qr-icon {
    width: 2.25rem;
    height: 2.25rem;
    color: #0f172a;
  }

  .qr-text {
    font-size: 0.6875rem;
    color: #475569;
    line-height: 1.3;
  }
}

.sign-box {
  text-align: center;

  .sign-title {
    font-size: 0.8125rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
  }

  .sign-role {
    font-size: 0.6875rem;
    color: #64748b;
    margin: 0.15rem 0 0;
  }

  .sign-placeholder {
    margin-top: 1.25rem;
    font-size: 0.75rem;
    color: #94a3b8;
    font-style: italic;
  }
}

.sheet-footer {
  border-top: 1px solid #e2e8f0;
  padding-top: 0.65rem;
  margin-top: 1.5rem;
  font-size: 0.6875rem;
  color: #64748b;
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

@media print {
  body * {
    visibility: hidden;
  }
  .no-print {
    display: none !important;
  }
  #printable-mission-report,
  #printable-mission-report * {
    visibility: visible;
  }
  #printable-mission-report {
    position: absolute;
    inset-inline-start: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 15mm;
    box-shadow: none;
  }
}
</style>

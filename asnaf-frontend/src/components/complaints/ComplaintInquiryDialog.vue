<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useUnitsStore } from 'src/stores/units';
import type { Complaint } from 'src/types/asnaf';
import { complaintStageLabels } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  MapPin,
  Send,
  Building2,
  Phone,
  User,
  ShieldAlert,
  X,
  ExternalLink,
} from 'lucide-vue-next';

interface Props {
  readonly modelValue: boolean;
  readonly defaultTrackingCode?: string;
}

const props = withDefaults(defineProps<Props>(), {
  defaultTrackingCode: '',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const unitsStore = useUnitsStore();
const searchQuery = ref('');
const selectedComplaint = ref<Complaint | null>(null);

watch(
  () => props.defaultTrackingCode,
  (code) => {
    if (code) {
      searchQuery.value = code;
      searchCode(code);
    }
  },
  { immediate: true }
);

watch(
  () => props.modelValue,
  (val) => {
    if (val && props.defaultTrackingCode) {
      searchQuery.value = props.defaultTrackingCode;
      searchCode(props.defaultTrackingCode);
    } else if (val && !selectedComplaint.value && unitsStore.complaints.length > 0) {
      selectedComplaint.value = unitsStore.complaints[0] ?? null;
      if (selectedComplaint.value) {
        searchQuery.value = selectedComplaint.value.trackingCode;
      }
    }
  }
);

function searchCode(codeToSearch?: string): void {
  const query = (codeToSearch ?? searchQuery.value).trim();
  if (!query) {
    selectedComplaint.value = null;
    return;
  }
  const found = unitsStore.getComplaintByTracking(query);
  selectedComplaint.value = found ?? null;
}

function closeDialog(): void {
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
    <div class="inquiry-dialog-card" dir="rtl" data-testid="complaint-inquiry-modal">
      <!-- نوار بالای مودال با نمایش کد پرونده سیمبا و دکمه بستن -->
      <div class="inquiry-top-bar">
        <div class="simba-identity-wrap">
          <div class="simba-brand-badge">
            <span class="simba-badge-pill">سامانه سیمبا</span>
            <span class="simba-brand-sub">bazras360</span>
          </div>

          <div v-if="selectedComplaint" class="simba-code-pill" data-testid="top-simba-tracking-code">
            <span class="simba-code-label">کد رهگیری سیمبا:</span>
            <strong class="simba-code-value">{{ fa(selectedComplaint.trackingCode) }}</strong>
            <span class="simba-stage-tag" :class="`stage-${selectedComplaint.stage}`">
              {{ complaintStageLabels[selectedComplaint.stage] }}
            </span>
          </div>

          <div v-else-if="searchQuery" class="simba-code-pill">
            <span class="simba-code-label">کد در حال استعلام:</span>
            <strong class="simba-code-value">{{ fa(searchQuery) }}</strong>
          </div>
        </div>

        <button
          type="button"
          class="dialog-close-btn"
          @click="closeDialog"
          data-testid="close-inquiry-modal-btn"
          aria-label="بستن پنجره"
        >
          <X class="icon-sm" />
        </button>
      </div>

      <!-- Main Search & Results Content -->
      <div class="dialog-scroll-body">
        <!-- Search Input Bar -->
        <div class="search-section shadow-card">
          <form class="search-input-form" @submit.prevent="searchCode()">
            <Search class="search-field-icon" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="شماره پیگیری شکایت (سیمبا)، شماره همراه یا نام واحد..."
              class="inquiry-search-input"
              data-testid="inquiry-search-input"
            />
            <button
              type="submit"
              class="search-submit-btn"
              data-testid="inquiry-search-btn"
            >
              استعلام پرونده
            </button>
          </form>

        </div>

        <!-- No complaint selected message -->
        <div v-if="!selectedComplaint" class="empty-inquiry-state">
          <AlertCircle class="empty-icon" />
          <p class="empty-text">پرونده‌ای با این شماره پیگیری یافت نشد یا هنوز کدی وارد نشده است.</p>
          <p class="empty-subtext">لطفاً کد رهگیری معتبر شکایت را در کادر بالا وارد کرده و دکمه استعلام پرونده را بزنید.</p>
        </div>

        <!-- Complaint Dossier & Stepper -->
        <div v-else class="complaint-details-grid">
          <!-- Right Column: Case Summary & Metadata -->
          <div class="dossier-card shadow-card">
            <div class="dossier-header">
              <div class="tracking-banner">
                <span class="tracking-label">کد رهگیری سیمبا:</span>
                <span class="tracking-code-val" data-testid="inquiry-tracking-code">{{ fa(selectedComplaint.trackingCode) }}</span>
              </div>
              <div class="stage-tag" :class="`stage-${selectedComplaint.stage}`">
                {{ complaintStageLabels[selectedComplaint.stage] }}
              </div>
            </div>

            <div class="dossier-content-block">
              <h3 class="unit-heading">
                <Building2 class="icon-sm text-primary" />
                <span>{{ selectedComplaint.unitName }}</span>
              </h3>
              <p class="union-text">{{ selectedComplaint.unionName }} · {{ selectedComplaint.region }}</p>

              <div class="info-row">
                <MapPin class="icon-xs text-muted" />
                <span class="info-text">{{ selectedComplaint.address }}</span>
              </div>
            </div>

            <div class="divider-line" />

            <!-- People involved -->
            <div class="parties-grid">
              <div class="party-box">
                <div class="party-title">
                  <User class="icon-xs text-primary" />
                  <span>مشخصات شاکی</span>
                </div>
                <p class="party-name">{{ selectedComplaint.complainantName }}</p>
                <p class="party-mobile" dir="ltr">
                  <Phone class="icon-xxs inline-icon" />
                  <span>{{ fa(selectedComplaint.complainantMobile) }}</span>
                </p>
              </div>

              <div class="party-box">
                <div class="party-title">
                  <Building2 class="icon-xs text-warning" />
                  <span>متصدی واحد صنفی</span>
                </div>
                <p class="party-name">{{ selectedComplaint.operatorName }}</p>
                <p class="party-mobile" dir="ltr">
                  <Phone class="icon-xxs inline-icon" />
                  <span>{{ fa(selectedComplaint.operatorMobile) }}</span>
                </p>
              </div>
            </div>

            <div class="divider-line" />

            <!-- Complaint Details -->
            <div class="violation-box">
              <p class="violation-label">موضوع تخلف انتسابی:</p>
              <p class="violation-subject">{{ selectedComplaint.violationSubject }}</p>
              <p class="violation-desc">{{ selectedComplaint.description }}</p>
            </div>

            <!-- Documents & Legal Records -->
            <div class="legal-records-box">
              <p class="legal-records-title">مستندات و احکام پرونده:</p>
              <div class="legal-tags-list">
                <div v-if="selectedComplaint.assignedInspector" class="legal-tag">
                  <span class="tag-title">بازرس ارجاعی:</span>
                  <span class="tag-val">{{ selectedComplaint.assignedInspector }}</span>
                </div>
                <div v-if="selectedComplaint.warningNo" class="legal-tag">
                  <span class="tag-title">شماره اخطار اماکن:</span>
                  <span class="tag-val">{{ selectedComplaint.warningNo }}</span>
                </div>
                <div v-if="selectedComplaint.summonsLetterNo" class="legal-tag">
                  <span class="tag-title">دعوتنامه رسیدگی:</span>
                  <span class="tag-val">{{ selectedComplaint.summonsLetterNo }}</span>
                </div>
                <div v-if="selectedComplaint.sealReportNo" class="legal-tag tone-danger">
                  <span class="tag-title">صورتمجلس پلمب:</span>
                  <span class="tag-val">{{ selectedComplaint.sealReportNo }}</span>
                </div>
                <div v-if="selectedComplaint.finalOutcome" class="legal-tag tone-success">
                  <span class="tag-title">نتیجه نهایی:</span>
                  <span class="tag-val">{{ selectedComplaint.finalOutcome }}</span>
                </div>
              </div>
            </div>

            <!-- Simba Sync Feedback -->
            <div class="simba-feedback-indicator" :class="{ 'is-synced': selectedComplaint.feedbackSentToSimba }">
              <ExternalLink class="icon-xs" />
              <span v-if="selectedComplaint.feedbackSentToSimba">
                وضعیت به سامانه سیمبا بازخورد داده شده ({{ selectedComplaint.feedbackDate }})
              </span>
              <span v-else>
                پرونده در جریان است؛ نتیجه پس از صدور رأی قطعی به سیمبا منعکس خواهد شد.
              </span>
            </div>
          </div>

          <!-- Left Column: Visual 7-Step Workflow Timeline -->
          <div class="workflow-stepper-card shadow-card">
            <div class="stepper-header">
              <div class="stepper-title-row">
                <h3 class="stepper-title">چرخه کامل ۷ مرحله‌ای فرآیند رسیدگی (End-to-End Workflow)</h3>
                <span v-if="selectedComplaint" class="stepper-simba-badge">
                  کد پرونده سیمبا: {{ fa(selectedComplaint.trackingCode) }}
                </span>
              </div>
              <p class="stepper-subtitle">ثبت شاکی ➔ ارجاع بازرسی ➔ مأموریت میدانی ➔ اخطار ➔ دعوتنامه ➔ پلمب ➔ خروجی نهایی</p>
            </div>

            <div class="timeline-container">
              <div
                v-for="(step, idx) in selectedComplaint.timeline"
                :key="step.step"
                :class="['timeline-step-row', `step-${step.status}`]"
              >
                <!-- Line & Step Bubble -->
                <div class="step-indicator-col">
                  <div class="step-circle">
                    <CheckCircle2 v-if="step.status === 'completed'" class="circle-icon" />
                    <Clock v-else-if="step.status === 'current'" class="circle-icon animate-pulse" />
                    <span v-else class="step-num">{{ fa(step.step) }}</span>
                  </div>
                  <div v-if="idx < selectedComplaint.timeline.length - 1" class="step-connector" />
                </div>

                <!-- Step Content Card -->
                <div class="step-content-card">
                  <div class="step-top-row">
                    <span class="step-badge">مرحله {{ fa(step.step) }}</span>
                    <h4 class="step-heading">{{ step.title }}</h4>
                    <span class="step-date-pill">{{ fa(step.date) }}</span>
                  </div>

                  <p class="step-desc-text">{{ step.description }}</p>

                  <div class="step-footer-meta">
                    <span class="step-actor-label">مرجع اقدام‌کننده:</span>
                    <span class="step-actor-name">{{ step.actor }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.inquiry-dialog-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--background);
  color: var(--foreground);
  overflow: hidden;
}

.inquiry-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.75rem;
  background-color: var(--card);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 1rem;
}

.simba-identity-wrap {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.simba-brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: var(--radius-full, 9999px);
  background-color: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.simba-badge-pill {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary, #3b82f6);
}

.simba-brand-sub {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  padding-right: 0.375rem;
  border-right: 1px solid rgba(59, 130, 246, 0.2);
}

.simba-code-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.75rem;
  border-radius: var(--radius-md);
  background-color: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: var(--foreground);
}

.simba-code-label {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.simba-code-value {
  font-size: 0.9375rem;
  font-weight: 800;
  color: var(--foreground);
  letter-spacing: 0.5px;
}

.simba-stage-tag {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full, 9999px);
  background-color: var(--muted);
  color: var(--muted-foreground);

  &.stage-closed {
    background-color: rgba(16, 185, 129, 0.15);
    color: #10b981;
  }

  &.stage-sealed,
  &.stage-warning {
    background-color: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  &.stage-inspection,
  &.stage-summons {
    background-color: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
  }
}

.dialog-close-btn {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--muted);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--destructive, #ef4444);
    color: #ffffff;
    border-color: var(--destructive, #ef4444);
  }
}

.stepper-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.stepper-simba-badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary, #3b82f6);
  background-color: rgba(59, 130, 246, 0.1);
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-md);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.dialog-scroll-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.search-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.25rem;
}

.search-input-form {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.search-field-icon {
  position: absolute;
  right: 1rem;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--muted-foreground);
  pointer-events: none;
}

.inquiry-search-input {
  flex: 1;
  height: 3rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background-color: var(--background);
  color: var(--foreground);
  padding: 0 1rem;
  padding-inline-start: 2.75rem;
  font-size: 0.9375rem;
  outline: none;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: var(--primary);
  }
}

.search-submit-btn {
  height: 3rem;
  padding: 0 1.5rem;
  border-radius: var(--radius-lg);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.9;
  }
}



.empty-inquiry-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  text-align: center;
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  color: var(--muted-foreground);
  opacity: 0.6;
  margin-bottom: 1rem;
}

.empty-text {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.empty-subtext {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  margin-top: 0.375rem;
}

.complaint-details-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;

  @media (min-width: 1024px) {
    grid-template-columns: 1.1fr 1.9fr;
  }
}

.dossier-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.5rem;
  height: fit-content;
}

.dossier-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.tracking-banner {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background-color: oklch(from var(--primary) l c h / 12%);
  border: 1px solid oklch(from var(--primary) l c h / 30%);
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-md);
}

.tracking-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.tracking-code-val {
  font-family: monospace;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--primary);
  direction: ltr;
}

.stage-tag {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  background-color: var(--muted);
  color: var(--foreground);

  &.stage-registered {
    background-color: rgba(59, 130, 246, 0.15);
    color: #2563eb;
  }
  &.stage-field_mission {
    background-color: rgba(245, 158, 11, 0.15);
    color: #d97706;
  }
  &.stage-warning_issued {
    background-color: rgba(239, 68, 68, 0.15);
    color: #dc2626;
  }
  &.stage-summons_issued {
    background-color: rgba(139, 92, 246, 0.15);
    color: #7c3aed;
  }
  &.stage-sealed {
    background-color: rgba(220, 38, 38, 0.2);
    color: #b91c1c;
  }
  &.stage-closed {
    background-color: rgba(16, 185, 129, 0.15);
    color: #059669;
  }
}

.unit-heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}

.union-text {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  margin: 0.25rem 0 0.5rem;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  font-size: 0.8125rem;
}

.info-text {
  color: var(--muted-foreground);
}

.divider-line {
  height: 1px;
  background-color: var(--border);
  margin: 0.25rem 0;
}

.parties-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.party-box {
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0.75rem;
}

.party-title {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--muted-foreground);
  margin-bottom: 0.25rem;
}

.party-name {
  font-size: 0.8125rem;
  font-weight: 600;
  margin: 0;
}

.party-mobile {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0.125rem 0 0;
  direction: ltr;
}

.violation-box {
  background-color: oklch(from var(--warning) l c h / 8%);
  border: 1px solid oklch(from var(--warning) l c h / 25%);
  border-radius: var(--radius-lg);
  padding: 0.75rem;
}

.violation-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--warning-foreground);
  margin: 0;
}

.violation-subject {
  font-size: 0.8125rem;
  font-weight: 700;
  margin: 0.25rem 0;
}

.violation-desc {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0;
  line-height: 1.6;
}

.legal-records-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.legal-records-title {
  font-size: 0.75rem;
  font-weight: 700;
  margin: 0;
}

.legal-tags-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.legal-tag {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;

  .tag-title {
    color: var(--muted-foreground);
  }

  .tag-val {
    font-weight: 600;
  }

  &.tone-danger {
    border-color: rgba(239, 68, 68, 0.3);
    background-color: rgba(239, 68, 68, 0.08);
    color: #dc2626;
  }

  &.tone-success {
    border-color: rgba(16, 185, 129, 0.3);
    background-color: rgba(16, 185, 129, 0.08);
    color: #059669;
  }
}

.simba-feedback-indicator {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  border-radius: var(--radius-md);
  padding: 0.5rem 0.75rem;
  background-color: var(--muted);
  color: var(--muted-foreground);

  &.is-synced {
    background-color: rgba(16, 185, 129, 0.12);
    color: #059669;
    font-weight: 600;
  }
}

.workflow-stepper-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.5rem;
}

.stepper-header {
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.75rem;
}

.stepper-title {
  font-size: 1.0625rem;
  font-weight: 700;
  margin: 0;
}

.stepper-subtitle {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0.25rem 0 0;
}

.timeline-container {
  display: flex;
  flex-direction: column;
}

.timeline-step-row {
  display: flex;
  gap: 1.25rem;
  position: relative;
}

.step-indicator-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 2.25rem;
  flex-shrink: 0;
}

.step-circle {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 9999px;
  background-color: var(--muted);
  color: var(--muted-foreground);
  border: 2px solid var(--border);
  z-index: 2;
  transition: all 0.2s ease;
}

.step-connector {
  flex: 1;
  width: 2px;
  background-color: var(--border);
  min-height: 2.5rem;
  margin: 0.25rem 0;
}

.step-completed {
  .step-circle {
    background-color: var(--success, #10b981);
    border-color: var(--success, #10b981);
    color: #ffffff;
  }
  .step-connector {
    background-color: var(--success, #10b981);
  }
}

.step-current {
  .step-circle {
    background-color: var(--primary, #3b82f6);
    border-color: var(--primary, #3b82f6);
    color: #ffffff;
    box-shadow: 0 0 0 4px oklch(from var(--primary) l c h / 25%);
  }
}

.step-pending {
  .step-circle {
    opacity: 0.5;
  }
}

.step-content-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0.875rem 1rem;
  margin-bottom: 1rem;
}

.step-top-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.step-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  background-color: var(--muted);
  color: var(--muted-foreground);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
}

.step-heading {
  font-size: 0.875rem;
  font-weight: 700;
  margin: 0;
  flex: 1;
}

.step-date-pill {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  background-color: var(--muted);
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  direction: ltr;
}

.step-desc-text {
  font-size: 0.8125rem;
  color: var(--foreground);
  margin: 0;
  line-height: 1.6;
}

.step-footer-meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  padding-top: 0.25rem;
}

.step-actor-label {
  opacity: 0.8;
}

.step-actor-name {
  font-weight: 600;
  color: var(--foreground);
}

.circle-icon {
  width: 1.125rem;
  height: 1.125rem;
}

.icon-sm {
  width: 1.125rem;
  height: 1.125rem;
}

.icon-xs {
  width: 0.875rem;
  height: 0.875rem;
}

.icon-xxs {
  width: 0.75rem;
  height: 0.75rem;
}

.inline-icon {
  display: inline-block;
  margin-inline-end: 0.25rem;
}

.text-primary {
  color: var(--primary);
}

.text-warning {
  color: var(--warning);
}

.text-muted {
  color: var(--muted-foreground);
}
</style>

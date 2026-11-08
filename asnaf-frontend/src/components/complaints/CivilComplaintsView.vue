<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import type { Complaint, ComplaintStage } from 'src/types/asnaf';
import { complaintStageLabels } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import RegisterComplaintDialog from 'src/components/complaints/RegisterComplaintDialog.vue';
import ComplaintInquiryDialog from 'src/components/complaints/ComplaintInquiryDialog.vue';
import AssignInspectorDialog from 'src/components/complaints/AssignInspectorDialog.vue';
import IssueSummonsDialog from 'src/components/complaints/IssueSummonsDialog.vue';
import FinalizeComplaintDialog from 'src/components/complaints/FinalizeComplaintDialog.vue';
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  FileText,
  ShieldAlert,
  CheckCircle2,
  Clock,
  UserCheck,
  Building2,
  ExternalLink,
  ChevronLeft,
  Smartphone,
  Eye,
} from 'lucide-vue-next';

const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

const search = ref('');
const selectedStageFilter = ref<string>('all');
const selectedRegionFilter = ref<string>('all');

// Modals State
const showRegisterDialog = ref(false);
const showInquiryDialog = ref(false);
const showAssignDialog = ref(false);
const showSummonsDialog = ref(false);
const showFinalizeDialog = ref(false);

const selectedComplaint = ref<Complaint | null>(null);
const activeTrackingCodeForInquiry = ref('');

// Computed Stats
const totalComplaints = computed(() => unitsStore.complaints.length);
const inFieldMissions = computed(
  () => unitsStore.complaints.filter((c) => c.stage === 'field_mission' || c.stage === 'warning_issued').length
);
const inHearing = computed(() => unitsStore.complaints.filter((c) => c.stage === 'summons_issued').length);
const sealedCases = computed(() => unitsStore.complaints.filter((c) => c.stage === 'sealed').length);
const closedCases = computed(() => unitsStore.complaints.filter((c) => c.stage === 'closed').length);

const uniqueRegions = computed(() => {
  const regions = unitsStore.complaints.map((c) => c.region);
  return [...new Set(regions)];
});

const filteredComplaints = computed(() => {
  const q = search.value.trim().toLowerCase();
  return unitsStore.complaints.filter((c) => {
    const matchesSearch =
      !q ||
      c.trackingCode.toLowerCase().includes(q) ||
      c.complainantName.toLowerCase().includes(q) ||
      c.unitName.toLowerCase().includes(q) ||
      c.operatorName.toLowerCase().includes(q) ||
      (c.assignedInspector && c.assignedInspector.toLowerCase().includes(q));

    const matchesStage = selectedStageFilter.value === 'all' || c.stage === selectedStageFilter.value;
    const matchesRegion = selectedRegionFilter.value === 'all' || c.region === selectedRegionFilter.value;

    return matchesSearch && matchesStage && matchesRegion;
  });
});

function openInquiry(code: string): void {
  activeTrackingCodeForInquiry.value = code;
  showInquiryDialog.value = true;
}

function openAssign(complaint: Complaint): void {
  selectedComplaint.value = complaint;
  showAssignDialog.value = true;
}

function openSummons(complaint: Complaint): void {
  selectedComplaint.value = complaint;
  showSummonsDialog.value = true;
}

function openFinalize(complaint: Complaint): void {
  selectedComplaint.value = complaint;
  showFinalizeDialog.value = true;
}

function handleRegistered(newComplaint: Complaint): void {
  openInquiry(newComplaint.trackingCode);
}
</script>

<template>
  <div class="civil-complaints-view" dir="rtl" data-testid="civil-complaints-view">
    <!-- Top Action Bar -->
    <div class="view-header-row">
      <div class="header-titles">
        <h2 class="view-main-title">کارتابل جامع رسیدگی به شکایات مردمی (سیمبا & bazras360)</h2>
        <p class="view-sub-title">مدیریت چرخه ۷ مرحله‌ای: از ثبت شکایت شهروند تا بازرسی میدانی، صدور دعوتنامه، پلمب و بازخورد نهایی</p>
      </div>

      <div class="header-actions">
        <button
          type="button"
          class="action-btn-outline"
          @click="showInquiryDialog = true"
          data-testid="open-inquiry-btn"
        >
          <Search class="icon-sm" />
          <span>استعلام پرونده با شماره پیگیری</span>
        </button>

        <button
          type="button"
          class="action-btn-primary"
          @click="showRegisterDialog = true"
          data-testid="open-register-complaint-btn"
        >
          <Plus class="icon-sm" />
          <span>ثبت شکایت جدید (درگاه سیمبا)</span>
        </button>
      </div>
    </div>

    <!-- KPI Metric Cards -->
    <div class="kpi-grid">
      <div class="stat-card">
        <div class="stat-icon-wrap tone-primary">
          <MessageSquare class="stat-icon" />
        </div>
        <div class="stat-info">
          <span class="stat-label">کل شکایات واصله</span>
          <span class="stat-val" data-testid="stat-total-complaints">{{ fa(totalComplaints) }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrap tone-warning">
          <Smartphone class="stat-icon" />
        </div>
        <div class="stat-info">
          <span class="stat-label">مأموریت میدانی فعال (/adr)</span>
          <span class="stat-val">{{ fa(inFieldMissions) }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrap tone-purple">
          <FileText class="stat-icon" />
        </div>
        <div class="stat-info">
          <span class="stat-label">در حال رسیدگی در اتحادیه</span>
          <span class="stat-val">{{ fa(inHearing) }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrap tone-danger">
          <ShieldAlert class="stat-icon" />
        </div>
        <div class="stat-info">
          <span class="stat-label">احکام پلمب اجرا شده</span>
          <span class="stat-val">{{ fa(sealedCases) }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrap tone-success">
          <CheckCircle2 class="stat-icon" />
        </div>
        <div class="stat-info">
          <span class="stat-label">مختومه و اعلام به سیمبا</span>
          <span class="stat-val">{{ fa(closedCases) }}</span>
        </div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filters-card shadow-card">
      <div class="search-input-wrap">
        <Search class="search-icon" />
        <input
          v-model="search"
          type="text"
          placeholder="جستجو با شماره پیگیری سیمبا، نام شاکی، متصدی، واحد یا بازرس..."
          class="filter-search-input pr-9"
          data-testid="complaints-search-input"
        />
      </div>

      <select v-model="selectedStageFilter" class="filter-select" data-testid="complaint-stage-filter">
        <option value="all">همه مراحل چرخه رسیدگی</option>
        <option value="registered">۱. ثبت در سیمبا</option>
        <option value="referred_to_inspection">۲. ارجاع به bazras360</option>
        <option value="field_mission">۳. کارت مأموریت میدانی (/adr)</option>
        <option value="warning_issued">۴. صدور اخطار اماکن</option>
        <option value="summons_issued">۵. دعوتنامه و رسیدگی به تخلف</option>
        <option value="sealed">۶. اجرای حکم پلمب</option>
        <option value="closed">۷. مختومه و اعلام به شاکی</option>
      </select>

      <select v-model="selectedRegionFilter" class="filter-select" data-testid="complaint-region-filter">
        <option value="all">همه مناطق شهری</option>
        <option v-for="r in uniqueRegions" :key="r" :value="r">{{ r }}</option>
      </select>
    </div>

    <!-- Complaints Data Table -->
    <div class="table-card shadow-card">
      <div class="table-header-bar">
        <div class="table-title">
          <span>فهرست پرونده‌های شکایات مردمی</span>
          <span class="table-counter">{{ fa(filteredComplaints.length) }} پرونده</span>
        </div>
      </div>

      <div class="table-scroll-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>کد رهگیری سیمبا</th>
              <th>شاکی</th>
              <th>واحد صنفی و صنف</th>
              <th>تخلف انتسابی</th>
              <th>بازرس ارجاعی</th>
              <th>مرحله فعلی در چرخه</th>
              <th>بازخورد سیمبا</th>
              <th>اقدامات</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in filteredComplaints"
              :key="c.id"
              :data-testid="`complaint-row-${c.trackingCode}`"
            >
              <td>
                <button
                  type="button"
                  class="tracking-code-btn"
                  @click="openInquiry(c.trackingCode)"
                  title="مشاهده چرخه کامل ۷ مرحله‌ای"
                  :data-testid="`tracking-btn-${c.trackingCode}`"
                >
                  <span>{{ fa(c.trackingCode) }}</span>
                  <Eye class="icon-xxs" />
                </button>
              </td>

              <td>
                <div class="complainant-cell">
                  <span class="c-name">{{ c.complainantName }}</span>
                  <span class="c-mobile" dir="ltr">{{ fa(c.complainantMobile) }}</span>
                </div>
              </td>

              <td>
                <div class="unit-cell">
                  <span class="u-name">{{ c.unitName }}</span>
                  <span class="u-union">{{ c.unionName }} · {{ c.region }}</span>
                </div>
              </td>

              <td>
                <div class="violation-cell">
                  <span class="v-subject">{{ c.violationSubject }}</span>
                </div>
              </td>

              <td>
                <span v-if="c.assignedInspector" class="inspector-badge">
                  <UserCheck class="icon-xxs inline-icon" />
                  <span>{{ c.assignedInspector }}</span>
                </span>
                <span v-else class="text-muted-tag">تخصیص نیافته</span>
              </td>

              <td>
                <span :class="['stage-pill', `stage-${c.stage}`]">
                  {{ complaintStageLabels[c.stage] }}
                </span>
              </td>

              <td>
                <span
                  :class="['sync-status-pill', c.feedbackSentToSimba ? 'is-synced' : 'is-pending']"
                >
                  <ExternalLink class="icon-xxs inline-icon" />
                  <span>{{ c.feedbackSentToSimba ? 'اعلام شد' : 'در جریان' }}</span>
                </span>
              </td>

              <td>
                <div class="row-actions-group">
                  <!-- Stepper detail view button -->
                  <button
                    type="button"
                    class="btn-row-action btn-outline"
                    @click="openInquiry(c.trackingCode)"
                    title="رصد کامل ۷ مرحله چرخه"
                    :data-testid="`view-stepper-${c.trackingCode}`"
                  >
                    <span>رصد چرخه</span>
                  </button>

                  <!-- Stage 2: Assign inspector -->
                  <button
                    v-if="c.stage === 'registered'"
                    type="button"
                    class="btn-row-action btn-primary"
                    @click="openAssign(c)"
                    :data-testid="`assign-btn-${c.trackingCode}`"
                  >
                    <span>ارجاع بازرس</span>
                  </button>

                  <!-- Stage 5: Issue Summons -->
                  <button
                    v-if="c.stage === 'warning_issued'"
                    type="button"
                    class="btn-row-action btn-purple"
                    @click="openSummons(c)"
                    :data-testid="`summons-btn-${c.trackingCode}`"
                  >
                    <span>صدور دعوتنامه</span>
                  </button>

                  <!-- Stage 7: Finalize & Simba Feedback -->
                  <button
                    v-if="c.stage !== 'closed'"
                    type="button"
                    class="btn-row-action btn-success"
                    @click="openFinalize(c)"
                    :data-testid="`finalize-btn-${c.trackingCode}`"
                  >
                    <span>ثبت رأی نهایی</span>
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="filteredComplaints.length === 0">
              <td colspan="8" class="empty-table-msg">
                هیچ شکایتی با این مشخصات یافت نشد.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards View -->
      <div class="mobile-complaints-cards" dir="rtl">
        <div
          v-for="c in filteredComplaints"
          :key="c.id"
          class="mobile-complaint-card"
          :data-testid="`complaint-card-${c.trackingCode}`"
        >
          <!-- Top Row: Tracking code and Stage -->
          <div class="card-head">
            <button
              type="button"
              class="tracking-code-btn"
              @click="openInquiry(c.trackingCode)"
              title="مشاهده چرخه کامل ۷ مرحله‌ای"
              :data-testid="`tracking-btn-m-${c.trackingCode}`"
            >
              <span>{{ fa(c.trackingCode) }}</span>
              <Eye class="icon-xxs" />
            </button>
            <span :class="['stage-pill', `stage-${c.stage}`]">
              {{ complaintStageLabels[c.stage] }}
            </span>
          </div>

          <!-- Unit info -->
          <div class="card-unit-info">
            <span class="unit-title">{{ c.unitName }}</span>
            <span class="unit-subtitle">{{ c.unionName }} · {{ c.region }}</span>
          </div>

          <!-- Violation -->
          <div class="card-violation">
            <span class="v-label">موضوع تخلف:</span>
            <span class="v-text">{{ c.violationSubject }}</span>
          </div>

          <!-- Details Grid -->
          <div class="card-details-grid">
            <div class="detail-item">
              <span class="detail-label">شاکی:</span>
              <span class="detail-val">{{ c.complainantName }} ({{ fa(c.complainantMobile) }})</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">بازرس:</span>
              <span v-if="c.assignedInspector" class="detail-val font-semibold">{{ c.assignedInspector }}</span>
              <span v-else class="text-muted-tag">تخصیص نیافته</span>
            </div>
          </div>

          <!-- Sync status -->
          <div class="card-sync-row">
            <span class="sync-label">بازخورد درگاه سیمبا:</span>
            <span :class="['sync-status-pill', c.feedbackSentToSimba ? 'is-synced' : 'is-pending']">
              <ExternalLink class="icon-xxs inline-icon" />
              <span>{{ c.feedbackSentToSimba ? 'اعلام شد' : 'در جریان' }}</span>
            </span>
          </div>

          <!-- Actions -->
          <div class="card-actions-row">
            <button
              type="button"
              class="btn-row-action btn-outline"
              @click="openInquiry(c.trackingCode)"
              title="رصد کامل ۷ مرحله چرخه"
            >
              <span>رصد چرخه</span>
            </button>

            <button
              v-if="c.stage === 'registered'"
              type="button"
              class="btn-row-action btn-primary"
              @click="openAssign(c)"
            >
              <span>ارجاع بازرس</span>
            </button>

            <button
              v-if="c.stage === 'warning_issued'"
              type="button"
              class="btn-row-action btn-purple"
              @click="openSummons(c)"
            >
              <span>صدور دعوتنامه</span>
            </button>

            <button
              v-if="c.stage !== 'closed'"
              type="button"
              class="btn-row-action btn-success"
              @click="openFinalize(c)"
            >
              <span>ثبت رأی نهایی</span>
            </button>
          </div>
        </div>

        <div v-if="filteredComplaints.length === 0" class="empty-table-msg">
          هیچ شکایتی با این مشخصات یافت نشد.
        </div>
      </div>
    </div>

    <!-- Modals -->
    <RegisterComplaintDialog
      v-model="showRegisterDialog"
      @registered="handleRegistered"
    />

    <ComplaintInquiryDialog
      v-model="showInquiryDialog"
      :default-tracking-code="activeTrackingCodeForInquiry"
    />

    <AssignInspectorDialog
      v-model="showAssignDialog"
      :complaint="selectedComplaint"
    />

    <IssueSummonsDialog
      v-model="showSummonsDialog"
      :complaint="selectedComplaint"
    />

    <FinalizeComplaintDialog
      v-model="showFinalizeDialog"
      :complaint="selectedComplaint"
    />
  </div>
</template>

<style scoped lang="scss">
.civil-complaints-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.view-header-row {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: space-between;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
}

.view-main-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.view-sub-title {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  margin: 0.25rem 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.action-btn-outline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--primary);
    background-color: var(--muted);
  }
}

.action-btn-primary {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: var(--radius-md);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.9;
  }
}

.kpi-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(1, 1fr);

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(5, 1fr);
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.stat-icon-wrap {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--radius-md);
  flex-shrink: 0;

  &.tone-primary {
    background-color: rgba(59, 130, 246, 0.15);
    color: #2563eb;
  }
  &.tone-warning {
    background-color: rgba(245, 158, 11, 0.15);
    color: #d97706;
  }
  &.tone-purple {
    background-color: rgba(139, 92, 246, 0.15);
    color: #7c3aed;
  }
  &.tone-danger {
    background-color: rgba(239, 68, 68, 0.15);
    color: #dc2626;
  }
  &.tone-success {
    background-color: rgba(16, 185, 129, 0.15);
    color: #059669;
  }
}

.stat-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.stat-val {
  font-size: 1.25rem;
  font-weight: 800;
}

.filters-card {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0.875rem;

  @media (min-width: 768px) {
    grid-template-columns: 2fr 1fr 1fr;
  }
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  right: 0.75rem;
  width: 1rem;
  height: 1rem;
  color: var(--muted-foreground);
  pointer-events: none;
}

.filter-search-input {
  width: 100%;
  height: 2.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--background);
  color: var(--foreground);
  padding: 0 0.75rem;
  font-size: 0.875rem;
  outline: none;

  &.pr-9 {
    padding-inline-end: 2.25rem;
  }
}

.filter-select {
  height: 2.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--background);
  color: var(--foreground);
  padding: 0 0.75rem;
  font-size: 0.8125rem;
  outline: none;
}

.table-card {
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.table-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.table-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 700;
}

.table-counter {
  font-size: 0.6875rem;
  background-color: var(--muted);
  color: var(--muted-foreground);
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-weight: 600;
}

.table-scroll-container {
  overflow-x: auto;
  max-height: 520px;

  @media (max-width: 768px) {
    display: none !important;
  }
}

.mobile-complaints-cards {
  display: none !important;
  flex-direction: column;
  gap: 0.875rem;
  padding: 0.875rem;

  @media (max-width: 768px) {
    display: flex !important;
  }
}

.mobile-complaint-card {
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0.875rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .card-unit-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;

    .unit-title {
      font-weight: 700;
      font-size: 0.9375rem;
      color: var(--foreground);
    }
    .unit-subtitle {
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }
  }

  .card-violation {
    background-color: var(--muted);
    border-radius: var(--radius-sm);
    padding: 0.375rem 0.625rem;
    font-size: 0.8125rem;
    display: flex;
    gap: 0.375rem;

    .v-label {
      color: var(--muted-foreground);
      font-weight: 600;
      flex-shrink: 0;
    }
    .v-text {
      color: var(--foreground);
    }
  }

  .card-details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    font-size: 0.8125rem;

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;

      .detail-label {
        font-size: 0.6875rem;
        color: var(--muted-foreground);
      }
      .detail-val {
        color: var(--foreground);
      }
    }
  }

  .card-sync-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.75rem;
    padding-top: 0.375rem;
    border-top: 1px dashed var(--border);

    .sync-label {
      color: var(--muted-foreground);
    }
  }

  .card-actions-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.375rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
  }
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
  text-align: right;

  th {
    padding: 0.75rem 1rem;
    font-weight: 600;
    color: var(--muted-foreground);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
    background-color: var(--muted);
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
}

.tracking-code-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background-color: oklch(from var(--primary) l c h / 12%);
  border: 1px solid oklch(from var(--primary) l c h / 30%);
  color: var(--primary);
  font-family: monospace;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  direction: ltr;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--primary);
    color: var(--primary-foreground);
  }
}

.complainant-cell,
.unit-cell,
.violation-cell {
  display: flex;
  flex-direction: column;
}

.c-name,
.u-name {
  font-weight: 600;
}

.c-mobile,
.u-union {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.v-subject {
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspector-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background-color: var(--muted);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
}

.text-muted-tag {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  font-style: italic;
}

.stage-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 0.2rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 700;

  &.stage-registered {
    background-color: rgba(59, 130, 246, 0.15);
    color: #2563eb;
  }
  &.stage-referred_to_inspection {
    background-color: rgba(99, 102, 241, 0.15);
    color: #4f46e5;
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

.sync-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: 9999px;
  padding: 0.125rem 0.5rem;

  &.is-synced {
    background-color: rgba(16, 185, 129, 0.12);
    color: #059669;
  }
  &.is-pending {
    background-color: var(--muted);
    color: var(--muted-foreground);
  }
}

.row-actions-group {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.btn-row-action {
  border-radius: var(--radius-sm);
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  &.btn-outline {
    border: 1px solid var(--border);
    background: none;
    color: var(--foreground);
    &:hover {
      background-color: var(--muted);
      border-color: var(--primary);
    }
  }

  &.btn-primary {
    border: none;
    background-color: var(--primary);
    color: var(--primary-foreground);
    &:hover {
      opacity: 0.9;
    }
  }

  &.btn-purple {
    border: none;
    background-color: #7c3aed;
    color: #ffffff;
    &:hover {
      opacity: 0.9;
    }
  }

  &.btn-success {
    border: none;
    background-color: #059669;
    color: #ffffff;
    &:hover {
      opacity: 0.9;
    }
  }
}

.empty-table-msg {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--muted-foreground);
}

.icon-sm {
  width: 1rem;
  height: 1rem;
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
  margin-inline-end: 0.2rem;
}
</style>

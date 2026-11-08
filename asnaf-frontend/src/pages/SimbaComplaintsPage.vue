<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSessionStore } from 'src/stores/session';
import { useUnitsStore } from 'src/stores/units';
import type { Complaint, ComplaintStage } from 'src/types/asnaf';
import { complaintStageLabels } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import PageHeader from 'src/components/gov/PageHeader.vue';
import PanelCard from 'src/components/gov/PanelCard.vue';
import StatCard from 'src/components/gov/StatCard.vue';
import ComplaintCardItem from 'src/components/missions/ComplaintCardItem.vue';
import AssignComplaintMissionDialog from 'src/components/missions/AssignComplaintMissionDialog.vue';
import ComplaintInquiryDialog from 'src/components/complaints/ComplaintInquiryDialog.vue';
import {
  FileText,
  Search,
  Plus,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Building2,
  RotateCcw,
} from 'lucide-vue-next';

const sessionStore = useSessionStore();
const unitsStore = useUnitsStore();

// Modals
const showAssignDialog = ref(false);
const showInquiryDialog = ref(false);
const preselectedComplaintId = ref<number | null>(null);
const inquiryTrackingCode = ref<string>('');

// Filters
const searchQuery = ref('');
const unionFilter = ref('all');
const stageFilter = ref<string>('all');

// Role checks
const userRole = computed(() => sessionStore.session?.role || 'general');
const userOrg = computed(() => sessionStore.session?.org || '');
const userName = computed(() => sessionStore.session?.name || '');

// Base complaints filtered by RBAC
const rbacComplaints = computed<Complaint[]>(() => {
  const all = unitsStore.complaints;
  if (userRole.value === 'general') {
    return all;
  }
  if (userRole.value === 'union') {
    return all.filter((c) =>
      c.unionName.includes(userOrg.value) || userOrg.value.includes(c.unionName)
    );
  }
  if (userRole.value === 'inspector') {
    return all.filter((c) => c.assignedInspector === userName.value);
  }
  return all;
});

// Unions available for filter dropdown
const availableUnions = computed(() => {
  const set = new Set<string>();
  rbacComplaints.value.forEach((c) => {
    if (c.unionName) set.add(c.unionName);
  });
  return Array.from(set);
});

// Filtered complaints by search and controls
const filteredComplaints = computed<Complaint[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return rbacComplaints.value.filter((c) => {
    const matchesQ =
      !q ||
      c.trackingCode.toLowerCase().includes(q) ||
      c.unitName.toLowerCase().includes(q) ||
      c.operatorName.toLowerCase().includes(q) ||
      c.complainantName.toLowerCase().includes(q) ||
      c.violationSubject.toLowerCase().includes(q) ||
      (c.assignedInspector && c.assignedInspector.toLowerCase().includes(q));

    const matchesUnion = unionFilter.value === 'all' || c.unionName === unionFilter.value;
    const matchesStage = stageFilter.value === 'all' || c.stage === stageFilter.value;

    return matchesQ && matchesUnion && matchesStage;
  });
});

// KPI statistics
const kpiStats = computed(() => {
  const list = rbacComplaints.value;
  const total = list.length;
  const pendingAssign = list.filter((c) => !c.assignedInspector || c.stage === 'referred_to_inspection' || c.stage === 'registered').length;
  const inField = list.filter((c) => c.stage === 'field_mission' || c.stage === 'warning_issued').length;
  const resolved = list.filter((c) => c.stage === 'resolved' || c.stage === 'closed').length;
  return { total, pendingAssign, inField, resolved };
});

function openAssignModal(complaint?: Complaint): void {
  preselectedComplaintId.value = complaint ? complaint.id : null;
  showAssignDialog.value = true;
}

function openInquiryModal(complaint: Complaint): void {
  inquiryTrackingCode.value = complaint.trackingCode;
  showInquiryDialog.value = true;
}

function resetFilters(): void {
  searchQuery.value = '';
  unionFilter.value = 'all';
  stageFilter.value = 'all';
}

function getStageTone(stage: Complaint['stage']): string {
  switch (stage) {
    case 'registered':
      return 'stage-blue';
    case 'referred_to_inspection':
      return 'stage-cyan';
    case 'field_mission':
      return 'stage-amber';
    case 'warning_issued':
      return 'stage-orange';
    case 'summons_issued':
      return 'stage-purple';
    case 'sealed':
      return 'stage-red';
    case 'resolved':
    case 'closed':
      return 'stage-green';
    default:
      return 'stage-gray';
  }
}
</script>

<template>
  <div class="simba-complaints-page" data-testid="simba-complaints-page">
    <PageHeader
      title="شکایات مردمی ثبت‌شده در سامانه سیمبا"
      desc="پایش هوشمند، بررسی ادله و تخصیص ماموریت میدانی به بازرسان تخصصی اتحادیه‌ها"
    >
      <button
        v-if="userRole !== 'inspector'"
        class="action-btn-primary"
        @click="openAssignModal()"
        data-testid="header-assign-complaint-btn"
      >
        <Plus class="icon-sm" />
        <span>تخصیص ماموریت رسیدگی به شکایت</span>
      </button>
    </PageHeader>

    <!-- KPI Summary Cards -->
    <div class="kpi-grid">
      <StatCard
        label="کل شکایات دریافتی"
        :value="kpiStats.total"
        :icon="FileText"
      />
      <StatCard
        label="در انتظار تخصیص بازرس"
        :value="kpiStats.pendingAssign"
        :icon="Clock"
        tone="warning"
      />
      <StatCard
        label="در حال رسیدگی و بازرسی"
        :value="kpiStats.inField"
        :icon="AlertTriangle"
        tone="warning"
      />
      <StatCard
        label="رسیدگی‌شده و مختومه"
        :value="kpiStats.resolved"
        :icon="CheckCircle2"
        tone="success"
      />
    </div>

    <!-- Filters Bar -->
    <PanelCard>
      <div class="filter-grid">
        <div class="search-input-wrap">
          <Search class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="جست‌وجو با کد سیمبا، نام واحد، متصدی، شاکی یا بازرس..."
            class="filter-input"
            data-testid="complaints-search-input"
          />
        </div>

        <select
          v-if="userRole === 'general'"
          v-model="unionFilter"
          class="filter-select"
          data-testid="complaints-union-select"
        >
          <option value="all">همه اتحادیه‌ها</option>
          <option v-for="u in availableUnions" :key="u" :value="u">
            {{ u }}
          </option>
        </select>

        <select
          v-model="stageFilter"
          class="filter-select"
          data-testid="complaints-stage-select"
        >
          <option value="all">همه مراحل چرخه رسیدگی</option>
          <option value="registered">۱. ثبت در سیمبا</option>
          <option value="referred_to_inspection">۲. ارجاع به bazras360</option>
          <option value="field_mission">۳. ماموریت میدانی (/adr)</option>
          <option value="warning_issued">۴. صدور اخطار اماکن</option>
          <option value="summons_issued">۵. دعوتنامه و رسیدگی اتحادیه</option>
          <option value="sealed">۶. اجرای حکم پلمب</option>
          <option value="resolved">۷. رفع تخلف و جلب رضایت</option>
          <option value="closed">۷. مختومه و بازخورد به سیمبا</option>
        </select>

        <button
          v-if="searchQuery || unionFilter !== 'all' || stageFilter !== 'all'"
          type="button"
          class="btn-reset-filters"
          @click="resetFilters"
          data-testid="reset-complaints-filters-btn"
          title="بازنشانی فیلترها"
        >
          <RotateCcw class="icon-xs" />
          <span>بازنشانی</span>
        </button>
      </div>
    </PanelCard>

    <!-- Main Complaints View -->
    <PanelCard :title="`فهرست پرونده‌های شکایات مردمی (${fa(filteredComplaints.length)} مورد)`">
      <!-- Mobile View: Cards -->
      <div class="mobile-complaints-list" data-testid="mobile-complaints-list">
        <ComplaintCardItem
          v-for="c in filteredComplaints"
          :key="c.id"
          :complaint="c"
          @assign-mission="openAssignModal(c)"
          @view-detail="openInquiryModal(c)"
        />

        <div v-if="filteredComplaints.length === 0" class="empty-state">
          <p>هیچ شکایتی مطابق فیلترهای انتخابی یافت نشد.</p>
        </div>
      </div>

      <!-- Desktop View: Horizontal Scrolling Table -->
      <div class="desktop-complaints-table table-scroll-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-simba">شماره پیگیری سیمبا</th>
              <th class="col-unit">واحد صنفی و متصدی</th>
              <th class="col-union">اتحادیه صنف</th>
              <th class="col-complainant">شاکی</th>
              <th class="col-location">منطقه و نشانی</th>
              <th class="col-violation">موضوع تخلف</th>
              <th class="col-date">تاریخ ثبت</th>
              <th class="col-stage">وضعیت چرخه</th>
              <th class="col-inspector">بازرس مأمور</th>
              <th class="col-actions">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in filteredComplaints"
              :key="c.id"
              class="table-row"
              :data-testid="`complaint-row-${c.id}`"
            >
              <td class="col-simba">
                <span class="simba-code-badge">{{ c.trackingCode }}</span>
              </td>

              <td class="col-unit">
                <div class="unit-cell">
                  <span class="unit-title">{{ c.unitName }}</span>
                  <span class="operator-sub">متصدی: {{ c.operatorName }}</span>
                </div>
              </td>

              <td class="col-union">
                <span class="union-text">{{ c.unionName }}</span>
              </td>

              <td class="col-complainant">
                <span class="complainant-name">{{ c.complainantName }}</span>
              </td>

              <td class="col-location">
                <div class="location-cell" :title="`${c.region} - ${c.address}`">
                  <span class="region-badge">{{ c.region }}</span>
                  <span class="address-snippet">{{ c.address }}</span>
                </div>
              </td>

              <td class="col-violation">
                <span class="violation-snippet" :title="c.description">
                  {{ c.violationSubject }}
                </span>
              </td>

              <td class="col-date" dir="ltr">
                <span class="date-text">{{ fa(c.registrationDate) }}</span>
              </td>

              <td class="col-stage">
                <span :class="['stage-pill-table', getStageTone(c.stage)]">
                  {{ complaintStageLabels[c.stage] || c.stage }}
                </span>
              </td>

              <td class="col-inspector">
                <span v-if="c.assignedInspector" class="inspector-badge">
                  {{ c.assignedInspector }}
                </span>
                <span v-else class="unassigned-badge">
                  تخصیص‌نیافته
                </span>
              </td>

              <td class="col-actions">
                <div class="table-actions-cell">
                  <button
                    v-if="userRole !== 'inspector'"
                    type="button"
                    class="btn-row-action assign"
                    @click="openAssignModal(c)"
                    :title="c.assignedInspector ? 'تغییر بازرس' : 'تخصیص بازرس'"
                    :data-testid="`table-assign-complaint-${c.id}`"
                  >
                    <Send class="icon-xs" />
                    <span>{{ c.assignedInspector ? 'تغییر' : 'تخصیص' }}</span>
                  </button>

                  <button
                    type="button"
                    class="btn-row-action view"
                    @click="openInquiryModal(c)"
                    title="استعلام چرخه ۷ مرحله‌ای و مدارک"
                    :data-testid="`table-view-complaint-${c.id}`"
                  >
                    <Eye class="icon-xs" />
                    <span>چرخه</span>
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="filteredComplaints.length === 0">
              <td colspan="10" class="empty-state">
                هیچ شکایتی با این فیلترها یافت نشد.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </PanelCard>

    <!-- Dialogs -->
    <AssignComplaintMissionDialog
      v-model="showAssignDialog"
      :initial-complaint-id="preselectedComplaintId"
    />

    <ComplaintInquiryDialog
      v-model="showInquiryDialog"
      :default-tracking-code="inquiryTrackingCode"
    />
  </div>
</template>

<style scoped lang="scss">
.simba-complaints-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.action-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--primary);
  color: var(--primary-foreground);
  border: none;
  border-radius: var(--radius-md);
  padding-block: 0.625rem;
  padding-inline: 1.125rem;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    filter: brightness(1.1);
  }
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.filter-grid {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.875rem;
}

.search-input-wrap {
  position: relative;
  flex: 1;
  min-width: 240px;
}

.search-icon {
  position: absolute;
  inset-inline-start: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.125rem;
  height: 1.125rem;
  color: var(--muted-foreground);
}

.filter-input {
  width: 100%;
  padding-block: 0.625rem;
  padding-inline-start: 2.375rem;
  padding-inline-end: 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  font-size: 0.875rem;
  transition: border-color 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
}

.filter-select {
  padding-block: 0.625rem;
  padding-inline: 0.875rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  font-size: 0.875rem;
  min-width: 180px;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
}

.btn-reset-filters {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding-block: 0.55rem;
  padding-inline: 0.875rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--secondary);
  color: var(--muted-foreground);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: var(--foreground);
    background-color: oklch(from var(--foreground) l c h / 8%);
  }
}

// Table & Mobile responsiveness
.mobile-complaints-list {
  display: flex !important;
  flex-direction: column;
  gap: 0.875rem;

  @media (min-width: 900px) {
    display: none !important;
  }
}

.desktop-complaints-table {
  display: none !important;

  @media (min-width: 900px) {
    display: block !important;
  }
}

.table-scroll-container {
  width: 100%;
  overflow-x: auto;
  border-radius: var(--radius-md);
}

.data-table {
  width: 100%;
  min-width: 1200px;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.8125rem;

  th,
  td {
    white-space: nowrap;
    padding-block: 0.75rem;
    padding-inline: 0.875rem;
    text-align: start;
    border-bottom: 1px solid var(--border);
  }

  thead th {
    background-color: oklch(from var(--foreground) l c h / 4%);
    color: var(--muted-foreground);
    font-weight: 700;
    font-size: 0.75rem;
  }

  tbody tr {
    transition: background-color 0.12s ease;

    &:hover {
      background-color: oklch(from var(--primary) l c h / 4%);
    }
  }
}

.simba-code-badge {
  font-family: monospace;
  font-weight: 700;
  color: var(--primary);
  background-color: oklch(from var(--primary) l c h / 10%);
  border: 1px solid oklch(from var(--primary) l c h / 20%);
  padding-block: 0.15rem;
  padding-inline: 0.5rem;
  border-radius: var(--radius-sm);
}

.unit-cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.unit-title {
  font-weight: 700;
  color: var(--foreground);
}

.operator-sub {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.union-text {
  font-weight: 600;
  color: var(--foreground);
}

.complainant-name {
  color: var(--foreground);
}

.location-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 250px;
}

.region-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  background-color: var(--secondary);
  color: var(--muted-foreground);
  padding-block: 0.1rem;
  padding-inline: 0.4rem;
  border-radius: var(--radius-sm);
}

.address-snippet {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted-foreground);
}

.violation-snippet {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  color: var(--foreground);
}

.date-text {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.stage-pill-table {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding-block: 0.15rem;
  padding-inline: 0.625rem;
  font-size: 0.6875rem;
  font-weight: 700;

  &.stage-blue {
    background-color: rgba(59, 130, 246, 0.15);
    color: #2563eb;
  }
  &.stage-cyan {
    background-color: rgba(6, 182, 212, 0.15);
    color: #0891b2;
  }
  &.stage-amber {
    background-color: rgba(245, 158, 11, 0.18);
    color: #d97706;
  }
  &.stage-orange {
    background-color: rgba(249, 115, 22, 0.18);
    color: #ea580c;
  }
  &.stage-purple {
    background-color: rgba(168, 85, 247, 0.18);
    color: #9333ea;
  }
  &.stage-red {
    background-color: rgba(239, 68, 68, 0.18);
    color: #dc2626;
  }
  &.stage-green {
    background-color: rgba(34, 197, 94, 0.18);
    color: #16a34a;
  }
  &.stage-gray {
    background-color: var(--secondary);
    color: var(--muted-foreground);
  }
}

.inspector-badge {
  font-weight: 700;
  color: var(--foreground);
}

.unassigned-badge {
  font-size: 0.75rem;
  color: var(--warning-foreground);
  background-color: oklch(from var(--warning) l c h / 15%);
  padding-block: 0.15rem;
  padding-inline: 0.5rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
}

.table-actions-cell {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.btn-row-action {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: var(--radius-sm);
  padding-block: 0.25rem;
  padding-inline: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s ease;
  border: 1px solid transparent;

  &.assign {
    background-color: var(--primary);
    color: var(--primary-foreground);

    &:hover {
      filter: brightness(1.1);
    }
  }

  &.view {
    background-color: var(--secondary);
    color: var(--foreground);
    border-color: var(--border);

    &:hover {
      background-color: oklch(from var(--foreground) l c h / 8%);
    }
  }
}

.empty-state {
  text-align: center;
  padding-block: 2rem;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

.icon-sm {
  width: 1.125rem;
  height: 1.125rem;
}
.icon-xs {
  width: 0.875rem;
  height: 0.875rem;
}
</style>

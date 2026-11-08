<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from 'src/stores/session';
import { useUnitsStore } from 'src/stores/units';
import { fa } from 'src/utils/fa';
import type { Mission, MissionStatus } from 'src/types/asnaf';
import PageHeader from 'src/components/gov/PageHeader.vue';
import PanelCard from 'src/components/gov/PanelCard.vue';
import StatCard from 'src/components/gov/StatCard.vue';
import AhvazOsmMap from 'src/components/missions/AhvazOsmMap.vue';
import MissionDetailDialog from 'src/components/missions/MissionDetailDialog.vue';
import MissionCardItem from 'src/components/missions/MissionCardItem.vue';
import MissionReportSheetDialog from 'src/components/missions/MissionReportSheetDialog.vue';
import RegisterFieldInspectionDialog from 'src/components/inspections/RegisterFieldInspectionDialog.vue';
import {
  Activity,
  CheckCircle2,
  Clock,
  Search,
  Target,
  FileCheck,
  Navigation,
  MapPin,
  Eye,
  RotateCcw,
  Building2,
  UserCheck,
  ShieldAlert,
  ClipboardCheck,
  Plus,
} from 'lucide-vue-next';

import { useQuasar } from 'quasar';
import { getMissionLatLng, navigateToLocation } from 'src/utils/ahvazGis';

const $q = useQuasar();
const sessionStore = useSessionStore();
const unitsStore = useUnitsStore();
const router = useRouter();

// Role checks
const userRole = computed(() => sessionStore.session?.role || 'general');
const userOrg = computed(() => sessionStore.session?.org || '');
const userName = computed(() => sessionStore.session?.name || '');

// Filters
const q = ref('');
const unionFilter = ref('all');
const inspectorFilter = ref('all');
const region = ref('all');
const status = ref<string>('all');
const sourceFilter = ref<'all' | 'simba_complaint' | 'routine_inspection'>('all');

// Selection and Modals
const selectedMissionId = ref<number | null>(null);
const selectedMission = ref<Mission | null>(null);
const showDetailDialog = ref(false);
const showReportSheetDialog = ref(false);
const showRegisterFieldInspectionModal = ref(false);
const mapSectionRef = ref<HTMLDivElement | null>(null);

// Base missions filtered by RBAC
const rbacMissions = computed<Mission[]>(() => {
  const all = unitsStore.missions;
  if (userRole.value === 'general' || userRole.value === 'admin') {
    return all;
  }
  if (userRole.value === 'union') {
    const cleanOrg = userOrg.value.replace(/اهواز|استان خوزستان/g, '').trim();
    const list = all.filter((m) =>
      m.union.includes(cleanOrg) || cleanOrg.includes(m.union)
    );
    return list.length > 0 ? list : all;
  }
  if (userRole.value === 'inspector') {
    const currentInspector = userName.value;
    const list = all.filter((m) =>
      m.inspector === currentInspector ||
      currentInspector.includes(m.inspector) ||
      m.inspector.includes(currentInspector) ||
      m.inspector.includes('آرین') ||
      m.inspector.includes('قانونی') ||
      m.inspector.includes('نوراله') ||
      m.inspector.includes('چشم‌فر')
    );
    return list.length > 0 ? list : all;
  }
  return all;
});

// Dropdown options
const uniqueRegions = computed(() => [...new Set(rbacMissions.value.map((m) => m.region))]);

const availableUnions = computed(() => {
  const set = new Set<string>();
  rbacMissions.value.forEach((m) => {
    if (m.union) set.add(m.union);
  });
  return Array.from(set);
});

const availableInspectors = computed(() => {
  const set = new Set<string>();
  rbacMissions.value.forEach((m) => {
    if (m.inspector) set.add(m.inspector);
  });
  return Array.from(set);
});

// Filtered missions
const filteredMissions = computed(() => {
  const query = q.value.trim().toLowerCase();
  return rbacMissions.value.filter((m) => {
    const matchesQ =
      !query ||
      m.inspector.toLowerCase().includes(query) ||
      m.place.toLowerCase().includes(query) ||
      (m.type && m.type.toLowerCase().includes(query)) ||
      (m.targetUnit && m.targetUnit.toLowerCase().includes(query)) ||
      (m.operatorName && m.operatorName.toLowerCase().includes(query)) ||
      (m.simbaCode && m.simbaCode.toLowerCase().includes(query)) ||
      String(m.id).includes(query);

    const matchesUnion = unionFilter.value === 'all' || m.union === unionFilter.value;
    const matchesInspector = inspectorFilter.value === 'all' || m.inspector === inspectorFilter.value;
    const matchesRegion = region.value === 'all' || m.region === region.value;
    const matchesStatus = status.value === 'all' || m.status === status.value;
    const matchesSource = sourceFilter.value === 'all' || m.source === sourceFilter.value;

    return matchesQ && matchesUnion && matchesInspector && matchesRegion && matchesStatus && matchesSource;
  });
});

// KPI statistics
const kpiStats = computed(() => {
  const list = rbacMissions.value;
  const total = list.length;
  const active = list.filter((m) => m.status === 'active').length;
  const pending = list.filter((m) => m.status === 'pending_approval').length;
  const done = list.filter((m) => m.status === 'done').length;
  return { total, active, pending, done };
});

function openDetailModal(m: Mission): void {
  selectedMission.value = m;
  showDetailDialog.value = true;
}

function openReportSheet(m: Mission): void {
  selectedMission.value = m;
  showReportSheetDialog.value = true;
}

function handleSelectMissionRow(m: Mission): void {
  selectedMissionId.value = m.id;
  // Scroll softly to map view
  if (mapSectionRef.value) {
    mapSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function resetFilters(): void {
  q.value = '';
  unionFilter.value = 'all';
  inspectorFilter.value = 'all';
  region.value = 'all';
  status.value = 'all';
  sourceFilter.value = 'all';
}

function handleNavigateToMission(m: Mission): void {
  const [destLat, destLng] = getMissionLatLng(m);
  navigateToLocation(destLat, destLng, (msg) => {
    $q.notify({
      type: 'info',
      message: `${msg} برای «${m.targetUnit || m.place}»`,
      timeout: 2500,
      position: 'top',
    });
  });
}

function handleToggleStatus(id: number): void {
  const user = sessionStore.session?.name ?? 'مدیر بازرسی';
  unitsStore.toggleMissionStatus(id, user);
}
</script>

<template>
  <div class="missions-page" data-testid="missions-page">
    <PageHeader
      :title="userRole === 'inspector' ? 'بازرسی واحدهای سازمانی' : 'مدیریت و نظارت جامع ماموریت‌های بازرسی و GIS'"
      :desc="userRole === 'inspector' ? 'نقشه حرارتی تراکم مأموریت‌های بازرسی و پایش موقعیت مکانی واحدهای تحت نظارت بازرس' : 'پایش لحظه‌ای روی نقشه ماهواره‌ای اهواز، پایش انطباق اتحادیه‌ها و صدور صورتجلسه رسمی A4'"
    >
      <button
        type="button"
        class="action-btn-primary"
        @click="router.push('/missions/inspections/new')"
        data-testid="header-register-field-inspection-btn"
        title="ثبت سرکشی میدانی جدید و صدور اخطاریه بدوی بازرس (مرحله ۱)"
      >
        <ClipboardCheck class="icon-sm" />
        <span>ثبت سرکشی میدانی (مرحله ۱)</span>
      </button>
    </PageHeader>

    <!-- KPI Summary Cards (4 Cards) -->
    <div class="kpi-grid">
      <StatCard
        label="کل ماموریت‌ها"
        :value="kpiStats.total"
        :icon="Target"
      />
      <StatCard
        label="در حال انجام میدانی"
        :value="kpiStats.active"
        :icon="Activity"
        tone="warning"
      />
      <StatCard
        label="در انتظار تأیید اتحادیه"
        :value="kpiStats.pending"
        :icon="FileCheck"
        tone="warning"
      />
      <StatCard
        label="تکمیل و بایگانی‌شده"
        :value="kpiStats.done"
        :icon="CheckCircle2"
        tone="success"
      />
    </div>

    <!-- Filter Bar -->
    <PanelCard>
      <div class="filter-grid">
        <div class="search-input-wrap">
          <Search class="search-icon" />
          <input
            v-model="q"
            type="text"
            placeholder="جست‌وجو با کد مأموریت، کد سیمبا، نام بازرس، واحد صنفی یا محله..."
            class="filter-input"
            data-testid="missions-search-input"
          />
        </div>

        <select
          v-if="userRole === 'general' || userRole === 'admin'"
          v-model="unionFilter"
          class="filter-select"
          data-testid="missions-union-select"
        >
          <option value="all">همه اتحادیه‌ها</option>
          <option v-for="u in availableUnions" :key="u" :value="u">
            {{ u }}
          </option>
        </select>

        <select
          v-if="userRole !== 'inspector'"
          v-model="inspectorFilter"
          class="filter-select"
          data-testid="missions-inspector-select"
        >
          <option value="all">همه بازرسان</option>
          <option v-for="ins in availableInspectors" :key="ins" :value="ins">
            {{ ins }}
          </option>
        </select>

        <select v-model="region" class="filter-select" data-testid="missions-region-select">
          <option value="all">همه مناطق اهواز</option>
          <option v-for="r in uniqueRegions" :key="r" :value="r">
            {{ fa(r) }}
          </option>
        </select>

        <select v-model="status" class="filter-select" data-testid="missions-status-select">
          <option value="all">همه وضعیت‌ها</option>
          <option value="active">در حال انجام</option>
          <option value="pending_approval">در انتظار تأیید اتحادیه</option>
          <option value="done">تکمیل‌شده</option>
        </select>

        <select v-model="sourceFilter" class="filter-select" data-testid="missions-source-select">
          <option value="all">همه منابع</option>
          <option value="simba_complaint">شکایت سامانه سیمبا</option>
          <option value="routine_inspection">سرکشی نوبتی و ادواری</option>
        </select>

        <button
          v-if="q || unionFilter !== 'all' || inspectorFilter !== 'all' || region !== 'all' || status !== 'all' || sourceFilter !== 'all'"
          type="button"
          class="btn-reset-filters"
          @click="resetFilters"
          data-testid="reset-missions-filters-btn"
          title="بازنشانی فیلترها"
        >
          <RotateCcw class="icon-xs" />
          <span>بازنشانی</span>
        </button>
      </div>
    </PanelCard>

    <!-- ۱. بخش اول: فهرست ماموریت‌ها (عرض کامل ۱۰۰٪ - ابتدا فهرست ماموریت‌ها نمایش داده می‌شود) -->
    <PanelCard :title="`فهرست ماموریت‌های بازرسی (${fa(filteredMissions.length)} مورد)`">
      <!-- Mobile View (Cards) -->
      <div class="mobile-missions-list" data-testid="mobile-missions-cards">
        <MissionCardItem
          v-for="m in filteredMissions"
          :key="m.id"
          :mission="m"
          @toggle-status="handleToggleStatus"
          @open-detail="openDetailModal(m)"
          @open-sheet="openReportSheet(m)"
          @view-on-map="handleSelectMissionRow(m)"
        />

        <div v-if="filteredMissions.length === 0" class="empty-list-notice">
          هیچ مأموریتی با این مشخصات یافت نشد.
        </div>
      </div>

      <!-- Desktop View: Horizontal Scrolling Full Table -->
      <div class="desktop-missions-table table-scroll-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-id">کد مأموریت</th>
              <th class="col-simba">کد سیمبا</th>
              <th class="col-source">منبع مأموریت</th>
              <th class="col-union">اتحادیه صنف</th>
              <th class="col-target">واحد صنفی هدف و متصدی</th>
              <th class="col-type">نوع بازرسی و اولویت</th>
              <th class="col-inspector">بازرس مأمور</th>
              <th class="col-place">محل و منطقه</th>
              <th class="col-time">ساعت و تاریخ</th>
              <th class="col-status">وضعیت مأموریت</th>
              <th class="col-actions">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in filteredMissions"
              :key="m.id"
              :class="['clickable-row', { 'row-is-selected': selectedMissionId === m.id }]"
              @click="handleSelectMissionRow(m)"
              :data-testid="`mission-row-${m.id}`"
              title="برای انتخاب و هایلایت روی نقشه GIS کلیک کنید"
            >
              <td class="col-id">
                <span class="mission-id-badge">
                  {{ fa(m.id) }}
                </span>
              </td>

              <td class="col-simba">
                <span v-if="m.simbaCode" class="simba-code-pill">
                  {{ m.simbaCode }}
                </span>
                <span v-else class="empty-simba-dash">
                  -
                </span>
              </td>

              <td class="col-source">
                <span :class="['source-pill', m.source === 'simba_complaint' ? 'is-simba' : 'is-routine']">
                  {{ m.source === 'simba_complaint' ? 'شکایت سیمبا' : 'سرکشی نوبتی' }}
                </span>
              </td>

              <td class="col-union">
                <span class="union-text">{{ m.union }}</span>
              </td>

              <td class="col-target">
                <div class="target-cell">
                  <span class="target-title">{{ m.targetUnit || 'واحدهای صنفی محدوده' }}</span>
                  <span v-if="m.operatorName" class="operator-sub">متصدی: {{ m.operatorName }}</span>
                </div>
              </td>

              <td class="col-type">
                <div class="type-priority-cell">
                  <span class="type-title" :title="m.type || 'بازرسی نوبتی و ادواری'">
                    {{ m.type || 'بازرسی نوبتی' }}
                  </span>
                  <span
                    v-if="m.priority"
                    :class="['priority-pill', `priority-${m.priority}`]"
                  >
                    {{ m.priority === 'urgent' ? 'فوری' : m.priority === 'high' ? 'مهم' : 'عادی' }}
                  </span>
                </div>
              </td>

              <td class="col-inspector">
                <div class="inspector-cell">
                  <UserCheck class="icon-xxs text-primary flex-shrink-0" />
                  <span class="inspector-name">{{ m.inspector }}</span>
                </div>
              </td>

              <td class="col-place">
                <div class="place-cell" :title="`${m.place} (${fa(m.region)})`">
                  <span class="place-name">{{ m.place }}</span>
                  <span class="region-sub">{{ fa(m.region) }}</span>
                </div>
              </td>

              <td class="col-time" dir="ltr">
                <div class="time-cell">
                  <span class="time-text">{{ fa(m.time) }}</span>
                  <span v-if="m.date" class="date-text">{{ fa(m.date) }}</span>
                </div>
              </td>

              <td class="col-status">
                <span
                  :class="[
                    'table-status-pill',
                    m.status === 'done'
                      ? 'is-done'
                      : m.status === 'pending_approval'
                        ? 'is-pending'
                        : 'is-active',
                  ]"
                >
                  {{
                    m.status === 'done'
                      ? 'تکمیل‌شده'
                      : m.status === 'pending_approval'
                        ? 'در انتظار تأیید اتحادیه'
                        : 'در حال انجام'
                  }}
                </span>
              </td>

              <td class="col-actions" @click.stop>
                <div class="table-actions-cell">
                  <button
                    type="button"
                    class="btn-op-action navigate"
                    @click="handleNavigateToMission(m)"
                    :title="`مسیریابی از موقعیت مکانی فعلی به محل مأموریت ${fa(m.id)}`"
                  >
                    <Navigation class="icon-xs" />
                    <span>مسیریابی</span>
                  </button>

                  <button
                    type="button"
                    class="btn-op-action map-focus"
                    @click="handleSelectMissionRow(m)"
                    :title="`هایلایت نقطه مأموریت ${fa(m.id)} روی نقشه`"
                    :data-testid="`table-highlight-map-${m.id}`"
                  >
                    <Navigation class="icon-xs" />
                    <span>روی نقشه</span>
                  </button>

                  <button
                    type="button"
                    class="btn-op-action sheet"
                    @click="openReportSheet(m)"
                    title="مشاهده و چاپ صورتجلسه رسمی A4"
                    :data-testid="`table-report-sheet-${m.id}`"
                  >
                    <FileCheck class="icon-xs" />
                    <span>گزارش A4</span>
                  </button>

                  <button
                    type="button"
                    class="btn-op-action detail"
                    @click="openDetailModal(m)"
                    title="مشاهده شناسنامه کامل و سوابق"
                    :data-testid="`table-detail-btn-${m.id}`"
                  >
                    <Eye class="icon-xs" />
                    <span>شناسنامه</span>
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="filteredMissions.length === 0">
              <td colspan="11" class="empty-list-notice">
                هیچ مأموریتی با این مشخصات یافت نشد.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </PanelCard>

    <!-- ۲. بخش دوم: نقشه GIS اهواز (عرض کامل ۱۰۰٪ - بعد از فهرست ماموریت‌ها نمایش داده می‌شود) -->
    <div ref="mapSectionRef" class="map-section-wrapper">
      <PanelCard title="سامانه اطلاعات جغرافیایی (GIS) و نقشه زنده اهواز">
        <template #action>
          <div v-if="selectedMissionId" class="selected-spot-indicator" dir="rtl">
            <span class="spot-pulse-ring"></span>
            <span>مأموریت انتخابی روی نقشه: کد {{ fa(selectedMissionId) }}</span>
            <button
              type="button"
              class="btn-clear-selection"
              @click="selectedMissionId = null"
              title="لغو انتخاب"
            >
              ✕
            </button>
          </div>
        </template>

        <AhvazOsmMap
          :missions="userRole === 'inspector' ? rbacMissions : unitsStore.missions"
          :selected-mission-id="selectedMissionId"
          :inspector-mode="userRole === 'inspector'"
          :inspector-name="userName"
          @select-mission="openDetailModal"
          height="580px"
          class="gis-map"
        />
      </PanelCard>
    </div>

    <!-- Modals -->
    <MissionDetailDialog
      v-model="showDetailDialog"
      :mission="selectedMission"
    />

    <MissionReportSheetDialog
      v-model="showReportSheetDialog"
      :mission="selectedMission"
    />

    <!-- Modal: فرم اختصاصی ثبت سرکشی میدانی بازرس و اخطاریه بدوی (مرحله ۱) -->
    <RegisterFieldInspectionDialog
      v-model="showRegisterFieldInspectionModal"
    />
  </div>
</template>

<style scoped lang="scss">
.missions-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.action-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding-block: 0.55rem;
  padding-inline: 1.1rem;
  border-radius: var(--radius-md);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
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
  min-width: 260px;
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
  min-width: 160px;

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
.mobile-missions-list {
  display: flex !important;
  flex-direction: column;
  gap: 0.875rem;

  @media (min-width: 900px) {
    display: none !important;
  }
}

.desktop-missions-table {
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
  min-width: 1350px;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.8125rem;

  th,
  td {
    white-space: nowrap;
    padding-block: 0.75rem;
    padding-inline: 0.75rem;
    text-align: start;
    border-bottom: 1px solid var(--border);
  }

  thead th {
    background-color: oklch(from var(--foreground) l c h / 4%);
    color: var(--muted-foreground);
    font-weight: 700;
    font-size: 0.75rem;
  }

  tbody tr.clickable-row {
    cursor: pointer;
    transition: background-color 0.12s ease;

    &:hover {
      background-color: oklch(from var(--primary) l c h / 5%);
    }

    &.row-is-selected {
      background-color: oklch(from var(--primary) l c h / 10%);
      outline: 2px solid var(--primary);
      outline-offset: -2px;
    }
  }
}

.mission-id-badge {
  font-family: monospace;
  font-weight: 700;
  color: var(--primary);
  background-color: oklch(from var(--primary) l c h / 10%);
  border: 1px solid oklch(from var(--primary) l c h / 20%);
  padding-block: 0.15rem;
  padding-inline: 0.45rem;
  border-radius: var(--radius-sm);
}

.simba-code-pill {
  font-family: monospace;
  font-weight: 700;
  color: #0284c7;
  background-color: rgba(2, 132, 199, 0.12);
  border: 1px solid rgba(2, 132, 199, 0.25);
  padding-block: 0.125rem;
  padding-inline: 0.45rem;
  border-radius: var(--radius-sm);
}

.empty-simba-dash {
  font-weight: 700;
  color: var(--muted-foreground);
}

.source-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.6875rem;
  font-weight: 700;
  padding-block: 0.125rem;
  padding-inline: 0.5rem;
  border-radius: 9999px;

  &.is-simba {
    background-color: rgba(6, 182, 212, 0.14);
    color: #0891b2;
  }

  &.is-routine {
    background-color: rgba(100, 116, 139, 0.14);
    color: #475569;
  }
}

.union-text {
  font-weight: 600;
  color: var(--foreground);
}

.target-cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  max-width: 220px;
}

.target-title {
  font-weight: 700;
  color: var(--foreground);
}

.operator-sub {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.type-priority-cell {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.type-title {
  color: var(--foreground);
}

.priority-pill {
  font-size: 0.625rem;
  font-weight: 700;
  padding-block: 0.1rem;
  padding-inline: 0.4rem;
  border-radius: var(--radius-sm);

  &.priority-urgent {
    background-color: rgba(239, 68, 68, 0.18);
    color: #dc2626;
  }
  &.priority-high {
    background-color: rgba(245, 158, 11, 0.18);
    color: #d97706;
  }
  &.priority-normal {
    background-color: rgba(59, 130, 246, 0.12);
    color: #2563eb;
  }
}

.inspector-cell {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.inspector-name {
  font-weight: 700;
  color: var(--foreground);
}

.place-cell {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.place-name {
  font-weight: 600;
  color: var(--foreground);
}

.region-sub {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.time-cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.75rem;
}

.time-text {
  font-weight: 600;
  color: var(--foreground);
}

.date-text {
  color: var(--muted-foreground);
}

.table-status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding-block: 0.18rem;
  padding-inline: 0.625rem;
  font-size: 0.6875rem;
  font-weight: 700;

  &.is-done {
    background-color: oklch(from var(--success) l c h / 15%);
    color: var(--success);
  }

  &.is-pending {
    background-color: rgba(168, 85, 247, 0.18);
    color: #9333ea;
  }

  &.is-active {
    background-color: oklch(from var(--warning) l c h / 25%);
    color: var(--warning-foreground);
  }
}

.table-actions-cell {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.btn-op-action {
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

  &.map-focus {
    background-color: var(--primary);
    color: var(--primary-foreground);

    &:hover {
      filter: brightness(1.1);
    }
  }

  &.sheet {
    background-color: rgba(16, 185, 129, 0.14);
    color: #059669;
    border-color: rgba(16, 185, 129, 0.25);

    &:hover {
      background-color: rgba(16, 185, 129, 0.22);
    }
  }

  &.detail {
    background-color: var(--secondary);
    color: var(--foreground);
    border-color: var(--border);

    &:hover {
      background-color: oklch(from var(--foreground) l c h / 8%);
    }
  }
}

.empty-list-notice {
  text-align: center;
  padding-block: 2rem;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

.map-section-wrapper {
  width: 100%;
}

.selected-spot-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: oklch(from var(--primary) l c h / 12%);
  color: var(--primary);
  border: 1px solid oklch(from var(--primary) l c h / 25%);
  border-radius: 9999px;
  padding-block: 0.25rem;
  padding-inline: 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.spot-pulse-ring {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background-color: #0284c7;
  box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.4);
  animation: pulse-ring-anim 1.4s infinite;
}

@keyframes pulse-ring-anim {
  0% { transform: scale(0.9); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.6; }
  100% { transform: scale(0.9); opacity: 1; }
}

.btn-clear-selection {
  background: transparent;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0 0.25rem;

  &:hover {
    color: var(--foreground);
  }
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
</style>

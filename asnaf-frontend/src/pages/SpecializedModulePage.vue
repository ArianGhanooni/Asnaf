<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from 'src/stores/session';
import { fa } from 'src/utils/fa';
import type { SpecializedUnionId, SpecializedUnitItem } from 'src/types/specialized';
import { specializedUnionsConfig } from 'src/utils/specializedData';
import { useSpecializedStore } from 'src/stores/specialized';
import PageHeader from 'src/components/gov/PageHeader.vue';
import PanelCard from 'src/components/gov/PanelCard.vue';
import StatCard from 'src/components/gov/StatCard.vue';
import AhvazSpecializedMap from 'src/components/specialized/AhvazSpecializedMap.vue';
import SpecializedModuleBarChart from 'src/components/specialized/SpecializedModuleBarChart.vue';
import SpecializedCardItem from 'src/components/specialized/SpecializedCardItem.vue';
import AssignInspectionDialog from 'src/components/missions/AssignInspectionDialog.vue';
import {
  Store,
  Package,
  AlertTriangle,
  CheckCircle2,
  Search,
  Navigation,
  Send,
  RotateCcw,
  Layers,
  ArrowRight,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const specializedStore = useSpecializedStore();

// استخراج شناسه اتحادیه از اسلاگ مسیر
const currentSlug = computed<SpecializedUnionId>(() => {
  const slug = (route.params.slug as string) || 'supermarket';
  if (specializedStore.getUnion(slug)) {
    return slug as SpecializedUnionId;
  }
  return 'supermarket';
});

const unionConfig = computed(() => {
  return (
    specializedStore.getUnion(currentSlug.value) ||
    specializedStore.unions['supermarket'] ||
    specializedUnionsConfig.supermarket
  );
});

// داده‌های واحدهای این ماژول
const allUnionUnits = computed<SpecializedUnitItem[]>(() => {
  return specializedStore.getUnitsForUnion(currentSlug.value);
});

// درصد عرض نقشه
const savedMapPercent = localStorage.getItem(`specialized_map_pct_${currentSlug.value}`);
const mapWidthPercent = ref<number>(
  savedMapPercent && !isNaN(Number(savedMapPercent)) ? Number(savedMapPercent) : 55
);

function setMapWidthPercent(pct: number): void {
  mapWidthPercent.value = Math.min(100, Math.max(25, pct));
  localStorage.setItem(`specialized_map_pct_${currentSlug.value}`, String(mapWidthPercent.value));
}

// انتخاب و هایلایت واحد روی نقشه
const selectedUnitId = ref<number | null>(null);
const mapSectionRef = ref<HTMLDivElement | null>(null);

// فیلترهای جدول
const searchQuery = ref('');
const categoryFilter = ref('all');
const statusFilter = ref('all');
const neighborhoodFilter = ref('all');

// دیالوگ تخصیص
const showAssignDialog = ref(false);

const uniqueNeighborhoods = computed(() => [
  ...new Set(allUnionUnits.value.map((u) => u.neighborhood)),
]);

const filteredUnits = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return allUnionUnits.value.filter((u) => {
    const matchesQ =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.operator.toLowerCase().includes(q) ||
      u.neighborhood.toLowerCase().includes(q) ||
      u.address.toLowerCase().includes(q);

    const matchesCat = categoryFilter.value === 'all' || u.category === categoryFilter.value;
    const matchesStatus = statusFilter.value === 'all' || u.status === statusFilter.value;
    const matchesNeigh =
      neighborhoodFilter.value === 'all' || u.neighborhood === neighborhoodFilter.value;

    return matchesQ && matchesCat && matchesStatus && matchesNeigh;
  });
});

function handleSelectUnit(unit: SpecializedUnitItem, shouldScroll = false): void {
  selectedUnitId.value = unit.id;
  if (shouldScroll && mapSectionRef.value) {
    mapSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function openAssignModal(): void {
  showAssignDialog.value = true;
}

function resetFilters(): void {
  searchQuery.value = '';
  categoryFilter.value = 'all';
  statusFilter.value = 'all';
  neighborhoodFilter.value = 'all';
}

// بازنشانی فیلترها و انتخاب با تغییر صنف
watch(
  () => currentSlug.value,
  () => {
    selectedUnitId.value = null;
    resetFilters();
  }
);
</script>

<template>
  <div class="specialized-module-page" :data-testid="`specialized-page-${currentSlug}`">
    <PageHeader
      :title="unionConfig.name"
      :desc="`${unionConfig.unionName} · ${unionConfig.description}`"
    >
      <div class="header-actions">
        <button
          type="button"
          class="btn-switch-hub"
          @click="router.push('/specialized')"
          title="مشاهده همه ماژول‌های تخصصی"
        >
          <Layers class="icon-xs" />
          <span>همه ماژول‌ها</span>
        </button>

        <button
          v-if="sessionStore.session?.role !== 'inspector'"
          type="button"
          class="btn-primary-action"
          @click="openAssignModal"
          :data-testid="`assign-btn-${currentSlug}`"
        >
          <Send class="icon-xs" />
          <span>تخصیص بازرسی به صنف</span>
        </button>
      </div>
    </PageHeader>

    <!-- KPI Summary Cards (4 Cards) -->
    <div class="kpi-grid">
      <StatCard
        v-for="(kpi, idx) in unionConfig.kpis"
        :key="idx"
        :label="kpi.label"
        :value="kpi.value"
        :tone="kpi.tone"
        :hint="kpi.hint"
        :icon="idx === 0 ? Store : idx === 1 ? Package : idx === 2 ? AlertTriangle : CheckCircle2"
      />
    </div>

    <!-- GIS Map & Bar Chart Grid -->
    <div
      ref="mapSectionRef"
      class="charts-grid"
      :class="{ 'full-width-map': mapWidthPercent >= 100 }"
      :style="{
        '--map-width-pct': `${mapWidthPercent}%`,
        '--chart-width-pct': `calc(${100 - mapWidthPercent}% - 1.5rem)`,
      }"
    >
      <PanelCard :title="`نقشه GIS پایش اهواز (${unionConfig.badgeText})`">
        <template #action>
          <div class="map-percent-control" dir="rtl">
            <span class="control-label">سهم نقشه:</span>
            <div class="percent-buttons">
              <button
                v-for="p in [35, 50, 65, 80, 100]"
                :key="p"
                type="button"
                :class="['percent-btn', { active: mapWidthPercent === p }]"
                @click="setMapWidthPercent(p)"
                :title="`تنظیم سهم عرض نقشه به ${fa(p)} درصد`"
              >
                {{ fa(p) }}٪
              </button>
            </div>
            <input
              type="range"
              min="25"
              max="100"
              step="5"
              :value="mapWidthPercent"
              @input="setMapWidthPercent(Number(($event.target as HTMLInputElement).value))"
              class="percent-range-slider"
              title="اسلایدر تنظیم درصد نقشه"
            />
            <span class="percent-indicator">{{ fa(mapWidthPercent) }}٪</span>
          </div>
        </template>

        <AhvazSpecializedMap
          :units="allUnionUnits"
          :union-config="unionConfig"
          :selected-unit-id="selectedUnitId"
          @select-unit="handleSelectUnit"
          class="gis-map"
        />
      </PanelCard>

      <PanelCard :title="unionConfig.chartConfig.title">
        <SpecializedModuleBarChart
          :units="filteredUnits"
          :union-config="unionConfig"
        />
      </PanelCard>
    </div>

    <!-- Filter Bar -->
    <PanelCard>
      <div class="filter-grid">
        <div class="search-input-wrap">
          <Search class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="جست‌وجو با نام واحد، متصدی، نشانی یا محله..."
            class="filter-input"
            data-testid="specialized-search-input"
          />
        </div>

        <select
          v-model="categoryFilter"
          class="filter-select"
          data-testid="specialized-category-select"
        >
          <option v-for="cat in unionConfig.categories" :key="cat" :value="cat === 'همه رسته‌ها' ? 'all' : cat">
            {{ cat }}
          </option>
        </select>

        <select
          v-model="statusFilter"
          class="filter-select"
          data-testid="specialized-status-select"
        >
          <option value="all">همه وضعیت‌ها</option>
          <option v-for="st in unionConfig.statuses" :key="st.value" :value="st.value">
            {{ st.label }}
          </option>
        </select>

        <select
          v-model="neighborhoodFilter"
          class="filter-select"
          data-testid="specialized-neighborhood-select"
        >
          <option value="all">تمام محلات اهواز</option>
          <option v-for="n in uniqueNeighborhoods" :key="n" :value="n">
            {{ n }}
          </option>
        </select>

        <button
          v-if="searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || neighborhoodFilter !== 'all'"
          type="button"
          class="btn-reset-filters"
          @click="resetFilters"
          title="بازنشانی فیلترها"
        >
          <RotateCcw class="icon-xs" />
          <span>بازنشانی</span>
        </button>
      </div>
    </PanelCard>

    <!-- Table Panel Card -->
    <PanelCard :title="`فهرست واحدهای تحت پایش ${unionConfig.name} (${fa(filteredUnits.length)} واحد)`">
      <!-- Mobile View (Cards) -->
      <div class="mobile-units-list" data-testid="mobile-specialized-cards">
        <SpecializedCardItem
          v-for="u in filteredUnits"
          :key="u.id"
          :unit="u"
          :union-config="unionConfig"
          @view-on-map="handleSelectUnit(u, true)"
          @assign-inspection="openAssignModal"
        />

        <div v-if="filteredUnits.length === 0" class="empty-list-notice">
          هیچ واحد صنفی مطابق فیلترهای انتخابی یافت نشد.
        </div>
      </div>

      <!-- Desktop View: Isolated Table Wrapper -->
      <div class="desktop-table-wrapper">
        <div class="table-scroll-container">
          <table class="data-table">
          <thead>
            <tr>
              <th class="col-id">کد</th>
              <th class="col-unit">نام واحد صنفی و متصدی</th>
              <th class="col-category">رسته شغلی</th>
              <th class="col-location">محله و نشانی</th>
              <th class="col-status">وضعیت پایش</th>
              <th class="col-metric1">{{ unionConfig.chartConfig.metric1Name }}</th>
              <th class="col-metric2">{{ unionConfig.chartConfig.metric2Name }}</th>
              <th class="col-date">آخرین بازرسی</th>
              <th class="col-actions">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in filteredUnits"
              :key="u.id"
              :class="['clickable-row', { 'row-is-selected': selectedUnitId === u.id }]"
              @click="handleSelectUnit(u, true)"
              :data-testid="`unit-row-${u.id}`"
              title="برای انتخاب و هایلایت روی نقشه GIS کلیک کنید"
            >
              <td class="col-id">
                <span class="unit-id-badge">{{ fa(u.id) }}</span>
              </td>

              <td class="col-unit">
                <div class="unit-cell">
                  <span class="unit-name">{{ u.name }}</span>
                  <span class="operator-name">متصدی: {{ u.operator }}</span>
                </div>
              </td>

              <td class="col-category">
                <span class="category-chip">{{ u.category }}</span>
              </td>

              <td class="col-location">
                <div class="location-cell" :title="`${u.neighborhood} - ${u.address}`">
                  <span class="neighborhood-tag">{{ u.neighborhood }}</span>
                  <span class="address-snippet">{{ u.address }}</span>
                </div>
              </td>

              <td class="col-status">
                <span :class="['table-status-pill', `status-${u.status}`]">
                  {{ u.statusLabel }}
                </span>
              </td>

              <td class="col-metric1">
                <span class="metric-val">{{ fa(u.metric1Value) }}</span>
              </td>

              <td class="col-metric2">
                <span class="metric-val text-success">{{ fa(u.metric2Value) }}</span>
              </td>

              <td class="col-date" dir="ltr">
                <div class="date-cell">
                  <span class="date-text">{{ fa(u.lastInspectionDate) }}</span>
                  <span v-if="u.inspectorName" class="inspector-sub">{{ u.inspectorName }}</span>
                </div>
              </td>

              <td class="col-actions" @click.stop>
                <div class="table-actions-cell">
                  <button
                    type="button"
                    class="btn-table-action map"
                    @click="handleSelectUnit(u, true)"
                    :title="`هایلایت واحد ${u.name} روی نقشه`"
                  >
                    <Navigation class="icon-xs" />
                    <span>روی نقشه</span>
                  </button>

                  <button
                    type="button"
                    class="btn-table-action assign"
                    @click="openAssignModal"
                    title="تخصیص بازرس"
                  >
                    <Send class="icon-xs" />
                    <span>بازرسی</span>
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="filteredUnits.length === 0">
              <td colspan="9" class="empty-list-notice">
                هیچ واحد صنفی مطابق مشخصات فیلتر شده یافت نشد.
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </PanelCard>

    <!-- Dialog -->
    <AssignInspectionDialog
      v-model="showAssignDialog"
    />
  </div>
</template>

<style scoped lang="scss">
.specialized-module-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.btn-switch-hub {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding-block: 0.55rem;
  padding-inline: 0.875rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--secondary);
  color: var(--foreground);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: oklch(from var(--foreground) l c h / 8%);
  }
}

.btn-primary-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding-block: 0.55rem;
  padding-inline: 1rem;
  border-radius: var(--radius-md);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-size: 0.8125rem;
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

.charts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-template-columns: var(--map-width-pct, 55%) var(--chart-width-pct, calc(45% - 1.5rem));
  }

  &.full-width-map {
    grid-template-columns: 1fr;
  }
}

.map-percent-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-label {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.percent-buttons {
  display: inline-flex;
  background-color: var(--secondary);
  border-radius: var(--radius-md);
  padding: 2px;
  border: 1px solid var(--border);
}

.percent-btn {
  padding-block: 0.2rem;
  padding-inline: 0.45rem;
  font-size: 0.6875rem;
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--muted-foreground);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s ease;

  &.active {
    background-color: var(--card);
    color: var(--primary);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
}

.percent-range-slider {
  width: 70px;
  height: 4px;
  accent-color: var(--primary);
  cursor: pointer;
  display: none;

  @media (min-width: 1280px) {
    display: inline-block;
  }
}

.percent-indicator {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
  min-width: 32px;
}

.filter-grid {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.search-input-wrap {
  position: relative;
  flex: 1;
  min-width: 220px;
}

.search-icon {
  position: absolute;
  inset-inline-start: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: var(--muted-foreground);
}

.filter-input {
  width: 100%;
  padding-block: 0.55rem;
  padding-inline-start: 2.25rem;
  padding-inline-end: 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  font-size: 0.8125rem;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
}

.filter-select {
  padding-block: 0.55rem;
  padding-inline: 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  font-size: 0.8125rem;
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
  padding-block: 0.5rem;
  padding-inline: 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--secondary);
  color: var(--muted-foreground);
  font-size: 0.75rem;
  cursor: pointer;

  &:hover {
    color: var(--foreground);
  }
}

// Table & Mobile list
.desktop-table-wrapper {
  display: block;
}

.mobile-units-list {
  display: none;
}

@media (max-width: 900px) {
  .desktop-table-wrapper {
    display: none !important;
  }

  .mobile-units-list {
    display: flex !important;
    flex-direction: column;
    gap: 0.875rem;
  }
}

.table-scroll-container {
  width: 100%;
  overflow-x: auto;
  border-radius: var(--radius-md);
}

.data-table {
  width: 100%;
  min-width: 1100px;
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

.unit-id-badge {
  font-family: monospace;
  font-weight: 700;
  color: var(--primary);
  background-color: oklch(from var(--primary) l c h / 10%);
  border: 1px solid oklch(from var(--primary) l c h / 20%);
  padding-block: 0.15rem;
  padding-inline: 0.45rem;
  border-radius: var(--radius-sm);
}

.unit-cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.unit-name {
  font-weight: 700;
  color: var(--foreground);
}

.operator-name {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.category-chip {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--primary);
  background-color: oklch(from var(--primary) l c h / 8%);
  padding-block: 0.125rem;
  padding-inline: 0.45rem;
  border-radius: var(--radius-sm);
}

.location-cell {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 260px;
}

.neighborhood-tag {
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

.table-status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding-block: 0.15rem;
  padding-inline: 0.625rem;
  font-size: 0.6875rem;
  font-weight: 700;

  &.status-normal {
    background-color: rgba(16, 185, 129, 0.15);
    color: #059669;
  }
  &.status-warning {
    background-color: rgba(245, 158, 11, 0.18);
    color: #d97706;
  }
  &.status-alert {
    background-color: rgba(239, 68, 68, 0.18);
    color: #dc2626;
  }
}

.metric-val {
  font-weight: 700;
  color: var(--foreground);
}

.text-success {
  color: #10b981;
}

.date-cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.75rem;
}

.date-text {
  color: var(--foreground);
}

.inspector-sub {
  color: var(--muted-foreground);
  font-size: 0.6875rem;
}

.table-actions-cell {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.btn-table-action {
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

  &.map {
    background-color: var(--primary);
    color: var(--primary-foreground);

    &:hover {
      filter: brightness(1.1);
    }
  }

  &.assign {
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

.icon-xs {
  width: 0.875rem;
  height: 0.875rem;
}
</style>

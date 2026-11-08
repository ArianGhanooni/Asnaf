<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUnitsStore } from 'src/stores/units';
import type { InspectorWarningReportItem } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import { useQuasar } from 'quasar';
import JalaliDateRangeFilter, { type DateRange } from 'src/components/common/JalaliDateRangeFilter.vue';
import StatusPill from 'src/components/gov/StatusPill.vue';
import {
  Search,
  FileText,
  Printer,
  ShieldAlert,
  MapPin,
  User,
  Calendar,
  Building2,
} from 'lucide-vue-next';

const $q = useQuasar();
const unitsStore = useUnitsStore();

// Single unified search input covering all fields across all records
const universalQuery = ref('');
const dateRange = ref<DateRange>({ from: '', to: '' });

const filteredList = computed(() => {
  return unitsStore.inspectorWarnings.filter((item) => {
    // فیلتر جستجوی تک‌ورودی سراسری (نام بازرس، شناسه، مشخصات واحد، تخلف، آدرس، منطقه)
    const q = universalQuery.value.trim().toLowerCase();
    if (q) {
      const isMatch = [
        String(item.id),
        item.inspectorName,
        item.unitName,
        item.operatorName,
        item.nationalId,
        item.violationType,
        item.address,
        item.region,
      ].some((val) => val.toLowerCase().includes(q));
      if (!isMatch) return false;
    }

    // فیلتر تاریخ شمسی
    if (dateRange.value.from && item.registeredDate < dateRange.value.from) {
      return false;
    }
    if (dateRange.value.to && item.registeredDate > dateRange.value.to) {
      return false;
    }

    return true;
  });
});

function viewDetails(item: InspectorWarningReportItem): void {
  $q.dialog({
    title: `پرونده اخطار ${fa(item.id)}`,
    message: `بازرس ثبت‌کننده: ${item.inspectorName}\nواحد صنفی: ${item.unitName}\nمتصدی: ${item.operatorName} (${fa(item.nationalId)})\nنوع تخلف: ${item.violationType}\nآدرس و موقعیت: ${item.address} (${item.region})\nتاریخ ثبت: ${item.registeredDate}`,
    ok: { label: 'بستن', color: 'primary' },
  });
}

function printSummary(item: InspectorWarningReportItem): void {
  $q.notify({
    type: 'positive',
    message: `برگه اخطار رسمی شماره ${fa(item.id)} آماده چاپ شد.`,
    position: 'top',
  });
}
</script>

<template>
  <div class="inspector-warnings-table-wrap" data-testid="inspector-warnings-report">
    <!-- Filter Bar: Universal Search Input + Jalali Date Range -->
    <div class="table-filter-bar">
      <div class="search-input-wrap">
        <Search class="search-icon" />
        <input
          v-model="universalQuery"
          type="text"
          placeholder="جستجوی عمومی و یکپارچه در همه فیلدها (نام بازرس، شناسه پرونده، مشخصات واحد، نوع تخلف، آدرس)..."
          class="universal-search-input"
          data-testid="universal-report-search"
        />
      </div>

      <JalaliDateRangeFilter
        v-model="dateRange"
        label="فیلتر تاریخ ثبت"
      />
    </div>

    <!-- Desktop Table View -->
    <div class="desktop-table-wrapper">
      <div class="table-responsive">
        <table class="data-table">
        <thead>
          <tr>
            <th>شناسه</th>
            <th>بازرس</th>
            <th>مشخصات واحد صنفی</th>
            <th>نوع تخلف</th>
            <th>آدرس و موقعیت</th>
            <th>تاریخ ثبت</th>
            <th>عملیات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredList" :key="item.id" data-testid="inspector-warning-row">
            <!-- ۱. شناسه -->
            <td class="font-bold">{{ fa(item.id) }}</td>

            <!-- ۲. بازرس -->
            <td>
              <div class="inspector-cell">
                <User class="icon-xs text-muted-foreground" />
                <span class="inspector-name">{{ item.inspectorName }}</span>
              </div>
            </td>

            <!-- ۳. مشخصات واحد صنفی -->
            <td>
              <p class="unit-name">{{ item.unitName }}</p>
              <p class="unit-sub">متصدی: {{ item.operatorName }} · کدملی: {{ fa(item.nationalId) }}</p>
            </td>

            <!-- ۴. نوع تخلف -->
            <td>
              <span class="violation-badge">{{ item.violationType }}</span>
            </td>

            <!-- ۵. آدرس و موقعیت -->
            <td>
              <div class="address-cell">
                <MapPin class="icon-xs text-muted-foreground flex-shrink-0" />
                <span class="address-text" :title="item.address">{{ item.address }}</span>
              </div>
              <span class="region-sub">{{ item.region }}</span>
            </td>

            <!-- ۶. تاریخ ثبت (شمسی) -->
            <td class="date-cell">{{ item.registeredDate }}</td>

            <!-- ۷. عملیات -->
            <td>
              <div class="actions-group">
                <button
                  type="button"
                  class="btn-action"
                  title="مشاهده پرونده"
                  @click="viewDetails(item)"
                >
                  <FileText class="icon-sm" />
                </button>
                <button
                  type="button"
                  class="btn-action"
                  title="چاپ برگه اخطار"
                  @click="printSummary(item)"
                >
                  <Printer class="icon-sm" />
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="filteredList.length === 0">
            <td colspan="7" class="empty-state">
              هیچ رکوردی منطبق با جستجوی سراسری و بازه تاریخ انتخاب‌شده یافت نشد.
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <!-- Mobile Cards View for Screens <= 768px -->
    <div class="mobile-cards-wrapper" dir="rtl">
      <div
        v-for="item in filteredList"
        :key="`mobile-${item.id}`"
        class="mobile-report-card"
        data-testid="inspector-warning-mobile-card"
      >
        <div class="card-head">
          <div class="card-head-top">
            <div class="card-id-badge">
              <span class="id-label">شناسه:</span>
              <span class="id-val font-bold">{{ fa(item.id) }}</span>
            </div>
            <span class="violation-badge">{{ item.violationType }}</span>
          </div>
          <h4 class="card-unit-title">{{ item.unitName }}</h4>
          <p class="card-unit-sub">متصدی: {{ item.operatorName }} · کدملی: {{ fa(item.nationalId) }}</p>
        </div>

        <div class="card-body-details">
          <div class="card-info-item">
            <User class="icon-xxs text-muted" />
            <span class="info-label">بازرس ثبت‌کننده:</span>
            <span class="info-val font-medium">{{ item.inspectorName }}</span>
          </div>

          <div class="card-info-item">
            <MapPin class="icon-xxs text-muted" />
            <span class="info-label">موقعیت:</span>
            <span class="info-val">{{ item.address }} ({{ item.region }})</span>
          </div>

          <div class="card-info-item">
            <Calendar class="icon-xxs text-muted" />
            <span class="info-label">تاریخ ثبت:</span>
            <span class="info-val">{{ item.registeredDate }}</span>
          </div>
        </div>

        <div class="card-actions-bar">
          <button
            type="button"
            class="mobile-action-btn"
            title="مشاهده پرونده"
            @click="viewDetails(item)"
          >
            <FileText class="icon-xs" />
            <span>مشاهده پرونده</span>
          </button>
          <button
            type="button"
            class="mobile-action-btn print-btn"
            title="چاپ برگه اخطار"
            @click="printSummary(item)"
          >
            <Printer class="icon-xs" />
            <span>چاپ اخطار</span>
          </button>
        </div>
      </div>

      <div v-if="filteredList.length === 0" class="empty-state shadow-card">
        هیچ رکوردی منطبق با جستجو و تاریخ انتخاب‌شده یافت نشد.
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.inspector-warnings-table-wrap {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.table-filter-bar {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: 1fr auto;
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

.universal-search-input {
  width: 100%;
  height: 2.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding: 0 0.75rem;
  padding-inline-end: 2.25rem;
  font-size: 0.8125rem;
  outline: none;

  &:focus {
    border-color: var(--primary);
  }
}

.data-table {
  width: 100%;
  min-width: 56rem;
  border-collapse: collapse;
  font-size: 0.8125rem;
  text-align: right;
  color: var(--foreground);

  th {
    padding: 0.75rem;
    font-weight: 600;
    color: var(--muted-foreground);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
    background-color: var(--muted);
  }

  td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
    color: var(--foreground);
  }

  tbody tr {
    transition: background-color 0.15s ease;

    &:hover {
      background-color: oklch(from var(--muted) l c h / 50%);
    }
  }
}

.font-bold {
  font-weight: 700;
  color: var(--foreground);
}

.inspector-cell {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-weight: 600;
  color: var(--foreground);
}

.inspector-name {
  color: var(--foreground);
}

.unit-name {
  font-weight: 600;
  color: var(--foreground);
  margin: 0;
}

.unit-sub {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  margin: 0.125rem 0 0;
}

.violation-badge {
  display: inline-block;
  padding: 0.1875rem 0.5rem;
  border-radius: var(--radius-sm);
  background-color: var(--warning-bg);
  color: var(--warning-foreground);
  border: 1px solid oklch(from var(--warning) l c h / 30%);
  font-size: 0.6875rem;
  font-weight: 600;
}

.address-cell {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 16rem;
}

.address-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--foreground);
}

.region-sub {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  display: block;
  margin-top: 0.125rem;
}

.date-cell {
  white-space: nowrap;
  font-size: 0.75rem;
  color: var(--foreground);
}

.actions-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted-foreground);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--muted);
    color: var(--primary);
    border-color: var(--primary);
  }
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.icon-xs {
  width: 0.8125rem;
  height: 0.8125rem;
}

.desktop-table-wrapper {
  display: block;

  @media (max-width: 768px) {
    display: none !important;
  }
}

.mobile-cards-wrapper {
  display: none !important;

  @media (max-width: 768px) {
    display: flex !important;
    flex-direction: column;
    gap: 0.875rem;
  }
}

.mobile-report-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background-color: var(--card);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
}

.card-head {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.card-head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.card-id-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;

  .id-label {
    color: var(--muted-foreground);
  }

  .id-val {
    color: var(--foreground);
  }
}

.card-unit-title {
  font-size: 0.9375rem;
  font-weight: 700;
  margin: 0.25rem 0 0;
  color: var(--foreground);
}

.card-unit-sub {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0;
}

.card-body-details {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  background-color: var(--muted);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  font-size: 0.75rem;
}

.card-info-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;

  .info-label {
    color: var(--muted-foreground);
  }

  .info-val {
    color: var(--foreground);
  }
}

.card-actions-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.25rem;
  border-top: 1px dashed var(--border);
}

.mobile-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.45rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--muted);
    border-color: var(--primary);
  }

  &.print-btn {
    color: var(--primary);
  }
}

.icon-xxs {
  width: 0.8125rem;
  height: 0.8125rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 0;
  color: var(--muted-foreground);
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSessionStore } from 'src/stores/session';
import { bakeries } from 'src/utils/data';
import { fa } from 'src/utils/fa';
import type { Bakery } from 'src/types/asnaf';
import PageHeader from 'src/components/gov/PageHeader.vue';
import PanelCard from 'src/components/gov/PanelCard.vue';
import StatCard from 'src/components/gov/StatCard.vue';
import AhvazBakeryMap from 'src/components/bread/AhvazBakeryMap.vue';
import BakeryBarChart from 'src/components/gov/BakeryBarChart.vue';
import {
  Wheat,
  Store,
  Package,
  AlertTriangle,
} from 'lucide-vue-next';

const sessionStore = useSessionStore();
const full = computed(() => sessionStore.session?.role === 'general');

// درصد سهم عرض نقشه (قابل تنظیم توسط کاربر و ماندگار در localStorage)
const savedMapPercent = localStorage.getItem('bakery_map_percent');
const mapWidthPercent = ref<number>(
  savedMapPercent && !isNaN(Number(savedMapPercent)) ? Number(savedMapPercent) : 55
);

function setMapWidthPercent(pct: number): void {
  mapWidthPercent.value = Math.min(100, Math.max(25, pct));
  localStorage.setItem('bakery_map_percent', String(mapWidthPercent.value));
}

// انتخاب و هایلایت نانوایی از روی نقشه
const selectedBakery = ref<string | null>(null);

function handleSelectBakery(b: Bakery): void {
  selectedBakery.value = b.name;
}

function getStatusTone(status: string): 'success' | 'warning' | 'destructive' {
  if (status === 'عادی') return 'success';
  if (status === 'کسری سهمیه') return 'warning';
  return 'destructive';
}
</script>

<template>
  <div class="bread-page">
    <PageHeader
      title="ماژول جامع نان و آرد"
      :desc="full ? 'مدیریت سهمیه و نظارت بر آرد و نان' : 'دسترسی مشاهده نانوایی‌ها'"
    />

    <div class="kpi-grid">
      <StatCard label="خبازی‌های فعال" :value="1284" :icon="Store" />
      <StatCard label="سهمیه آرد ماهانه (تن)" :value="4620" :icon="Package" tone="accent" />
      <StatCard
        label="انحراف مشکوک"
        :value="bakeries.filter((b) => b.status === 'انحراف مشکوک').length"
        :icon="AlertTriangle"
        tone="destructive"
      />
      <StatCard label="بازرسی خبازی (ماه جاری)" :value="312" :icon="Wheat" tone="success" />
    </div>

    <!-- GIS Map & Bar Chart Grid -->
    <div
      class="charts-grid"
      :class="{ 'full-width-map': mapWidthPercent >= 100 }"
      :style="{
        '--map-width-pct': `${mapWidthPercent}%`,
        '--chart-width-pct': `calc(${100 - mapWidthPercent}% - 1.5rem)`,
      }"
    >
      <PanelCard title="نقشه GIS پایش سهمیه‌ای نانوایی‌های اهواز">
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
                :data-testid="`bakery-map-pct-${p}`"
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
              data-testid="bakery-map-percent-range"
            />
            <span class="percent-indicator">{{ fa(mapWidthPercent) }}٪</span>
          </div>
        </template>

        <AhvazBakeryMap
          :bakeries="bakeries"
          @select-bakery="handleSelectBakery"
          class="gis-map"
        />
      </PanelCard>

      <PanelCard title="سهمیه / دریافت / مصرف (کیسه)">
        <BakeryBarChart />
      </PanelCard>
    </div>

    <PanelCard title="پایش سهمیه آرد یارانه‌ای خبازی‌های اهواز">
      <!-- Desktop Table View -->
      <div class="desktop-table-wrapper">
        <div class="table-responsive">
          <table class="data-table">
          <thead>
            <tr>
              <th>نانوایی</th>
              <th>محله</th>
              <th>نوع نان</th>
              <th>سهمیه (کیسه)</th>
              <th>دریافتی</th>
              <th>نسبت مصرف</th>
              <th>وضعیت سهمیه</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="b in bakeries"
              :key="b.name"
              :class="{ 'highlight-row': selectedBakery === b.name }"
              :data-testid="`bakery-row-${b.name}`"
            >
              <td class="font-bold">
                <div class="bakery-cell">
                  <span>{{ b.name }}</span>
                  <span v-if="b.operator" class="operator-sub">{{ b.operator }}</span>
                </div>
              </td>
              <td>
                <span class="neighborhood-tag">{{ b.neighborhood || 'اهواز' }}</span>
              </td>
              <td>{{ b.type }}</td>
              <td>{{ fa(b.quota) }}</td>
              <td>{{ fa(b.received) }}</td>
              <td class="progress-col">
                <div class="progress-wrap">
                  <div class="progress-track">
                    <div
                      class="progress-fill"
                      :style="{ width: `${Math.min(100, (b.used / b.quota) * 100)}%` }"
                    />
                  </div>
                  <span class="progress-label">{{ fa(Math.round((b.used / b.quota) * 100)) }}٪</span>
                </div>
              </td>
              <td>
                <span :class="['status-pill', `tone-${getStatusTone(b.status)}`]">
                  {{ b.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <!-- Mobile Cards View -->
      <div class="mobile-bakery-cards" dir="rtl">
        <div
          v-for="b in bakeries"
          :key="b.name"
          class="mobile-bakery-card"
          :class="{ 'highlight-card': selectedBakery === b.name }"
          :data-testid="`bakery-card-${b.name}`"
        >
          <div class="bakery-card-top">
            <div class="bakery-title-info">
              <span class="bakery-name">{{ b.name }}</span>
              <span v-if="b.operator" class="bakery-operator">متصدی: {{ b.operator }}</span>
            </div>
            <span :class="['status-pill', `tone-${getStatusTone(b.status)}`]">
              {{ b.status }}
            </span>
          </div>

          <div class="bakery-card-tags">
            <span class="neighborhood-tag">{{ b.neighborhood || 'اهواز' }}</span>
            <span class="type-tag">{{ b.type }}</span>
          </div>

          <div class="bakery-card-metrics">
            <div class="metric-box">
              <span class="m-label">سهمیه مصوب:</span>
              <strong class="m-val">{{ fa(b.quota) }} <small>کیسه</small></strong>
            </div>
            <div class="metric-box">
              <span class="m-label">دریافتی:</span>
              <strong class="m-val">{{ fa(b.received) }} <small>کیسه</small></strong>
            </div>
          </div>

          <div class="bakery-card-progress">
            <div class="progress-info">
              <span class="p-title">نسبت مصرف سهمیه:</span>
              <span class="p-pct">{{ fa(Math.round((b.used / b.quota) * 100)) }}٪</span>
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: `${Math.min(100, (b.used / b.quota) * 100)}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </PanelCard>
  </div>
</template>

<style scoped lang="scss">
.bread-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.kpi-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(1, 1fr);

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1280px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

.charts-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
  width: 100%;
  transition: all 0.25s ease;

  @media (min-width: 1280px) {
    grid-template-columns: var(--map-width-pct, 55%) var(--chart-width-pct, calc(45% - 1.5rem));

    &.full-width-map {
      grid-template-columns: 1fr;
    }
  }
}

.map-percent-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  flex-wrap: wrap;
}

.control-label {
  color: var(--muted-foreground);
  font-size: 0.6875rem;
  font-weight: 600;
  white-space: nowrap;
}

.percent-buttons {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background-color: var(--muted);
  padding: 0.15rem;
  border-radius: var(--radius-md);
}

.percent-btn {
  height: 1.625rem;
  padding-inline: 0.45rem;
  font-size: 0.6875rem;
  font-weight: 700;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: var(--foreground);
  }

  &.active {
    background-color: var(--card);
    color: var(--primary);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
}

.percent-range-slider {
  width: 75px;
  height: 4px;
  cursor: pointer;
  accent-color: var(--primary);

  @media (max-width: 640px) {
    display: none;
  }
}

.percent-indicator {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--primary);
  min-width: 32px;
  text-align: center;
  font-family: monospace;
}

.gis-map {
  height: 520px;
}

.bakery-cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.operator-sub {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  font-weight: 400;
}

.neighborhood-tag {
  display: inline-block;
  background-color: var(--muted);
  color: var(--foreground);
  font-size: 0.75rem;
  font-weight: 600;
  padding-block: 0.1rem;
  padding-inline: 0.4rem;
  border-radius: var(--radius-sm);
}

.highlight-row {
  background-color: oklch(from var(--primary) l c h / 10%) !important;
  outline: 2px solid var(--primary);
}

.desktop-table-wrapper {
  display: block;
  width: 100%;

  @media (max-width: 768px) {
    display: none !important;
  }
}

.mobile-bakery-cards {
  display: none !important;
  flex-direction: column;
  gap: 0.875rem;

  @media (max-width: 768px) {
    display: flex !important;
  }
}

.mobile-bakery-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0.875rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &.highlight-card {
    border-color: var(--primary);
    background-color: oklch(from var(--primary) l c h / 6%);
  }

  .bakery-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .bakery-title-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;

    .bakery-name {
      font-weight: 700;
      font-size: 0.9375rem;
      color: var(--foreground);
    }
    .bakery-operator {
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }
  }

  .bakery-card-tags {
    display: flex;
    align-items: center;
    gap: 0.375rem;

    .type-tag {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      background-color: var(--secondary);
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-sm);
    }
  }

  .bakery-card-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px dashed var(--border);

    .metric-box {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;

      .m-label {
        font-size: 0.6875rem;
        color: var(--muted-foreground);
      }
      .m-val {
        font-size: 0.875rem;
        color: var(--foreground);
      }
    }
  }

  .bakery-card-progress {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding-top: 0.375rem;

    .progress-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;

      .p-title {
        color: var(--muted-foreground);
      }
      .p-pct {
        font-weight: 700;
        color: var(--primary);
      }
    }
  }
}

.table-responsive {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.data-table {
  width: 100%;
  min-width: 48rem;
  border-collapse: collapse;
  font-size: 0.875rem;
  text-align: right;

  th {
    padding: 0.75rem 0.75rem;
    font-weight: 600;
    color: var(--muted-foreground);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  td {
    padding: 0.75rem 0.75rem;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
}

.font-bold {
  font-weight: 600;
  white-space: nowrap;
}

.progress-col {
  width: 12rem;
  min-width: 10rem;
  white-space: nowrap;
}

.progress-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-track {
  flex: 1;
  height: 0.5rem;
  border-radius: 9999px;
  background-color: var(--secondary);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary);
  border-radius: 9999px;
}

.progress-label {
  font-size: 0.75rem;
  min-width: 2rem;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 0.125rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;

  &.tone-success {
    background-color: oklch(from var(--success) l c h / 15%);
    color: var(--success);
  }
  &.tone-warning {
    background-color: oklch(from var(--warning) l c h / 25%);
    color: var(--warning-foreground);
  }
  &.tone-destructive {
    background-color: oklch(from var(--destructive) l c h / 12%);
    color: var(--destructive);
  }
}
</style>

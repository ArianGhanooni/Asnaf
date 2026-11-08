<script setup lang="ts">
import { ref, computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useSessionStore } from 'src/stores/session';
import { fa } from 'src/utils/fa';
import { ShieldAlert, AlertTriangle, Percent } from 'lucide-vue-next';

type TimeRange = 'daily' | 'monthly' | 'yearly';

const sessionStore = useSessionStore();
const activeRange = ref<TimeRange>('monthly');

// Datasets for 3 distinct timeframes
const datasetMap: Record<
  TimeRange,
  {
    title: string;
    categories: string[];
    warnings: number[];
    seals: number[];
  }
> = {
  daily: {
    title: 'روند روزانه ۳۰ روز اخیر (مهر ۱۴۰۵)',
    categories: Array.from({ length: 30 }, (_, i) => `${fa(i + 1)} مهر`),
    warnings: [
      14, 18, 12, 22, 25, 17, 13, 28, 24, 21,
      19, 27, 31, 26, 22, 18, 20, 24, 28, 23,
      21, 18, 29, 32, 24, 20, 26, 28, 25, 22,
    ],
    seals: [
      2, 3, 1, 4, 5, 2, 1, 5, 4, 3,
      2, 6, 5, 4, 3, 2, 3, 5, 6, 4,
      3, 2, 5, 6, 4, 3, 5, 4, 3, 2,
    ],
  },
  monthly: {
    title: 'روند ماهانه سال ۱۴۰۵',
    categories: [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
    ],
    warnings: [42, 65, 58, 84, 79, 96, 89, 95, 102, 115, 108, 124],
    seals: [6, 8, 10, 15, 12, 18, 16, 19, 22, 26, 21, 28],
  },
  yearly: {
    title: 'روند سالانه ۵ سال گذشته (۱۴۰۱ تا ۱۴۰۵)',
    categories: ['۱۴۰۱', '۱۴۰۲', '۱۴۰۳', '۱۴۰۴', '۱۴۰۵'],
    warnings: [480, 620, 790, 980, 1240],
    seals: [72, 95, 128, 162, 215],
  },
};

const currentData = computed(() => datasetMap[activeRange.value]);

const totalWarnings = computed(() =>
  currentData.value.warnings.reduce((sum, v) => sum + v, 0)
);

const totalSeals = computed(() =>
  currentData.value.seals.reduce((sum, v) => sum + v, 0)
);

const sealRatio = computed(() => {
  if (totalWarnings.value === 0) return '۰٪';
  const ratio = ((totalSeals.value / totalWarnings.value) * 100).toFixed(1);
  return `${fa(ratio)}٪`;
});

const series = computed(() => [
  {
    name: 'اخطارها',
    data: currentData.value.warnings,
  },
  {
    name: 'احکام پلمپ',
    data: currentData.value.seals,
  },
]);

const isDark = computed(() => sessionStore.theme === 'dark');

const chartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'area',
    height: 310,
    fontFamily: 'Vazirmatn, Vazir, sans-serif',
    background: 'transparent',
    toolbar: {
      show: true,
      tools: {
        download: true,
        selection: false,
        zoom: true,
        zoomin: true,
        zoomout: true,
        pan: true,
        reset: true,
      },
      export: {
        embedFonts: false,
      },
    },
    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 500,
    },
  },
  theme: {
    mode: isDark.value ? 'dark' : 'light',
  },
  colors: ['#2563eb', '#dc2626'],
  dataLabels: {
    enabled: false,
  },
  stroke: {
    curve: 'smooth',
    width: [3, 2.5],
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.45,
      opacityTo: 0.05,
      stops: [0, 95, 100],
    },
  },
  markers: {
    size: activeRange.value === 'daily' ? 2 : 4,
    hover: {
      size: 6,
    },
  },
  grid: {
    borderColor: isDark.value ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    strokeDashArray: 4,
    xaxis: {
      lines: {
        show: false,
      },
    },
  },
  xaxis: {
    categories: currentData.value.categories,
    labels: {
      rotate: activeRange.value === 'daily' ? -45 : 0,
      rotateAlways: false,
      style: {
        colors: isDark.value ? '#94a3b8' : '#64748b',
        fontSize: '11px',
        fontFamily: 'Vazirmatn, Vazir, sans-serif',
      },
    },
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
  },
  yaxis: {
    labels: {
      formatter: (val: number) => fa(Math.round(val)),
      style: {
        colors: isDark.value ? '#94a3b8' : '#64748b',
        fontSize: '11px',
        fontFamily: 'Vazirmatn, Vazir, sans-serif',
      },
    },
  },
  tooltip: {
    theme: isDark.value ? 'dark' : 'light',
    style: {
      fontFamily: 'Vazirmatn, Vazir, sans-serif',
      fontSize: '12px',
    },
    y: {
      formatter: (val: number) => `${fa(val)} مورد`,
    },
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right',
    fontFamily: 'Vazirmatn, Vazir, sans-serif',
    labels: {
      colors: isDark.value ? '#e2e8f0' : '#334155',
    },
    markers: {
      size: 6,
    },
  },
}));
</script>

<template>
  <div class="trend-chart-component" dir="rtl">
    <!-- Chart Controls & Header Stats -->
    <div class="chart-top-bar">
      <!-- Time Range Segmented Buttons -->
      <div class="range-selector">
        <button
          type="button"
          :class="['range-btn', { 'is-active': activeRange === 'daily' }]"
          @click="activeRange = 'daily'"
        >
          روزانه (۳۰ روز)
        </button>
        <button
          type="button"
          :class="['range-btn', { 'is-active': activeRange === 'monthly' }]"
          @click="activeRange = 'monthly'"
        >
          ماهانه (۱۴۰۵)
        </button>
        <button
          type="button"
          :class="['range-btn', { 'is-active': activeRange === 'yearly' }]"
          @click="activeRange = 'yearly'"
        >
          سالانه (۵ سال)
        </button>
      </div>

      <!-- Quick KPI Mini Badges -->
      <div class="summary-kpis">
        <div class="kpi-mini-badge warning-badge">
          <AlertTriangle class="badge-icon text-warning-icon" />
          <span class="badge-label">مجموع اخطار:</span>
          <strong class="badge-value">{{ fa(totalWarnings) }}</strong>
        </div>
        <div class="kpi-mini-badge danger-badge">
          <ShieldAlert class="badge-icon text-danger-icon" />
          <span class="badge-label">مجموع پلمپ:</span>
          <strong class="badge-value">{{ fa(totalSeals) }}</strong>
        </div>
        <div class="kpi-mini-badge ratio-badge">
          <Percent class="badge-icon text-ratio-icon" />
          <span class="badge-label">نرخ پلمپ:</span>
          <strong class="badge-value">{{ sealRatio }}</strong>
        </div>
      </div>
    </div>

    <!-- ApexCharts Area Spline Visualizer -->
    <div class="chart-container">
      <VueApexCharts
        type="area"
        height="320"
        :options="chartOptions"
        :series="series"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.trend-chart-component {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

.chart-top-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.range-selector {
  display: inline-flex;
  align-items: center;
  background-color: var(--secondary);
  border-radius: var(--radius-lg);
  padding: 0.25rem;
  gap: 0.25rem;
}

.range-btn {
  border: none;
  background: transparent;
  color: var(--muted-foreground);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.375rem 0.875rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    color: var(--foreground);
  }

  &.is-active {
    background-color: var(--card);
    color: var(--primary);
    font-weight: 700;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
}

.summary-kpis {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.625rem;
}

.kpi-mini-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3125rem 0.625rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  border: 1px solid transparent;

  &.warning-badge {
    background-color: oklch(from var(--primary) l c h / 8%);
    border-color: oklch(from var(--primary) l c h / 20%);
    color: var(--foreground);
  }

  &.danger-badge {
    background-color: oklch(from var(--destructive) l c h / 10%);
    border-color: oklch(from var(--destructive) l c h / 22%);
    color: var(--foreground);
  }

  &.ratio-badge {
    background-color: oklch(from var(--gold) l c h / 12%);
    border-color: oklch(from var(--gold) l c h / 25%);
    color: var(--foreground);
  }
}

.badge-icon {
  width: 0.875rem;
  height: 0.875rem;
}

.text-warning-icon {
  color: var(--primary);
}

.text-danger-icon {
  color: var(--destructive);
}

.text-ratio-icon {
  color: var(--gold);
}

.badge-label {
  color: var(--muted-foreground);
}

.badge-value {
  font-weight: 700;
  font-family: var(--font-sans);
}

.chart-container {
  width: 100%;
  min-height: 320px;
  direction: ltr; // Chart coordinates are LTR canvas
}
</style>

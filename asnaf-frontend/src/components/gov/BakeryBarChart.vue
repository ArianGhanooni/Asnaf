<script setup lang="ts">
import { computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { bakeries } from 'src/utils/data';
import { fa } from 'src/utils/fa';
import { useSessionStore } from 'src/stores/session';
import { Package, CheckCircle2, TrendingUp } from 'lucide-vue-next';

const sessionStore = useSessionStore();
const isDark = computed(() => sessionStore.theme === 'dark');

const totalQuota = computed(() => bakeries.reduce((sum, b) => sum + b.quota, 0));
const totalUsed = computed(() => bakeries.reduce((sum, b) => sum + b.used, 0));
const avgRatio = computed(() => {
  if (totalQuota.value === 0) return '۰٪';
  return `${fa(Math.round((totalUsed.value / totalQuota.value) * 100))}٪`;
});

const series = computed(() => [
  {
    name: 'سهمیه مصوب (کیسه)',
    data: bakeries.map((b) => b.quota),
  },
  {
    name: 'مصرف ثبت‌شده (کیسه)',
    data: bakeries.map((b) => b.used),
  },
]);

const chartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'bar',
    height: 310,
    fontFamily: 'Vazirmatn, Vazir, sans-serif',
    background: 'transparent',
    toolbar: {
      show: true,
      tools: {
        download: true,
        selection: false,
        zoom: false,
        zoomin: false,
        zoomout: false,
        pan: false,
        reset: false,
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
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '45%',
      borderRadius: 6,
      borderRadiusApplication: 'end',
    },
  },
  colors: ['#2563eb', '#f59e0b'],
  dataLabels: {
    enabled: false,
  },
  stroke: {
    show: true,
    width: 2,
    colors: ['transparent'],
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
    categories: bakeries.map((b) => b.name),
    labels: {
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
  fill: {
    opacity: 0.95,
  },
  tooltip: {
    theme: isDark.value ? 'dark' : 'light',
    style: {
      fontFamily: 'Vazirmatn, Vazir, sans-serif',
      fontSize: '12px',
    },
    y: {
      formatter: (val: number) => `${fa(val)} کیسه`,
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
  <div class="bakery-apex-chart-wrap" dir="rtl">
    <!-- Header Summary Badges -->
    <div class="kpi-mini-bar">
      <div class="kpi-mini-badge quota-badge">
        <Package class="badge-icon" />
        <span class="badge-label">کل سهمیه:</span>
        <strong class="badge-value">{{ fa(totalQuota) }} کیسه</strong>
      </div>
      <div class="kpi-mini-badge used-badge">
        <CheckCircle2 class="badge-icon" />
        <span class="badge-label">کل مصرف:</span>
        <strong class="badge-value">{{ fa(totalUsed) }} کیسه</strong>
      </div>
      <div class="kpi-mini-badge ratio-badge">
        <TrendingUp class="badge-icon" />
        <span class="badge-label">نرخ جذب استان:</span>
        <strong class="badge-value">{{ avgRatio }}</strong>
      </div>
    </div>

    <!-- ApexCharts Visualizer -->
    <div class="chart-container" dir="ltr">
      <VueApexCharts
        type="bar"
        height="310"
        :options="chartOptions"
        :series="series"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.bakery-apex-chart-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.kpi-mini-bar {
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

  &.quota-badge {
    background-color: oklch(from var(--primary) l c h / 8%);
    border-color: oklch(from var(--primary) l c h / 20%);
    color: var(--foreground);
    .badge-icon { color: var(--primary); }
  }

  &.used-badge {
    background-color: oklch(from var(--gold) l c h / 12%);
    border-color: oklch(from var(--gold) l c h / 25%);
    color: var(--foreground);
    .badge-icon { color: var(--gold); }
  }

  &.ratio-badge {
    background-color: oklch(from var(--success) l c h / 10%);
    border-color: oklch(from var(--success) l c h / 25%);
    color: var(--foreground);
    .badge-icon { color: var(--success); }
  }
}

.badge-icon {
  width: 0.875rem;
  height: 0.875rem;
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
  min-height: 310px;
}
</style>

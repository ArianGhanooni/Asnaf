<script setup lang="ts">
import { computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { SpecializedUnitItem, SpecializedUnionConfig } from 'src/types/specialized';
import { fa } from 'src/utils/fa';
import { useSessionStore } from 'src/stores/session';
import { BarChart3, TrendingUp, CheckCircle2 } from 'lucide-vue-next';

interface Props {
  readonly units: SpecializedUnitItem[];
  readonly unionConfig: SpecializedUnionConfig;
}

const props = defineProps<Props>();

const sessionStore = useSessionStore();
const isDark = computed(() => sessionStore.theme === 'dark');

// محدود کردن نمودار به ۸ واحد جهت وضوح بصری
const displayUnits = computed(() => props.units.slice(0, 8));

const totalMetric1 = computed(() =>
  props.units.reduce((sum, u) => sum + u.metric1Value, 0)
);

const totalMetric2 = computed(() =>
  props.units.reduce((sum, u) => sum + u.metric2Value, 0)
);

const series = computed(() => [
  {
    name: props.unionConfig.chartConfig.metric1Name,
    data: displayUnits.value.map((u) => u.metric1Value),
  },
  {
    name: props.unionConfig.chartConfig.metric2Name,
    data: displayUnits.value.map((u) => u.metric2Value),
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
  colors: [props.unionConfig.primaryColor, '#10b981'],
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '55%',
      borderRadius: 4,
      borderRadiusApplication: 'end',
      dataLabels: {
        position: 'top',
      },
    },
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    show: true,
    width: 2,
    colors: ['transparent'],
  },
  xaxis: {
    categories: displayUnits.value.map((u) => u.name.split(' ').slice(0, 3).join(' ')),
    labels: {
      style: {
        fontSize: '11px',
        fontWeight: 600,
        colors: isDark.value ? '#94a3b8' : '#64748b',
      },
      rotate: -35,
      rotateAlways: false,
      trim: true,
      maxHeight: 60,
    },
    axisBorder: {
      show: true,
      color: isDark.value ? '#334155' : '#e2e8f0',
    },
    axisTicks: {
      show: false,
    },
  },
  yaxis: {
    title: {
      text: props.unionConfig.chartConfig.unit,
      style: {
        fontSize: '11px',
        fontWeight: 600,
        color: isDark.value ? '#94a3b8' : '#64748b',
      },
    },
    labels: {
      style: {
        fontSize: '11px',
        colors: isDark.value ? '#94a3b8' : '#64748b',
      },
      formatter: (val: number) => fa(Math.round(val)),
    },
  },
  grid: {
    borderColor: isDark.value ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    strokeDashArray: 3,
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right',
    fontSize: '11px',
    fontWeight: 600,
    labels: {
      colors: isDark.value ? '#e2e8f0' : '#334155',
    },
    markers: {
      size: 8,
      shape: 'circle',
    },
  },
  tooltip: {
    theme: isDark.value ? 'dark' : 'light',
    y: {
      formatter: (val: number) => `${fa(val)} ${props.unionConfig.chartConfig.unit}`,
    },
  },
}));
</script>

<template>
  <div class="specialized-bar-chart-wrap" dir="rtl">
    <div class="chart-summary-pills">
      <div class="summary-pill">
        <BarChart3 class="icon-xs text-primary" />
        <span class="pill-label">مجموع {{ unionConfig.chartConfig.metric1Name }}:</span>
        <strong class="pill-val">{{ fa(Math.round(totalMetric1)) }} {{ unionConfig.chartConfig.unit }}</strong>
      </div>

      <div class="summary-pill">
        <CheckCircle2 class="icon-xs text-success" />
        <span class="pill-label">مجموع {{ unionConfig.chartConfig.metric2Name }}:</span>
        <strong class="pill-val text-success">{{ fa(Math.round(totalMetric2)) }} {{ unionConfig.chartConfig.unit }}</strong>
      </div>
    </div>

    <div class="apex-chart-container">
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
.specialized-bar-chart-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.chart-summary-pills {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.summary-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding-block: 0.35rem;
  padding-inline: 0.65rem;
  background-color: var(--secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
}

.pill-label {
  color: var(--muted-foreground);
}

.pill-val {
  color: var(--foreground);
}

.text-success {
  color: #10b981;
}

.apex-chart-container {
  width: 100%;
  min-height: 310px;
}

.icon-xs {
  width: 0.875rem;
  height: 0.875rem;
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { Unit } from 'src/types/asnaf';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import { inspectorsLive, prices, unionPerf, monthly } from 'src/utils/data';
import { fa, faNum } from 'src/utils/fa';
import MapCanvas, { type MapPoint } from 'src/components/gov/MapCanvas.vue';
import StatusPill from 'src/components/gov/StatusPill.vue';
import InspectorWarningsTable from 'src/components/reports/InspectorWarningsTable.vue';
import SmsStatusReport from 'src/components/reports/SmsStatusReport.vue';
import CivilComplaintsView from 'src/components/complaints/CivilComplaintsView.vue';
import { useQuasar } from 'quasar';
import {
  AlertTriangle,
  ShieldAlert,
  MessageSquare,
  CheckCircle2,
  TrendingUp,
  FileCheck,
  Award,
  Gavel,
  Scale,
  Lock,
  Clock,
  Calendar,
  ExternalLink,
} from 'lucide-vue-next';

const props = defineProps<{
  selectedIndex: number;
}>();

const $q = useQuasar();

const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();
const isDark = computed(() => sessionStore.theme === 'dark');

const inspectorPoints: MapPoint[] = inspectorsLive.map((p) => ({
  id: p.name,
  x: p.x,
  y: p.y,
  tone: 'primary',
  pulse: true,
  label: p.name,
}));

// --- Donut Chart Data (Licenses) ---
const licenseStats = [
  { n: 'صادر شده', v: 640 },
  { n: 'تمدید پروانه', v: 310 },
  { n: 'در حال بررسی', v: 120 },
  { n: 'منقضی شده', v: 85 },
];
const totalLicenses = licenseStats.reduce((sum, item) => sum + item.v, 0);

const licenseSeries = computed(() => licenseStats.map((item) => item.v));

const licenseChartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'donut',
    height: 330,
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
  colors: ['#2563eb', '#10b981', '#f59e0b', '#dc2626'],
  labels: licenseStats.map((item) => item.n),
  stroke: {
    show: true,
    width: 2,
    colors: isDark.value ? ['#1e293b'] : ['#ffffff'],
  },
  plotOptions: {
    pie: {
      donut: {
        size: '68%',
        labels: {
          show: true,
          name: {
            show: true,
            fontFamily: 'Vazirmatn, Vazir, sans-serif',
            color: isDark.value ? '#94a3b8' : '#64748b',
          },
          value: {
            show: true,
            fontFamily: 'Vazirmatn, Vazir, sans-serif',
            fontSize: '18px',
            fontWeight: 700,
            color: isDark.value ? '#f8fafc' : '#0f172a',
            formatter: (val: string | number) => `${fa(val)} فقره`,
          },
          total: {
            show: true,
            label: 'مجموع کل',
            fontFamily: 'Vazirmatn, Vazir, sans-serif',
            color: isDark.value ? '#94a3b8' : '#64748b',
            formatter: () => `${fa(totalLicenses)} فقره`,
          },
        },
      },
    },
  },
  legend: {
    position: 'bottom',
    horizontalAlign: 'center',
    fontFamily: 'Vazirmatn, Vazir, sans-serif',
    labels: {
      colors: isDark.value ? '#e2e8f0' : '#334155',
    },
    markers: {
      size: 6,
    },
  },
  tooltip: {
    theme: isDark.value ? 'dark' : 'light',
    style: {
      fontFamily: 'Vazirmatn, Vazir, sans-serif',
      fontSize: '12px',
    },
    y: {
      formatter: (val: number) =>
        `${fa(val)} فقره (${fa(((val / totalLicenses) * 100).toFixed(1))}٪)`,
    },
  },
}));

// --- Union Performance Chart Data ---
const totalUnionVisits = computed(() =>
  unionPerf.reduce((sum, u) => sum + u.visits, 0)
);
const totalUnionWarnings = computed(() =>
  unionPerf.reduce((sum, u) => sum + u.warnings, 0)
);
const unionViolationRate = computed(() => {
  if (totalUnionVisits.value === 0) return '۰٪';
  return `${fa(((totalUnionWarnings.value / totalUnionVisits.value) * 100).toFixed(1))}٪`;
});

const unionSeries = computed(() => [
  {
    name: 'بازدیدهای نظارتی',
    data: unionPerf.map((u) => u.visits),
  },
  {
    name: 'اخطارهای صادره',
    data: unionPerf.map((u) => u.warnings),
  },
]);

const unionChartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'bar',
    height: 320,
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
  colors: ['#2563eb', '#dc2626'],
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
    categories: unionPerf.map((u) => u.union),
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

// --- Default Monthly Trend Chart Data (Area Spline) ---
const totalMonthlyWarnings = computed(() =>
  monthly.reduce((sum, m) => sum + m.warnings, 0)
);
const totalMonthlyComplaints = computed(() =>
  monthly.reduce((sum, m) => sum + m.complaints, 0)
);
const totalMonthlySeals = computed(() =>
  monthly.reduce((sum, m) => sum + m.seals, 0)
);

const defaultSeries = computed(() => [
  {
    name: 'اخطارها',
    data: monthly.map((m) => m.warnings),
  },
  {
    name: 'شکایات مردمی',
    data: monthly.map((m) => m.complaints),
  },
  {
    name: 'احکام پلمپ',
    data: monthly.map((m) => m.seals),
  },
]);

const defaultChartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'area',
    height: 320,
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
  colors: ['#2563eb', '#f59e0b', '#dc2626'],
  dataLabels: {
    enabled: false,
  },
  stroke: {
    curve: 'smooth',
    width: [3, 2.5, 2.5],
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
    size: 4,
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
    categories: monthly.map((m) => m.month),
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

const filteredViolationUnits = computed(() => {
  return unitsStore.units.filter((unit) => {
    if (props.selectedIndex === 1) return unit.risk.nonCooperation;
    if (props.selectedIndex === 2) return unit.status === 'unsealed';
    return /فروشی|نرخ|تخلف|پروانه/.test(unit.violation);
  });
});

// ماژول ۱: واحدهای دارای عدم همکاری
const nonCoopList = computed(() =>
  unitsStore.units.filter((u) => u.risk.nonCooperation || u.status === 'collect')
);

function referNonCooperation(u: Unit): void {
  $q.notify({
    type: 'warning',
    message: `پرونده ممانعت واحد ${u.name} جهت اعزام مأمور انتظامی به کلانتری منطقه ارجاع گردید.`,
    position: 'top',
  });
  unitsStore.addAudit(sessionStore.session?.name ?? 'سیستم', 'ارجاع انتظامی عدم همکاری', `واحد ${u.id} (${u.name})`);
}

// ماژول ۲: فک پلمپ غیرقانونی
const illegalUnsealList = computed(() =>
  unitsStore.units.filter((u) => u.status === 'unsealed')
);

function referJudicial(u: Unit): void {
  $q.notify({
    type: 'negative',
    message: `شکواییه جرم فک پلمپ غیرقانونی واحد ${u.name} مستقیماً به دادسرای عمومی و انقلاب اهواز ارسال شد.`,
    position: 'top',
  });
  unitsStore.addAudit(sessionStore.session?.name ?? 'سیستم', 'ارجاع قضایی فک پلمپ غیرقانونی', `واحد ${u.id} (${u.name})`);
}

// ماژول ۳: رسیدگی به تخلفات صنفی
const tribunalHearings = ref([
  {
    id: 'TRB-881',
    unitName: 'فست‌فود باران',
    operator: 'دانیال سقنقور',
    summonsNo: '۱۴۰۵/اح/۴۵۱',
    chamberBranch: 'شعبه دوم تجدیدنظر تعزیرات حکومتی اهواز',
    date: '۱۴۰۵/۰۸/۱۲ ۱۰:۳۰',
    status: 'در انتظار حضور متصدی',
    fineAmount: 45000000,
  },
  {
    id: 'TRB-882',
    unitName: 'سوپر رویان',
    operator: 'یوسف بگینه (حردانی)',
    summonsNo: '۱۴۰۵/اح/۴۳۲',
    chamberBranch: 'کمیسیون رسیدگی به تخلفات صنفی اتاق اصناف',
    date: '۱۴۰۵/۰۸/۱۰ ۰۹:۰۰',
    status: 'حضور و اخذ تعهد رسمی',
    fineAmount: 18000000,
  },
  {
    id: 'TRB-883',
    unitName: 'مبلمان غزال',
    operator: 'حیدر عیبداوی',
    summonsNo: '۱۴۰۵/اح/۴۰۹',
    chamberBranch: 'شعبه اول هیئت حل اختلاف صنفی اهواز',
    date: '۱۴۰۵/۰۸/۰۸ ۱۱:۰۰',
    status: 'غیبت غیرموجه / صدور رأی غیابی',
    fineAmount: 65000000,
  },
  {
    id: 'TRB-884',
    unitName: 'بستنی هفت و چهار',
    operator: 'زهرا محمدرضایی',
    summonsNo: '۱۴۰۵/اح/۳۹۱',
    chamberBranch: 'شعبه دوم تعزیرات حکومتی اهواز',
    date: '۱۴۰۵/۰۸/۰۴ ۱۲:۱۵',
    status: 'تسویه جریمه ماده ۲۷ و بایگانی',
    fineAmount: 32000000,
  },
]);

// ماژول ۵: تحلیل آماری صدور و تمدید
const licenseTrendSeries = computed(() => [
  { name: 'پروانه‌های جدید صادر شده', data: [45, 52, 60, 58, 65, 72, 80] },
  { name: 'پروانه‌های تمدید شده', data: [22, 28, 30, 35, 40, 42, 48] },
  { name: 'تطبیق هوشمند ماده ۲۷ (خروج از اخطار)', data: [12, 18, 25, 29, 38, 45, 54] },
]);

const licenseTrendOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'line',
    height: 320,
    fontFamily: 'Vazirmatn, Vazir, sans-serif',
    background: 'transparent',
    toolbar: { show: true },
  },
  theme: { mode: isDark.value ? 'dark' : 'light' },
  colors: ['#2563eb', '#10b981', '#f59e0b'],
  stroke: { curve: 'smooth', width: 3 },
  xaxis: {
    categories: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر'],
    labels: { style: { colors: isDark.value ? '#94a3b8' : '#64748b', fontFamily: 'Vazirmatn' } },
  },
  yaxis: {
    labels: {
      formatter: (val: number) => fa(Math.round(val)),
      style: { colors: isDark.value ? '#94a3b8' : '#64748b', fontFamily: 'Vazirmatn' },
    },
  },
  tooltip: {
    theme: isDark.value ? 'dark' : 'light',
    y: { formatter: (val: number) => `${fa(val)} فقره` },
  },
}));

// ماژول ۸: گزارش مدیریتی عملکرد
const executiveKpi = {
  totalInspections: 1845,
  escalationRate: '۲۸.۴٪',
  sealExecutionRate: '۸۶.۲٪',
  finesCollected: '۳,۴۵۰,۰۰۰,۰۰۰ ریال',
  reconciledArticle27: 184,
};
</script>

<template>
  <div class="report-body">
    <!-- 0: Inspector Warnings Report -->
    <div v-if="selectedIndex === 0">
      <InspectorWarningsTable />
    </div>

    <!-- 1: Non-Cooperation Units (واحدهای دارای عدم همکاری) -->
    <div v-else-if="selectedIndex === 1">
      <div class="desktop-table-wrapper">
        <div class="table-responsive">
          <table class="report-table">
            <thead>
              <tr>
                <th>شناسه واحد</th>
                <th>نام واحد صنفی</th>
                <th>متصدی</th>
                <th>شماره تماس</th>
                <th>اتحادیه مربوطه</th>
                <th>علت ممانعت / تخلف</th>
                <th>وضعیت</th>
                <th>اقدام فوری</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in nonCoopList" :key="u.id">
                <td class="font-bold">{{ fa(u.id) }}</td>
                <td>{{ u.name }}</td>
                <td>{{ u.operator }}</td>
                <td dir="ltr" class="text-right">{{ fa(u.mobile) }}</td>
                <td>{{ u.union }}</td>
                <td class="text-amber-8 font-medium">{{ u.violation }}</td>
                <td><StatusPill :status="u.status" /></td>
                <td>
                  <q-btn
                    dense
                    flat
                    size="sm"
                    color="warning"
                    icon="shield"
                    label="ارجاع به کلانتری"
                    class="q-px-sm"
                    @click="referNonCooperation(u)"
                  />
                </td>
              </tr>
              <tr v-if="nonCoopList.length === 0">
                <td colspan="8" class="text-center q-pa-md text-muted">واحدی با تخلف عدم همکاری یافت نشد</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Cards -->
      <div class="mobile-cards-wrapper" dir="rtl">
        <div v-for="u in nonCoopList" :key="u.id" class="mobile-report-card">
          <div class="card-top-row">
            <div class="card-identity">
              <span class="unit-name">{{ u.name }}</span>
              <span class="unit-code-badge">{{ fa(u.id) }}</span>
            </div>
            <StatusPill :status="u.status" />
          </div>
          <div class="card-info-grid">
            <div class="info-item">
              <span class="info-label">متصدی:</span>
              <span class="info-value">{{ u.operator }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">تماس:</span>
              <span class="info-value" dir="ltr">{{ fa(u.mobile) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">اتحادیه:</span>
              <span class="info-value">{{ u.union }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">تخلف:</span>
              <span class="info-value text-amber-8">{{ u.violation }}</span>
            </div>
          </div>
          <div class="q-mt-sm">
            <q-btn
              dense
              unelevated
              size="sm"
              color="warning"
              icon="shield"
              label="ارجاع انتظامی عدم همکاری"
              class="full-width"
              @click="referNonCooperation(u)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 2: Illegal Unseal Cases (فک پلمپ غیرقانونی) -->
    <div v-else-if="selectedIndex === 2">
      <div class="desktop-table-wrapper">
        <div class="table-responsive">
          <table class="report-table">
            <thead>
              <tr>
                <th>شناسه واحد</th>
                <th>نام واحد صنفی</th>
                <th>متصدی</th>
                <th>کد ملی</th>
                <th>شماره تماس</th>
                <th>اتحادیه</th>
                <th>وضعیت پلمپ</th>
                <th>شکواییه قضایی</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in illegalUnsealList" :key="u.id">
                <td class="font-bold text-negative">{{ fa(u.id) }}</td>
                <td>{{ u.name }}</td>
                <td>{{ u.operator }}</td>
                <td>{{ fa(u.nationalId) }}</td>
                <td dir="ltr" class="text-right">{{ fa(u.mobile) }}</td>
                <td>{{ u.union }}</td>
                <td>
                  <span class="change-pill tone-destructive">فک پلمپ غیرمجاز</span>
                </td>
                <td>
                  <q-btn
                    dense
                    unelevated
                    size="sm"
                    color="negative"
                    icon="gavel"
                    label="تنظیم شکواییه دادسرا"
                    class="q-px-sm"
                    @click="referJudicial(u)"
                  />
                </td>
              </tr>
              <tr v-if="illegalUnsealList.length === 0">
                <td colspan="8" class="text-center q-pa-md text-muted">موردی با فک پلمپ غیرقانونی ثبت نشده است</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Cards -->
      <div class="mobile-cards-wrapper" dir="rtl">
        <div v-for="u in illegalUnsealList" :key="u.id" class="mobile-report-card">
          <div class="card-top-row">
            <div class="card-identity">
              <span class="unit-name">{{ u.name }}</span>
              <span class="unit-code-badge text-negative">{{ fa(u.id) }}</span>
            </div>
            <span class="change-pill tone-destructive">فک پلمپ غیرمجاز</span>
          </div>
          <div class="card-info-grid">
            <div class="info-item">
              <span class="info-label">متصدی:</span>
              <span class="info-value">{{ u.operator }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">کد ملی:</span>
              <span class="info-value">{{ fa(u.nationalId) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">تماس:</span>
              <span class="info-value" dir="ltr">{{ fa(u.mobile) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">اتحادیه:</span>
              <span class="info-value">{{ u.union }}</span>
            </div>
          </div>
          <div class="q-mt-sm">
            <q-btn
              dense
              unelevated
              size="sm"
              color="negative"
              icon="gavel"
              label="تنظیم شکواییه دادسرای عمومی"
              class="full-width"
              @click="referJudicial(u)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 3: Guild Violations Tribunal (رسیدگی به تخلفات صنفی) -->
    <div v-else-if="selectedIndex === 3">
      <div class="desktop-table-wrapper">
        <div class="table-responsive">
          <table class="report-table">
            <thead>
              <tr>
                <th>کلاسه احضاریه</th>
                <th>واحد صنفی</th>
                <th>متصدی</th>
                <th>مرجع رسیدگی</th>
                <th>تاریخ جلسه</th>
                <th>مبلغ جریمه</th>
                <th>وضعیت رسیدگی</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in tribunalHearings" :key="h.id">
                <td class="font-bold">{{ fa(h.summonsNo) }}</td>
                <td>{{ h.unitName }}</td>
                <td>{{ h.operator }}</td>
                <td class="text-muted">{{ h.chamberBranch }}</td>
                <td>{{ fa(h.date) }}</td>
                <td class="font-bold text-primary">{{ fa(faNum(h.fineAmount)) }} ریال</td>
                <td>
                  <span class="change-pill tone-accent">{{ h.status }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Cards -->
      <div class="mobile-cards-wrapper" dir="rtl">
        <div v-for="h in tribunalHearings" :key="h.id" class="mobile-report-card">
          <div class="card-top-row">
            <div class="card-identity">
              <span class="unit-name">{{ h.unitName }}</span>
              <span class="unit-code-badge">{{ fa(h.summonsNo) }}</span>
            </div>
            <span class="change-pill tone-accent">{{ h.status }}</span>
          </div>
          <div class="card-info-grid">
            <div class="info-item">
              <span class="info-label">متصدی:</span>
              <span class="info-value">{{ h.operator }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">جلسه:</span>
              <span class="info-value">{{ fa(h.date) }}</span>
            </div>
            <div class="info-item full-span">
              <span class="info-label">مرجع:</span>
              <span class="info-value text-muted">{{ h.chamberBranch }}</span>
            </div>
            <div class="info-item full-span">
              <span class="info-label">جریمه:</span>
              <span class="info-value font-bold text-primary">{{ fa(faNum(h.fineAmount)) }} ریال</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 4: License Donut Chart (ApexCharts) -->
    <div
      v-else-if="selectedIndex === 4"
      class="report-chart-section"
      dir="rtl"
    >
      <div class="kpi-mini-bar">
        <div class="kpi-mini-badge total-badge">
          <FileCheck class="badge-icon text-total-icon" />
          <span class="badge-label">کل پروانه‌ها:</span>
          <strong class="badge-value">{{ fa(totalLicenses) }} فقره</strong>
        </div>
        <div class="kpi-mini-badge issued-badge">
          <CheckCircle2 class="badge-icon text-issued-icon" />
          <span class="badge-label">صادر شده:</span>
          <strong class="badge-value">{{ fa(640) }} (۵۵٪)</strong>
        </div>
        <div class="kpi-mini-badge renewal-badge">
          <Award class="badge-icon text-renewal-icon" />
          <span class="badge-label">تمدید پروانه:</span>
          <strong class="badge-value">{{ fa(310) }} (۲۷٪)</strong>
        </div>
      </div>

      <div class="chart-container" dir="ltr">
        <VueApexCharts
          type="donut"
          height="330"
          :options="licenseChartOptions"
          :series="licenseSeries"
        />
      </div>
    </div>

    <!-- 6: Price Monitoring Table -->
    <div v-else-if="selectedIndex === 6">
      <!-- Desktop Table -->
      <div class="desktop-table-wrapper">
        <div class="table-responsive">
          <table class="report-table">
            <thead>
              <tr>
                <th>کالا</th>
                <th>قیمت قبل (ریال)</th>
                <th>قیمت فعلی</th>
                <th>تغییر</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in prices" :key="p.item">
                <td class="font-bold">{{ p.item }}</td>
                <td>{{ faNum(p.prev) }}</td>
                <td>{{ faNum(p.now) }}</td>
                <td>
                  <span
                    :class="[
                      'change-pill',
                      Math.round(((p.now - p.prev) / p.prev) * 100) > 10
                        ? 'tone-destructive'
                        : Math.round(((p.now - p.prev) / p.prev) * 100) > 0
                        ? 'tone-warning'
                        : 'tone-success',
                    ]"
                  >
                    {{ fa(Math.round(((p.now - p.prev) / p.prev) * 100)) }}٪
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Cards -->
      <div class="mobile-cards-wrapper" dir="rtl">
        <div v-for="p in prices" :key="p.item" class="mobile-price-card">
          <div class="price-top-row">
            <span class="item-title">{{ p.item }}</span>
            <span
              :class="[
                'change-pill',
                Math.round(((p.now - p.prev) / p.prev) * 100) > 10
                  ? 'tone-destructive'
                  : Math.round(((p.now - p.prev) / p.prev) * 100) > 0
                  ? 'tone-warning'
                  : 'tone-success',
              ]"
            >
              {{ fa(Math.round(((p.now - p.prev) / p.prev) * 100)) }}٪
            </span>
          </div>
          <div class="price-details-grid">
            <div class="price-metric-box">
              <span class="metric-label">قیمت قبل:</span>
              <span class="metric-val">{{ faNum(p.prev) }} <small>ریال</small></span>
            </div>
            <div class="price-metric-box current">
              <span class="metric-label">قیمت فعلی:</span>
              <span class="metric-val">{{ faNum(p.now) }} <small>ریال</small></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 7: SMS Logs Status Report -->
    <div v-else-if="selectedIndex === 7">
      <SmsStatusReport />
    </div>

    <!-- 10: Inspectors Live Ranking -->
    <div v-else-if="selectedIndex === 10">
      <!-- Desktop Table -->
      <div class="desktop-table-wrapper">
        <div class="table-responsive">
          <table class="report-table">
            <thead>
              <tr>
                <th>رتبه</th>
                <th>بازرس</th>
                <th>بازدید امروز</th>
                <th>عملکرد</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ins in inspectorsLive" :key="ins.name">
                <td class="font-bold">{{ fa(ins.rank) }}</td>
                <td>{{ ins.name }}</td>
                <td>{{ fa(ins.visits) }}</td>
                <td>
                  <span
                    :class="[
                      'change-pill',
                      ins.rank <= 2 ? 'tone-success' : 'tone-accent',
                    ]"
                  >
                    {{ ins.rank <= 2 ? 'عالی' : 'خوب' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Cards -->
      <div class="mobile-cards-wrapper" dir="rtl">
        <div v-for="ins in inspectorsLive" :key="ins.name" class="mobile-inspector-card">
          <div class="inspector-card-top">
            <div class="inspector-id">
              <span
                class="rank-badge"
                :class="ins.rank === 1 ? 'rank-gold' : ins.rank === 2 ? 'rank-silver' : 'rank-bronze'"
              >
                رتبه {{ fa(ins.rank) }}
              </span>
              <span class="inspector-name">{{ ins.name }}</span>
            </div>
            <span
              :class="[
                'change-pill',
                ins.rank <= 2 ? 'tone-success' : 'tone-accent',
              ]"
            >
              {{ ins.rank <= 2 ? 'عالی' : 'خوب' }}
            </span>
          </div>
          <div class="inspector-card-bottom">
            <span class="visits-lbl">بازدیدهای ثبت‌شده امروز:</span>
            <strong class="visits-val">{{ fa(ins.visits) }} واحد</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- 11: Union Performance Bar Chart (ApexCharts) -->
    <div
      v-else-if="selectedIndex === 11"
      class="report-chart-section"
      dir="rtl"
    >
      <div class="kpi-mini-bar">
        <div class="kpi-mini-badge visits-badge">
          <CheckCircle2 class="badge-icon text-visits-icon" />
          <span class="badge-label">کل بازرسی‌ها:</span>
          <strong class="badge-value">{{ fa(totalUnionVisits) }} مورد</strong>
        </div>
        <div class="kpi-mini-badge warning-badge">
          <AlertTriangle class="badge-icon text-warning-icon" />
          <span class="badge-label">کل اخطارها:</span>
          <strong class="badge-value">{{ fa(totalUnionWarnings) }} مورد</strong>
        </div>
        <div class="kpi-mini-badge ratio-badge">
          <TrendingUp class="badge-icon text-ratio-icon" />
          <span class="badge-label">نرخ تخلف اتحادیه‌ها:</span>
          <strong class="badge-value">{{ unionViolationRate }}</strong>
        </div>
      </div>

      <div class="chart-container" dir="ltr">
        <VueApexCharts
          type="bar"
          height="320"
          :options="unionChartOptions"
          :series="unionSeries"
        />
      </div>
    </div>

    <!-- 9: Civil Complaints Management (Simba & bazras360) -->
    <div v-else-if="selectedIndex === 9">
      <CivilComplaintsView />
    </div>

    <!-- 5: Statistical Analysis of Issuance and Renewal (تحلیل آماری صدور و تمدید) -->
    <div v-else-if="selectedIndex === 5" class="report-chart-section" dir="rtl">
      <div class="kpi-mini-bar">
        <div class="kpi-mini-badge issued-badge">
          <FileCheck class="badge-icon text-issued-icon" />
          <span class="badge-label">پروانه‌های جدید صادر شده:</span>
          <strong class="badge-value">{{ fa(80) }} فقره (مهر ۱۴۰۵)</strong>
        </div>
        <div class="kpi-mini-badge renewal-badge">
          <Award class="badge-icon text-renewal-icon" />
          <span class="badge-label">پروانه‌های تمدید شده:</span>
          <strong class="badge-value">{{ fa(48) }} فقره</strong>
        </div>
        <div class="kpi-mini-badge ratio-badge">
          <CheckCircle2 class="badge-icon text-ratio-icon" />
          <span class="badge-label">تطبیق خودکار ماده ۲۷:</span>
          <strong class="badge-value">{{ fa(54) }} واحد</strong>
        </div>
      </div>

      <div class="chart-container" dir="ltr">
        <VueApexCharts
          type="line"
          height="320"
          :options="licenseTrendOptions"
          :series="licenseTrendSeries"
        />
      </div>
    </div>

    <!-- 8: Executive Performance Management Report (گزارش مدیریتی عملکرد) -->
    <div v-else-if="selectedIndex === 8" class="report-chart-section" dir="rtl">
      <div class="kpi-mini-bar">
        <div class="kpi-mini-badge visits-badge">
          <CheckCircle2 class="badge-icon text-visits-icon" />
          <span class="badge-label">کل بازرسی‌های دوره‌ای:</span>
          <strong class="badge-value">{{ fa(executiveKpi.totalInspections) }}</strong>
        </div>
        <div class="kpi-mini-badge warning-badge">
          <AlertTriangle class="badge-icon text-warning-icon" />
          <span class="badge-label">نرخ ارجاع به اماکن:</span>
          <strong class="badge-value">{{ executiveKpi.escalationRate }}</strong>
        </div>
        <div class="kpi-mini-badge danger-badge">
          <ShieldAlert class="badge-icon text-danger-icon" />
          <span class="badge-label">نرخ اجرای پلمپ:</span>
          <strong class="badge-value">{{ executiveKpi.sealExecutionRate }}</strong>
        </div>
        <div class="kpi-mini-badge ratio-badge">
          <Scale class="badge-icon text-ratio-icon" />
          <span class="badge-label">ساماندهی ماده ۲۷:</span>
          <strong class="badge-value">{{ fa(executiveKpi.reconciledArticle27) }} واحد</strong>
        </div>
        <div class="kpi-mini-badge issued-badge">
          <Award class="badge-icon text-issued-icon" />
          <span class="badge-label">وصول جرایم ماده ۲۷:</span>
          <strong class="badge-value">{{ executiveKpi.finesCollected }}</strong>
        </div>
      </div>

      <div class="chart-container" dir="ltr">
        <VueApexCharts
          type="area"
          height="320"
          :options="defaultChartOptions"
          :series="defaultSeries"
        />
      </div>
    </div>

    <!-- Default Fallback: Trend Lines (ApexCharts Area Spline) -->
    <div v-else class="report-chart-section" dir="rtl">
      <div class="kpi-mini-bar">
        <div class="kpi-mini-badge warning-badge">
          <AlertTriangle class="badge-icon text-warning-icon" />
          <span class="badge-label">مجموع اخطار:</span>
          <strong class="badge-value">{{ fa(totalMonthlyWarnings) }}</strong>
        </div>
        <div class="kpi-mini-badge complaints-badge">
          <MessageSquare class="badge-icon text-complaints-icon" />
          <span class="badge-label">مجموع شکایات:</span>
          <strong class="badge-value">{{ fa(totalMonthlyComplaints) }}</strong>
        </div>
        <div class="kpi-mini-badge danger-badge">
          <ShieldAlert class="badge-icon text-danger-icon" />
          <span class="badge-label">مجموع پلمپ:</span>
          <strong class="badge-value">{{ fa(totalMonthlySeals) }}</strong>
        </div>
      </div>

      <div class="chart-container" dir="ltr">
        <VueApexCharts
          type="area"
          height="320"
          :options="defaultChartOptions"
          :series="defaultSeries"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.report-body {
  width: 100%;
}

.report-map {
  height: 24rem;
}

.desktop-table-wrapper {
  display: block;
  width: 100%;

  @media (max-width: 768px) {
    display: none !important;
  }
}

.mobile-cards-wrapper {
  display: none !important;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;

  @media (max-width: 768px) {
    display: flex !important;
  }
}

.mobile-report-card,
.mobile-price-card,
.mobile-inspector-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 0.875rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.card-top-row,
.price-top-row,
.inspector-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.card-identity {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;

  .unit-name {
    font-weight: 700;
    font-size: 0.9375rem;
    color: var(--foreground);
  }

  .unit-code-badge {
    background: var(--muted);
    color: var(--muted-foreground);
    padding: 0.125rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-family: monospace;
  }
}

.card-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--border);

  .info-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;

    .info-label {
      color: var(--muted-foreground);
    }
    .info-value {
      color: var(--foreground);
      font-weight: 500;
    }
  }
}

.price-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--border);

  .price-metric-box {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: var(--muted);
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;

    .metric-label {
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }
    .metric-val {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--foreground);
    }

    &.current {
      background: oklch(from var(--primary) l c h / 10%);
      border: 1px solid oklch(from var(--primary) l c h / 20%);
      .metric-val {
        color: var(--primary);
      }
    }
  }
}

.inspector-id {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .inspector-name {
    font-weight: 700;
    font-size: 0.9375rem;
    color: var(--foreground);
  }
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 700;

  &.rank-gold {
    background: #fef3c7;
    color: #b45309;
    border: 1px solid #fde68a;
  }
  &.rank-silver {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
  }
  &.rank-bronze {
    background: #ffedd5;
    color: #c2410c;
    border: 1px solid #fed7aa;
  }
}

.inspector-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--border);
  font-size: 0.8125rem;

  .visits-lbl {
    color: var(--muted-foreground);
  }
  .visits-val {
    color: var(--primary);
    font-size: 0.9375rem;
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

.report-table {
  width: 100%;
  min-width: 38rem;
  border-collapse: collapse;
  font-size: 0.875rem;
  text-align: right;
  color: var(--foreground);

  th {
    padding: 0.75rem 0.75rem;
    font-weight: 600;
    color: var(--muted-foreground);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
    background-color: var(--muted);
  }

  td {
    padding: 0.75rem 0.75rem;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
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

.text-muted {
  color: var(--muted-foreground);
}

.change-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 0.125rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid transparent;

  &.tone-success {
    background-color: var(--success-bg);
    color: var(--success-foreground);
    border-color: oklch(from var(--success) l c h / 30%);
  }
  &.tone-warning {
    background-color: var(--warning-bg);
    color: var(--warning-foreground);
    border-color: oklch(from var(--warning) l c h / 30%);
  }
  &.tone-destructive {
    background-color: var(--destructive-bg);
    color: var(--destructive-foreground);
    border-color: oklch(from var(--destructive) l c h / 30%);
  }
  &.tone-accent {
    background-color: var(--accent);
    color: var(--accent-foreground);
    border-color: oklch(from var(--accent) l c h / 30%);
  }
}

.report-chart-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

.kpi-mini-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.kpi-mini-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.85rem;
  border-radius: 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1px solid var(--border);
  background: var(--card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .badge-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }

  .badge-label {
    color: var(--muted-foreground);
  }

  .badge-value {
    font-weight: 700;
    color: var(--foreground);
  }

  &.warning-badge {
    border-color: rgba(245, 158, 11, 0.25);
    .text-warning-icon {
      color: #f59e0b;
    }
  }

  &.danger-badge {
    border-color: rgba(220, 38, 38, 0.25);
    .text-danger-icon {
      color: #dc2626;
    }
  }

  &.complaints-badge {
    border-color: rgba(245, 158, 11, 0.25);
    .text-complaints-icon {
      color: #f59e0b;
    }
  }

  &.visits-badge,
  &.total-badge {
    border-color: rgba(37, 99, 235, 0.25);
    .text-visits-icon,
    .text-total-icon {
      color: #2563eb;
    }
  }

  &.issued-badge {
    border-color: rgba(16, 185, 129, 0.25);
    .text-issued-icon {
      color: #10b981;
    }
  }

  &.renewal-badge {
    border-color: rgba(59, 130, 246, 0.25);
    .text-renewal-icon {
      color: #3b82f6;
    }
  }

  &.ratio-badge {
    border-color: rgba(139, 92, 246, 0.25);
    .text-ratio-icon {
      color: #8b5cf6;
    }
  }
}

.chart-container {
  width: 100%;
  min-height: 20rem;
}
</style>

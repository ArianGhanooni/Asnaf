<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from 'src/stores/session';
import { useUnitsStore } from 'src/stores/units';
import { useUnionsStore } from 'src/stores/unions';
import type { Unit, CaseStatus } from 'src/types/asnaf';
import { statusLabels } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import { useQuasar } from 'quasar';
import PanelCard from 'src/components/gov/PanelCard.vue';
import StatCard from 'src/components/gov/StatCard.vue';
import AssignInspectionDialog from 'src/components/missions/AssignInspectionDialog.vue';
import EditOperatorModal from 'src/components/inspections/EditOperatorModal.vue';
import UnionDismissalLetterDialog from 'src/components/inspections/UnionDismissalLetterDialog.vue';
import ChamberAmakenOrderDialog from 'src/components/inspections/ChamberAmakenOrderDialog.vue';
import RegisterFieldInspectionDialog from 'src/components/inspections/RegisterFieldInspectionDialog.vue';
import {
  Building2,
  Search,
  Plus,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Scale,
  FileText,
  UserCheck,
  CheckSquare,
  FileCheck,
  Lock,
  History,
  MapPin,
  ClipboardCheck,
  BarChart3,
  ArrowLeft,
  Navigation,
} from 'lucide-vue-next';
import { getUnitLatLng, navigateToLocation } from 'src/utils/ahvazGis';

const $q = useQuasar();
const sessionStore = useSessionStore();
const unitsStore = useUnitsStore();
const unionsStore = useUnionsStore();

// Modals State
const showAssignDialog = ref(false);
const showEditOperatorModal = ref(false);
const showUnionDraftDialog = ref(false);
const showChamberOrderDialog = ref(false);
const showRegisterFieldInspectionModal = ref(false);
const chamberOrderMode = ref<'seal_order' | 'resolution'>('seal_order');

const activeUnitForAction = ref<Unit | null>(null);

const route = useRoute();
const router = useRouter();

// Role checks
const userRole = computed(() => sessionStore.session?.role || 'general');
const userOrg = computed(() => sessionStore.session?.org || '');

// Stage Tabs (چرخه بازرسی ماده ۲۷ قانون نظام صنفی)
type StageTab = 'warning_1' | 'warning_2' | 'seal_ordered' | 'sealed' | 'dismissed' | 'unsealed';

const activeStage = computed<StageTab>(() => {
  const s = route.query.stage as string;
  if (['warning_1', 'warning_2', 'seal_ordered', 'sealed', 'dismissed', 'unsealed'].includes(s)) {
    return s as StageTab;
  }
  return 'seal_ordered';
});

const activeDuration = computed(() => {
  if (userRole.value === 'union') return '3m';
  const d = route.query.duration as string;
  return d === '1m' ? '1m' : (d === '3m' ? '3m' : null);
});

const stageMeta = computed<Record<StageTab, { title: string; color: string; desc: string }>>(() => {
  const durationLabel = activeDuration.value === '1m' ? ' (مهلت ۱ ماهه)' : ' (مهلت ۳ ماهه)';
  return {
    warning_1: { title: 'اخطار ۷۲ ساعته', color: 'yellow', desc: 'پرونده‌های در مهلت اخطاریه اولیه ۷۲ ساعته بازرس میدانی' },
    warning_2: { title: 'اخطار اماکن', color: 'orange', desc: 'پرونده‌های ارجاعی جهت اخطار ماده ۲۷ پلیس نظارت بر اماکن عمومی (۱۰ روزه)' },
    seal_ordered: { title: 'اقدام به پلمپ', color: 'red', desc: 'دستور رسمی صدور پلمپ از سوی اتاق اصناف خطاب به پلیس اماکن' },
    sealed: { title: 'پلمپ شده', color: 'dark-red', desc: 'واحدهای صنفی که عملیات پلمپ انتظامی آنها ثبت و نهایی شده است' },
    dismissed: {
      title: `منع پیگیری${userRole.value !== 'union' ? (activeDuration.value ? durationLabel : '') : ' (مهلت ۳ ماهه)'}`,
      color: 'green',
      desc: activeDuration.value === '1m'
        ? 'پرونده‌های دارای دستور منع پیگیری موقت با مهلت یک ماهه جهت انطباق مدارک'
        : 'پرونده‌های دارای دستور منع پیگیری با مهلت سه ماهه جهت اخذ پروانه کسب و رفع کامل تخلف',
    },
    unsealed: { title: 'فک پلمپ', color: 'green', desc: 'واحدهای صنفی رفع پلمپ‌شده با تایید اتاق اصناف و اتحادیه' },
  };
});

// Filters
const searchQuery = ref('');
const unionFilter = ref('all');
const regionFilter = ref('all');

// Base units filtered by RBAC
const rbacUnits = computed<Unit[]>(() => {
  const all = unitsStore.units;
  if (userRole.value === 'general' || userRole.value === 'admin') {
    return all;
  }
  if (userRole.value === 'union') {
    return all.filter((u) =>
      u.union.includes(userOrg.value) || userOrg.value.includes(u.union) || u.union.includes('نانوایان')
    );
  }
  // نقش بازرسان دسترسی به پلمپ شده و منع پیگیری ندارند
  if (userRole.value === 'inspector') {
    return all.filter((u) => !['sealed', 'dismissed', 'unsealed', 'licensed'].includes(u.status));
  }
  return all;
});

// Filtered Units by Stage and Search
const filteredUnits = computed<Unit[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return rbacUnits.value.filter((u) => {
    // نقش بازرس به پلمپ شده و منع پیگیری دسترسی ندارد
    if (userRole.value === 'inspector') {
      if (['sealed', 'dismissed', 'unsealed', 'licensed'].includes(u.status)) {
        return false;
      }
    }

    // فیلتر هر بخش به صورت کاملاً مجزا
    if (activeStage.value === 'warning_1') {
      if (u.status !== 'warning_1' && u.status !== 'warning') return false;
    } else if (activeStage.value === 'warning_2') {
      if (u.status !== 'warning_2') return false;
    } else if (activeStage.value === 'seal_ordered') {
      if (u.status !== 'seal_ordered' && u.status !== 'seal_requested' && u.status !== 'readySeal') return false;
    } else if (activeStage.value === 'sealed') {
      if (u.status !== 'sealed') return false;
    } else if (activeStage.value === 'dismissed') {
      if (u.status !== 'dismissed' && u.status !== 'licensed') return false;
      if (activeDuration.value) {
        const unitDur = u.dismissalDuration || (u.id % 2 === 0 ? '1m' : '3m');
        if (unitDur !== activeDuration.value) return false;
      }
    } else if (activeStage.value === 'unsealed') {
      if (u.status !== 'unsealed') return false;
    }

    // 2. فیلتر جستجو
    const matchesQ =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.operator.toLowerCase().includes(q) ||
      u.nationalId.includes(q) ||
      u.mobile.includes(q) ||
      (u.warningNo && u.warningNo.toLowerCase().includes(q)) ||
      u.address.toLowerCase().includes(q) ||
      String(u.id).includes(q);

    // 3. فیلتر اتحادیه
    const matchesUnion = unionFilter.value === 'all' || u.union === unionFilter.value;

    // 4. فیلتر منطقه
    const matchesRegion = regionFilter.value === 'all' || u.region === regionFilter.value;

    return matchesQ && matchesUnion && matchesRegion;
  });
});

// KPI summary
const kpiStats = computed(() => {
  const list = rbacUnits.value;
  const warning1Count = list.filter((u) => u.status === 'warning_1' || u.status === 'warning').length;
  const warning2Count = list.filter((u) => u.status === 'warning_2').length;
  const sealOrderedCount = list.filter((u) => u.status === 'seal_ordered' || u.status === 'seal_requested' || u.status === 'readySeal').length;
  const sealedCount = list.filter((u) => u.status === 'sealed').length;
  const resolvedCount = list.filter((u) => u.status === 'dismissed' || u.status === 'licensed').length;
  const unsealedCount = list.filter((u) => u.status === 'unsealed').length;
  const activeCases = warning1Count + warning2Count + sealOrderedCount;
  return { activeCases, warning1Count, warning2Count, sealOrderedCount, sealedCount, resolvedCount, unsealedCount };
});

// Actions
function openAssignModal(): void {
  activeUnitForAction.value = null;
  showAssignDialog.value = true;
}

function handleNavigateToUnit(unit: Unit): void {
  const [destLat, destLng] = getUnitLatLng(unit);
  navigateToLocation(destLat, destLng, (msg) => {
    $q.notify({
      type: 'info',
      message: `${msg} برای «${unit.name}»`,
      timeout: 2500,
      position: 'top',
    });
  });
}

function handleEditOperator(u: Unit): void {
  activeUnitForAction.value = u;
  showEditOperatorModal.value = true;
}

function handleEscalateToAmaken(u: Unit): void {
  $q.dialog({
    title: 'ارجاع به اداره اماکن و صدور اخطار ثانویه',
    message: `آیا از ارجاع پرونده واحد «${u.name}» (متصدی: ${u.operator}) به اداره نظارت بر اماکن عمومی و صدور اخطار ثانویه ۱۰ روزه اطمینان دارید؟`,
    ok: { label: 'تایید و ارجاع', color: 'warning' },
    cancel: { label: 'انصراف', flat: true },
  }).onOk(() => {
    const user = sessionStore.session?.name ?? 'کارشناس نظارت';
    unitsStore.escalateToAmaken(u.id, 'بازرس اداره اماکن', user);
    $q.notify({
      type: 'positive',
      message: `اخطار ثانویه صادر و پرونده به مأموریت‌های بازرس اماکن ارجاع گردید.`,
      position: 'top',
    });
  });
}

function handleRequestSealByUnion(u: Unit): void {
  $q.dialog({
    title: 'ارسال تقاضای پلمپ به اتاق اصناف',
    message: `با توجه به انقضای مهلت ۱۰ روزه اخطار ثانویه، آیا نامه رسمی درخواست پلمپ واحد «${u.name}» برای اتاق اصناف ارسال شود؟`,
    ok: { label: 'ارسال نامه پلمپ', color: 'negative' },
    cancel: { label: 'انصراف', flat: true },
  }).onOk(() => {
    const user = sessionStore.session?.name ?? 'کاربر اتحادیه صنفی';
    unitsStore.requestSealByUnion(u.id, user);
    $q.notify({
      type: 'positive',
      message: 'نامه درخواست پلمپ به کارتابل صدور دستور اتاق اصناف ارسال شد.',
      position: 'top',
    });
  });
}

function handleOpenChamberSealOrder(u: Unit): void {
  activeUnitForAction.value = u;
  chamberOrderMode.value = 'seal_order';
  showChamberOrderDialog.value = true;
}

function handleExecuteFieldSeal(u: Unit): void {
  $q.dialog({
    title: 'اجرای حکم پلمپ در محل',
    message: `آیا پلمپ فیزیکی واحد صنفی «${u.name}» توسط بازرس اماکن در محل اجرا گردید؟ صورتمجلس پلمپ در سوابق ثبت خواهد شد.`,
    prompt: {
      model: `صورتمجلس-اماکن-${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'text',
      label: 'شماره صورتمجلس پلمپ',
    },
    ok: { label: 'ثبت قطعی پلمپ', color: 'negative' },
    cancel: { label: 'انصراف', flat: true },
  }).onOk((reportNo: string) => {
    const inspector = sessionStore.session?.name ?? 'بازرس اداره اماکن';
    unitsStore.executeFieldSeal(u.id, reportNo, inspector);
    $q.notify({
      type: 'positive',
      message: `پلمپ واحد صنفی با صورتمجلس ${reportNo} ثبت و واحد به لیست «پلمپ شده» منتقل شد.`,
      position: 'top',
    });
  });
}

function handleOpenUnionDraft(u: Unit): void {
  activeUnitForAction.value = u;
  showUnionDraftDialog.value = true;
}

function handleOpenChamberResolution(u: Unit): void {
  activeUnitForAction.value = u;
  chamberOrderMode.value = 'resolution';
  showChamberOrderDialog.value = true;
}

function handleArticle27SmartReconcile(): void {
  $q.dialog({
    title: 'موتور تطبیق هوشمند پروانه کسب (ماده ۲۷)',
    message: 'کد ملی متصدی و شماره پروانه کسب صادره جدید را وارد نمایید تا پرونده به طور خودکار از صف‌های فعال اخطار/پلمپ خارج و منع پیگیری شود:',
    prompt: {
      model: '',
      type: 'text',
      label: 'کد ملی متصدی (۱۰ رقم)',
    },
    ok: { label: 'استعلام و تطبیق هوشمند', color: 'primary' },
    cancel: { label: 'انصراف', flat: true },
  }).onOk((nationalId: string) => {
    if (!nationalId) return;
    const user = sessionStore.session?.name ?? 'سیستم تطبیق هوشمند ماده ۲۷';
    const fakeLicense = String(Math.floor(10000000 + Math.random() * 90000000));
    const count = unitsStore.autoReconcileArticle27(nationalId.trim(), fakeLicense, user);

    if (count > 0) {
      $q.notify({
        type: 'positive',
        message: `تطبیق هوشمند موفق بود: ${fa(count)} پرونده فعال واحد صنفی به صورت خودکار به وضعیت «منع پیگیری» منتقل شد.`,
        caption: `شماره پروانه استعلام‌شده: ${fakeLicense}`,
        position: 'top',
      });
    } else {
      $q.notify({
        type: 'info',
        message: 'هیچ پرونده اخطار فعال یا آماده پلمپی با این کد ملی یافت نشد.',
        position: 'top',
      });
    }
  });
}

function getStatusBadgeClass(status: CaseStatus): string {
  switch (status) {
    case 'warning_1':
    case 'warning':
      return 'badge-warning-1';
    case 'warning_2':
      return 'badge-warning-2';
    case 'seal_requested':
      return 'badge-seal-requested';
    case 'seal_ordered':
    case 'readySeal':
      return 'badge-seal-ordered';
    case 'sealed':
      return 'badge-sealed';
    case 'dismissed':
    case 'unsealed':
    case 'licensed':
      return 'badge-resolved';
    default:
      return 'badge-default';
  }
}
</script>

<template>
  <div class="unit-inspections-page" data-testid="unit-inspections-page">
    <!-- Inspector Hub View (نمای اختصاصی ۲ کارت برای نقش بازرسان: ثبت سرکشی جدید و اخطار ۷۲ ساعته) -->
    <div v-if="userRole === 'inspector'" class="inspector-hub-view" data-testid="inspector-hub-view">
      <div class="hub-cards-grid">
        <!-- ۱. ثبت سرکشی جدید (نمایش اول، کاملاً وسط‌چین) -->
        <router-link
          to="/missions/inspections/new"
          class="hub-card hub-card-new shadow-card group"
          data-testid="hub-card-new"
        >
          <div class="hub-card-top">
            <span class="hub-icon-wrap icon-blue">
              <ClipboardCheck class="icon-md" />
            </span>
          </div>
          <h2 class="hub-card-title">ثبت سرکشی جدید</h2>
          <p class="hub-card-desc">ثبت مشخصات واحد صنفی و متصدی</p>
        </router-link>

        <!-- ۲. اخطار (مهلت ۷۲ ساعته) (نمایش دوم، کاملاً وسط‌چین) -->
        <router-link
          to="/missions/inspections/warnings"
          class="hub-card hub-card-warning shadow-card group"
          data-testid="hub-card-warning"
        >
          <div class="hub-card-top">
            <span class="hub-icon-wrap icon-amber">
              <Clock class="icon-md" />
            </span>
          </div>
          <h2 class="hub-card-title">اخطار (مهلت ۷۲ ساعته)</h2>
          <p class="hub-card-desc">لیست اخطارهای اولیه منقضی‌شده که بیش از ۷۲ ساعت از ابلاغ آنها سپری گردیده است.</p>
        </router-link>
      </div>
    </div>

    <!-- Administrative Table View for Other Roles (Admin, General, Union) -->
    <template v-else>
      <!-- هدر بازطراحی‌شده و متناسب با ابعاد صفحه -->
      <header class="inspections-page-header" dir="rtl">
      <div class="header-title-box">
        <div class="header-icon-wrap">
          <ClipboardCheck class="header-icon text-primary" />
        </div>
        <div class="header-text-group">
          <h1 class="page-title-compact">بازرسی واحدهای صنفی</h1>
          <span class="page-subtitle-compact">نظارت میدانی و گردش پرونده‌های ماده ۲۷</span>
        </div>
      </div>

      <div class="header-action-group">
        <router-link
          to="/reports"
          class="action-btn-outline"
          data-testid="header-reports-link-btn"
          title="مشاهده گزارشات جامع بازرسی و آمار"
        >
          <BarChart3 class="icon-sm" />
          <span>گزارشات بازرسی</span>
        </router-link>

        <button
          type="button"
          class="action-btn-secondary"
          @click="handleArticle27SmartReconcile"
          data-testid="btn-smart-reconcile-article27"
          title="تصفیه خودکار پرونده‌های ماده ۲۷ پس از صدور مجوز"
        >
          <Scale class="icon-sm" />
          <span>تطبیق هوشمند پروانه (ماده ۲۷)</span>
        </button>

        <button
          type="button"
          class="action-btn-primary"
          @click="router.push('/missions/inspections/new')"
          data-testid="header-register-field-inspection-btn"
          title="ثبت سرکشی میدانی و صدور اخطار (مرحله ۱)"
        >
          <ClipboardCheck class="icon-sm" />
          <span>ثبت سرکشی میدانی</span>
        </button>

        <button
          type="button"
          class="action-btn-outline"
          @click="openAssignModal"
          data-testid="header-assign-inspection-btn"
          title="تخصیص پرونده به بازرسان میدانی"
        >
          <Plus class="icon-sm" />
          <span>تخصیص بازرس</span>
        </button>
      </div>
    </header>

    <!-- KPI Summary Cards -->
    <div class="kpi-grid">
      <StatCard
        label="اخطار ۷۲ ساعته"
        :value="kpiStats.warning1Count"
        :icon="Clock"
        tone="warning"
      />
      <StatCard
        v-if="userRole !== 'union'"
        label="اقدام به پلمپ"
        :value="kpiStats.sealOrderedCount"
        :icon="ShieldAlert"
        tone="destructive"
      />
      <StatCard
        label="منع پیگیری"
        :value="kpiStats.resolvedCount"
        :icon="CheckCircle2"
        tone="success"
      />
      <StatCard
        v-if="userRole !== 'union'"
        label="فک پلمپ"
        :value="kpiStats.unsealedCount"
        :icon="Lock"
        tone="primary"
      />
    </div>

    <!-- تب‌های فرآیند بازرسی با نشانگر گلوله‌ای هماهنگ و انطباق دسترسی نقش‌ها -->
    <div class="process-tabs-wrap" dir="rtl">
      <!-- ثبت سرکشی جدید (هدایت به صفحه مشابه نقش بازرسان) -->
      <button
        type="button"
        class="process-tab-btn"
        @click="router.push('/missions/inspections/new')"
        data-testid="tab-stage-new"
      >
        <span class="bullet" />
        <span>ثبت سرکشی جدید</span>
      </button>

      <!-- اخطار ۷۲ ساعته (هدایت به صفحه مشابه نقش بازرسان) -->
      <button
        type="button"
        class="process-tab-btn"
        @click="router.push('/missions/inspections/warnings')"
        data-testid="tab-stage-warning1"
      >
        <span class="bullet" />
        <span>اخطار ۷۲ ساعته</span>
        <span class="tab-badge">{{ fa(kpiStats.warning1Count) }}</span>
      </button>

      <!-- اقدام به پلمپ (ویژه اتاق اصناف) -->
      <button
        v-if="userRole !== 'union'"
        type="button"
        :class="['process-tab-btn', { 'is-active': activeStage === 'seal_ordered' }]"
        @click="router.push('/missions/inspections/seal')"
        data-testid="tab-stage-seal-ordered"
      >
        <span class="bullet" />
        <span>اقدام به پلمپ</span>
        <span class="tab-badge">{{ fa(kpiStats.sealOrderedCount) }}</span>
      </button>

      <!-- منع پیگیری -->
      <button
        type="button"
        :class="['process-tab-btn', { 'is-active': activeStage === 'dismissed' }]"
        @click="router.push(`/missions/inspections/dismissed?duration=${userRole === 'union' ? '3m' : (activeDuration || '3m')}`)"
        data-testid="tab-stage-dismissed"
      >
        <span class="bullet" />
        <span>منع پیگیری</span>
        <span class="tab-badge">{{ fa(kpiStats.resolvedCount) }}</span>
      </button>

      <!-- فک پلمپ (ویژه اتاق اصناف) -->
      <button
        v-if="userRole !== 'union'"
        type="button"
        :class="['process-tab-btn', { 'is-active': activeStage === 'unsealed' }]"
        @click="router.push('/missions/inspections/unseal')"
        data-testid="tab-stage-unsealed"
      >
        <span class="bullet" />
        <span>فک پلمپ</span>
        <span class="tab-badge">{{ fa(kpiStats.unsealedCount) }}</span>
      </button>
    </div>

    <!-- نشانگر بخش انتخاب‌شده بازرسی واحدهای صنفی -->
    <div class="active-stage-banner" dir="rtl">
      <div class="banner-right">
        <span class="bullet" />
        <strong>بخش: {{ stageMeta[activeStage].title }}</strong>
        <span class="banner-count">({{ fa(filteredUnits.length) }} واحد صنفی)</span>
        <span class="banner-desc">{{ stageMeta[activeStage].desc }}</span>
      </div>

      <!-- انتخاب مهلت ۱ ماهه / ۳ ماهه برای نقش اتاق اصناف در منع پیگیری -->
      <div v-if="activeStage === 'dismissed' && userRole !== 'union'" class="duration-toggle-bar">
        <span class="duration-label">دوره منع تعقیب:</span>
        <button
          type="button"
          :class="['duration-pill-btn', { 'is-active': activeDuration === '1m' }]"
          @click="router.push('/missions/inspections?stage=dismissed&duration=1m')"
        >
          یک ماه
        </button>
        <button
          type="button"
          :class="['duration-pill-btn', { 'is-active': activeDuration === '3m' || !activeDuration }]"
          @click="router.push('/missions/inspections?stage=dismissed&duration=3m')"
        >
          سه ماه
        </button>
      </div>
    </div>

    <!-- Filter Bar -->
    <PanelCard>
      <div class="filter-grid">
        <div class="search-input-wrap">
          <Search class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="جستجو با نام واحد، متصدی، کد ملی، موبایل یا شماره اخطار..."
            class="filter-input"
            data-testid="inspections-search-input"
          />
        </div>

        <select
          v-if="userRole === 'general' || userRole === 'admin'"
          v-model="unionFilter"
          class="filter-select"
          data-testid="inspections-union-select"
        >
          <option value="all">همه ۵۲ اتحادیه اهواز</option>
          <option v-for="u in unionsStore.unions" :key="u.id" :value="u.name">
            {{ u.name }}
          </option>
        </select>

        <button
          v-if="searchQuery || unionFilter !== 'all'"
          type="button"
          class="btn-reset-filters"
          @click="searchQuery = ''; unionFilter = 'all';"
        >
          <RotateCcw class="icon-xs" />
          <span>بازنشانی فیلتر</span>
        </button>
      </div>
    </PanelCard>

    <!-- بنر راهنمای سریع مرحله ۱: سرکشی میدانی و صدور اخطار -->
    <div v-if="activeStage === 'warning_1'" class="stage1-banner" dir="rtl">
      <div class="banner-info">
        <div class="banner-icon-wrap">
          <ClipboardCheck class="icon-md text-primary" />
        </div>
        <div>
          <strong class="banner-title">سرکشی میدانی و صدور اخطار (مرحله ۱)</strong>
          <p class="banner-text">
            بازرس با مراجعه حضوری به واحدهای صنفی، اطلاعات واحد فاقد پروانه (ماده ۲۷) را ثبت و اخطاریه صادر می‌نماید.
          </p>
        </div>
      </div>
      <button
        type="button"
        class="btn-stage1-register"
        @click="router.push('/missions/inspections/new')"
        data-testid="banner-register-field-inspection-btn"
      >
        <Plus class="icon-xs" />
        <span>ثبت سرکشی جدید بازرس</span>
      </button>
    </div>

    <!-- Main Inspection Cases: Mobile Cards & Desktop Table -->
    <PanelCard :title="`${stageMeta[activeStage].title} (${fa(filteredUnits.length)} واحد صنفی)`">
      <!-- ۱. نمایش کارتی موبایل (ویژه کلیه سطوح دسترسی: بازرس، اتحادیه، اتاق اصناف) -->
      <div class="mobile-units-list" data-testid="mobile-units-cards">
        <article
          v-for="u in filteredUnits"
          :key="u.id"
          class="unit-mobile-card shadow-card"
          :data-testid="`unit-mobile-card-${u.id}`"
        >
          <!-- ردیف بالای کارت: کد پرونده و چیپ مرحله -->
          <div class="card-top-bar">
            <div class="unit-code-group">
              <span class="unit-code-badge">{{ fa(u.id) }}</span>
              <span class="union-chip">{{ u.union }}</span>
            </div>
            <span :class="['status-pill-table', getStatusBadgeClass(u.status)]">
              {{ statusLabels[u.status] || u.status }}
            </span>
          </div>

          <!-- نام تابلو و واحد صنفی -->
          <div class="card-name-row">
            <Building2 class="icon-sm text-primary flex-shrink-0" />
            <h3 class="card-unit-name">{{ u.name }}</h3>
          </div>

          <!-- اطلاعات متصدی و تلفن تماس -->
          <div class="card-operator-box">
            <div class="info-row">
              <span class="lbl">متصدی:</span>
              <strong class="val">{{ u.operator }}</strong>
              <span class="nat-val" dir="ltr">({{ fa(u.nationalId) }})</span>
            </div>
            <div class="info-row">
              <span class="lbl">شماره تماس:</span>
              <a :href="`tel:${u.mobile}`" class="phone-link" dir="ltr">{{ u.mobile }}</a>
            </div>
          </div>

          <!-- نشانی و منطقه شهرداری اهواز -->
          <div class="card-address-row">
            <MapPin class="icon-xs text-danger flex-shrink-0" />
            <span class="address-text">{{ u.region }} · {{ u.address }}</span>
          </div>

          <!-- وضعیت اخطار و تخلف -->
          <div class="card-violation-row">
            <div class="violation-item">
              <AlertTriangle class="icon-xs text-warning flex-shrink-0" />
              <span class="violation-txt">{{ u.violation }}</span>
            </div>
            <div v-if="u.warningNo" class="warning-meta-box">
              <span class="warning-tag">اخطار: {{ u.warningNo }}</span>
              <span class="date-txt">{{ u.date }}</span>
            </div>
          </div>

          <!-- نشانگر لاگ ویرایش ۵ فیلد در صورت وجود -->
          <div v-if="u.auditTrail && u.auditTrail.length > 0" class="audit-banner">
            <UserCheck class="icon-xs text-primary" />
            <span>مشخصات متصدی ویرایش شده (لاگ ۵ قلم فعال)</span>
          </div>

          <!-- دکمه‌های عملیاتی منطبق با نقش کاربر جاری -->
          <div class="card-actions-wrapper">
            <!-- دکمه ویرایش ۵ قلم -->
            <button
              type="button"
              class="btn-action edit"
              title="ویرایش مشخصات متصدی (۵ قلم داده)"
              @click="handleEditOperator(u)"
              data-testid="mobile-btn-edit-5fields"
            >
              <UserCheck class="icon-xs" />
              <span>ویرایش ۵ قلم</span>
            </button>

            <!-- عملیات مبتنی بر لوکیشن و مسیریابی (مخصوص اخطار، اخطار اماکن و اقدام به پلمپ) -->
            <button
              v-if="['warning_1', 'warning', 'warning_2', 'seal_ordered', 'seal_requested', 'readySeal'].includes(u.status)"
              type="button"
              class="btn-action navigate"
              title="مسیریابی از موقعیت فعلی به واحد صنفی در نقشه"
              @click="handleNavigateToUnit(u)"
              :data-testid="`mobile-btn-navigate-${u.id}`"
            >
              <Navigation class="icon-xs" />
              <span>مسیریابی</span>
            </button>

            <!-- اقدام ۱: ارجاع به اماکن (اخطار ۱) -->
            <button
              v-if="u.status === 'warning_1' || u.status === 'warning'"
              type="button"
              class="btn-action escalate"
              @click="handleEscalateToAmaken(u)"
            >
              <Clock class="icon-xs" />
              <span>ارجاع به اماکن</span>
            </button>

            <!-- اقدام ۲ (اتحادیه): تقاضای پلمپ اتحادیه -->
            <button
              v-if="u.status === 'warning_2'"
              type="button"
              class="btn-action seal-request"
              @click="handleRequestSealByUnion(u)"
            >
              <ShieldAlert class="icon-xs" />
              <span>تقاضای پلمپ اتحادیه</span>
            </button>

            <!-- اقدام ۳ (اتاق اصناف): صدور دستور پلمپ به اماکن -->
            <button
              v-if="(userRole === 'general' || userRole === 'admin') && (u.status === 'seal_requested' || u.status === 'readySeal')"
              type="button"
              class="btn-action chamber-order"
              @click="handleOpenChamberSealOrder(u)"
            >
              <FileCheck class="icon-xs" />
              <span>دستور پلمپ اتاق</span>
            </button>

            <!-- اقدام ۴ (اماکن): اجرای پلمپ در محل -->
            <button
              v-if="u.status === 'seal_ordered'"
              type="button"
              class="btn-action seal-execute"
              @click="handleExecuteFieldSeal(u)"
            >
              <Lock class="icon-xs" />
              <span>اجرای پلمپ در محل</span>
            </button>

            <!-- اقدام ۵ (اتحادیه): پیش‌نویس رفع/لغو -->
            <button
              v-if="u.status !== 'dismissed' && u.status !== 'unsealed'"
              type="button"
              class="btn-action draft-dismissal"
              @click="handleOpenUnionDraft(u)"
            >
              <FileText class="icon-xs" />
              <span>پیش‌نویس رفع/لغو</span>
            </button>

            <!-- اقدام ۶ (اتاق اصناف): تایید و ابلاغ منع پیگیری/فک به اماکن -->
            <button
              v-if="(userRole === 'general' || userRole === 'admin') && (u.resolutionType || u.fineTrackingCode)"
              type="button"
              class="btn-action approve-resolution"
              @click="handleOpenChamberResolution(u)"
            >
              <CheckSquare class="icon-xs" />
              <span>تایید و مهر اتاق</span>
            </button>
          </div>
        </article>

        <div v-if="filteredUnits.length === 0" class="empty-state">
          هیچ پرونده بازرسی در این مرحله مطابق فیلترهای انتخابی یافت نشد.
        </div>
      </div>

      <!-- ۲. نمایش جدولی دسکتاپ (فقط در صفحات بالای ۹۰۰ پیکسل) -->
      <div class="desktop-units-table table-scroll-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="text-center th-id">شناسه</th>
              <th>نام تابلو و صنف</th>
              <th>متصدی و کد ملی</th>
              <th>شماره تماس</th>
              <th>نشانی و منطقه</th>
              <th>مرحله فرآیند</th>
              <th>اطلاعات ممیزی و اخطار</th>
              <th class="text-center th-actions">عملیات متناسب با نقش</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in filteredUnits"
              :key="u.id"
              class="table-row"
              :data-testid="`inspection-row-${u.id}`"
            >
              <!-- شناسه پرونده -->
              <td class="font-bold text-center td-id">
                <span class="unit-code-badge ltr-text">{{ fa(u.id) }}</span>
              </td>

              <!-- نام واحد -->
              <td>
                <div class="unit-cell">
                  <span class="unit-title font-bold">{{ u.name }}</span>
                  <span class="union-sub">{{ u.union }}</span>
                </div>
              </td>

              <!-- متصدی -->
              <td>
                <div class="op-cell">
                  <span class="op-name font-bold">{{ u.operator }}</span>
                  <span class="op-nat font-sm ltr-text">{{ u.nationalId }}</span>
                </div>
              </td>

              <!-- تماس -->
              <td class="ltr-text font-bold font-sm">
                {{ u.mobile }}
              </td>

              <!-- نشانی -->
              <td>
                <span class="address-snippet" :title="u.address">{{ u.address }}</span>
              </td>

              <!-- مرحله -->
              <td>
                <span :class="['status-pill-table', getStatusBadgeClass(u.status)]">
                  {{ statusLabels[u.status] || u.status }}
                </span>
              </td>

              <!-- متادیتا و لاگ -->
              <td>
                <div class="meta-cell">
                  <span v-if="u.warningNo" class="warning-tag">اخطار: {{ u.warningNo }}</span>
                  <span v-if="u.auditTrail && u.auditTrail.length > 0" class="audit-tag" title="مشخصات متصدی ویرایش شده">
                    دارای لاگ ۵ فیلد
                  </span>
                  <span class="date-txt">{{ u.date }}</span>
                </div>
              </td>

              <!-- عملیات متناسب با نقش -->
              <td class="text-center td-actions">
                <div class="row-actions-group">
                  <!-- دکمه ویرایش ۵ قلم داده -->
                  <button
                    type="button"
                    class="btn-action edit"
                    title="ویرایش مشخصات متصدی (۵ قلم داده)"
                    @click="handleEditOperator(u)"
                    data-testid="btn-edit-operator-5fields"
                  >
                    <UserCheck class="icon-xs" />
                    <span>ویرایش ۵ قلم</span>
                  </button>

                  <!-- عملیات مبتنی بر لوکیشن و مسیریابی (مخصوص اخطار، اخطار اماکن و اقدام به پلمپ) -->
                  <button
                    v-if="['warning_1', 'warning', 'warning_2', 'seal_ordered', 'seal_requested', 'readySeal'].includes(u.status)"
                    type="button"
                    class="btn-action navigate"
                    title="مسیریابی از موقعیت فعلی به واحد صنفی در نقشه"
                    @click="handleNavigateToUnit(u)"
                    :data-testid="`btn-navigate-${u.id}`"
                  >
                    <Navigation class="icon-xs" />
                    <span>مسیریابی</span>
                  </button>

                  <!-- اقدام ۱: ارجاع به اماکن (انقضای ۷۲ ساعته اخطار اول) -->
                  <button
                    v-if="u.status === 'warning_1' || u.status === 'warning'"
                    type="button"
                    class="btn-action escalate"
                    title="انقضای ۳ روز و ارجاع به بازرس اماکن"
                    @click="handleEscalateToAmaken(u)"
                  >
                    <Clock class="icon-xs" />
                    <span>ارجاع به اماکن</span>
                  </button>

                  <!-- اقدام ۲ (ویژه اتحادیه): ارسال تقاضای پلمپ به اتاق اصناف -->
                  <button
                    v-if="u.status === 'warning_2'"
                    type="button"
                    class="btn-action seal-request"
                    title="گذشت ۱۰ روز و درخواست پلمپ از اتاق اصناف"
                    @click="handleRequestSealByUnion(u)"
                  >
                    <ShieldAlert class="icon-xs" />
                    <span>تقاضای پلمپ اتحادیه</span>
                  </button>

                  <!-- اقدام ۳ (ویژه اتاق اصناف): صدور دستور پلمپ به اماکن (الگوی ب) -->
                  <button
                    v-if="(userRole === 'general' || userRole === 'admin') && (u.status === 'seal_requested' || u.status === 'readySeal')"
                    type="button"
                    class="btn-action chamber-order"
                    title="صدور نامه رسمی دستور پلمپ اتاق اصناف به اماکن"
                    @click="handleOpenChamberSealOrder(u)"
                  >
                    <FileCheck class="icon-xs" />
                    <span>دستور پلمپ اتاق</span>
                  </button>

                  <!-- اقدام ۴ (ویژه بازرس اماکن): اجرای پلمپ در محل -->
                  <button
                    v-if="u.status === 'seal_ordered'"
                    type="button"
                    class="btn-action seal-execute"
                    title="اجرای میدانی حکم پلمپ و ثبت صورتمجلس"
                    @click="handleExecuteFieldSeal(u)"
                    data-testid="btn-execute-field-seal"
                  >
                    <Lock class="icon-xs" />
                    <span>اجرای پلمپ</span>
                  </button>

                  <!-- اقدام ۵ (ویژه اتحادیه): صدور پیش‌نویس منع پیگیری یا فک پلمپ (الگوی الف) -->
                  <button
                    v-if="u.status !== 'dismissed' && u.status !== 'unsealed'"
                    type="button"
                    class="btn-action draft-dismissal"
                    title="مراجعه حضوری متصدی به اتحادیه و صدور پیش‌نویس رفع تخلف"
                    @click="handleOpenUnionDraft(u)"
                  >
                    <FileText class="icon-xs" />
                    <span>پیش‌نویس اتحادیه</span>
                  </button>

                  <!-- اقدام ۶ (ویژه اتاق اصناف): تایید و ابلاغ منع پیگیری / فک پلمپ به اماکن -->
                  <button
                    v-if="(userRole === 'general' || userRole === 'admin') && (u.resolutionType || u.fineTrackingCode)"
                    type="button"
                    class="btn-action approve-resolution"
                    title="بررسی، ممهور نمودن به مهر اجرائیات و ابلاغ به اماکن"
                    @click="handleOpenChamberResolution(u)"
                  >
                    <CheckSquare class="icon-xs" />
                    <span>تایید و مهر اتاق</span>
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="filteredUnits.length === 0">
              <td colspan="8" class="empty-state">
                هیچ پرونده بازرسی در این مرحله مطابق فیلترهای انتخابی یافت نشد.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </PanelCard>

    <!-- Modal 1: ویرایش ۵ قلم داده -->
    <EditOperatorModal
      v-model="showEditOperatorModal"
      :unit="activeUnitForAction"
    />

    <!-- Modal 2: پیش‌نویس نامه اتحادیه به اتاق (الگوی الف) -->
    <UnionDismissalLetterDialog
      v-model="showUnionDraftDialog"
      :unit="activeUnitForAction"
      :request-type="activeStage === 'unsealed' || activeStage === 'seal_ordered' || activeUnitForAction?.status === 'sealed' || activeUnitForAction?.status === 'unsealed' ? 'unseal' : 'dismissal'"
    />

    <!-- Modal 3: نامه رسمی اتاق اصناف به اماکن (الگوی ب) -->
    <ChamberAmakenOrderDialog
      v-model="showChamberOrderDialog"
      :unit="activeUnitForAction"
      :mode="chamberOrderMode"
    />

    <!-- Modal 4: تخصیص بازرسی و سرکشی اولیه -->
    <AssignInspectionDialog
      v-model="showAssignDialog"
      :initial-unit-id="activeUnitForAction?.id"
    />

    <!-- Modal 5: فرم اختصاصی ثبت سرکشی میدانی بازرس و اخطاریه بدوی (مرحله ۱) -->
    <RegisterFieldInspectionDialog
      v-model="showRegisterFieldInspectionModal"
    />
    </template>
  </div>
</template>

<style scoped lang="scss">
.unit-inspections-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* --- Inspector Hub Specific Styles (۲ کارت اختصاصی بازرسان) --- */
.inspector-hub-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 58rem;
  margin: 2.5rem auto;
  width: 100%;
  padding-inline: 1rem;
}

.hub-cards-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.5rem;
  width: 100%;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.hub-card {
  container-type: inline-size;
  container-name: hub-card;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 1.25rem;
  border-radius: 1.5rem;
  background: var(--card);
  border: 1px solid var(--border);
  text-decoration: none;
  color: inherit;
  transition: all 0.25s ease;
  min-height: 15.5rem;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 640px) {
    padding: 2.25rem 0.85rem;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 32px -8px rgba(0, 0, 0, 0.12);
  }

  &.hub-card-new:hover {
    border-color: var(--primary);
    box-shadow: 0 16px 32px -8px rgba(37, 99, 235, 0.2);
  }

  &.hub-card-warning:hover {
    border-color: #eab308;
    box-shadow: 0 16px 32px -8px rgba(234, 179, 8, 0.2);
  }
}

.hub-card-top {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.hub-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.75rem;
  height: 3.75rem;
  border-radius: 1.15rem;

  &.icon-blue {
    background: rgba(37, 99, 235, 0.12);
    color: #2563eb;
  }

  &.icon-amber {
    background: rgba(234, 179, 8, 0.12);
    color: #b45309;
  }
}

.hub-card-title {
  font-size: clamp(1.15rem, 4.2cqw, 1.35rem);
  font-weight: 800;
  color: var(--foreground);
  margin: 0 0 0.75rem 0;
  text-align: center;
  white-space: nowrap;
}

.hub-card-desc {
  width: 100%;
  max-width: 100%;
  font-size: clamp(0.55rem, 3.1cqw, 0.9375rem);
  line-height: 1.65;
  color: var(--muted-foreground);
  margin: 0;
  text-align: center;
  box-sizing: border-box;
  word-break: normal;
  overflow-wrap: break-word;
}

.header-action-group {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.inspections-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.85rem;
  padding: 0.75rem 1.15rem;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);

  .header-title-box {
    display: flex;
    align-items: center;
    gap: 0.75rem;

    .header-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.35rem;
      height: 2.35rem;
      border-radius: var(--radius-md);
      background-color: oklch(from var(--primary) l c h / 10%);
      border: 1px solid oklch(from var(--primary) l c h / 20%);
      flex-shrink: 0;

      .header-icon {
        width: 1.25rem;
        height: 1.25rem;
      }
    }

    .header-text-group {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;

      .page-title-compact {
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--foreground);
        margin: 0;
        letter-spacing: -0.015em;
      }

      .page-subtitle-compact {
        font-size: 0.75rem;
        color: var(--muted-foreground);
        margin: 0;
      }
    }
  }
}

.action-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background-color: var(--primary);
  color: var(--primary-foreground);
  border: none;
  border-radius: var(--radius-md);
  padding: 0.48rem 0.95rem;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.9;
  }
}

.action-btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background-color: oklch(from var(--primary) l c h / 12%);
  color: var(--primary);
  border: 1px solid oklch(from var(--primary) l c h / 30%);
  border-radius: var(--radius-md);
  padding: 0.48rem 0.95rem;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: oklch(from var(--primary) l c h / 20%);
  }
}

.action-btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background-color: var(--card);
  color: var(--foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.48rem 0.95rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--muted);
    border-color: var(--primary);
  }
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 0.875rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.process-tabs-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.45rem 0.75rem;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  margin-inline: auto;
  width: fit-content;
  max-width: 100%;

  .process-tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.875rem;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    background: transparent;
    color: var(--muted-foreground);
    font-size: 0.8125rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s ease;

    .bullet {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 9999px;
      background-color: var(--muted-foreground);
      opacity: 0.5;
      transition: all 0.2s ease;
    }

    .tab-badge {
      font-size: 0.6875rem;
      padding: 0.1rem 0.45rem;
      border-radius: 9999px;
      background-color: oklch(from var(--muted-foreground) l c h / 16%);
      color: var(--muted-foreground);
      font-weight: 700;
      transition: all 0.2s ease;
    }

    &:hover {
      background-color: var(--muted);
      color: var(--foreground);

      .bullet {
        opacity: 0.8;
      }
    }

    &.is-active {
      background-color: var(--primary);
      color: var(--primary-foreground);
      border-color: var(--primary);
      box-shadow: 0 2px 6px oklch(from var(--primary) l c h / 25%);

      .bullet {
        background-color: var(--primary-foreground);
        opacity: 1;
        box-shadow: 0 0 6px var(--primary-foreground);
        transform: scale(1.2);
      }

      .tab-badge {
        background-color: rgba(255, 255, 255, 0.25);
        color: var(--primary-foreground);
      }
    }
  }
}

.active-stage-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  background: oklch(from var(--primary) l c h / 8%);
  border: 1px solid oklch(from var(--primary) l c h / 20%);
  border-radius: var(--radius-md);

  .banner-right {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.875rem;

    .bullet {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 9999px;
      background-color: var(--primary);
      box-shadow: 0 0 6px var(--primary);
    }

    strong {
      color: var(--foreground);
      font-weight: 700;
    }

    .banner-count {
      color: var(--primary);
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .banner-desc {
      color: var(--muted-foreground);
      font-size: 0.75rem;
    }
  }

  .duration-toggle-bar {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background-color: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.2rem 0.4rem;
  }

  .duration-label {
    font-size: 0.6875rem;
    color: var(--muted-foreground);
    margin-inline-end: 0.25rem;
  }

  .duration-pill-btn {
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 500;
    border: none;
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: var(--muted);
      color: var(--foreground);
    }

    &.is-active {
      background-color: var(--primary);
      color: var(--primary-foreground);
      font-weight: 700;
    }
  }

  .clear-stage-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.65rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--foreground);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--muted);
      border-color: var(--primary);
      color: var(--primary);
    }
  }
}

.bullet {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background-color: var(--muted-foreground);
  opacity: 0.6;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.tab-badge {
  font-size: 0.6875rem;
  padding: 0.1rem 0.45rem;
  border-radius: 9999px;
  background-color: oklch(from var(--muted-foreground) l c h / 20%);
  color: var(--muted-foreground);
  font-weight: 700;
}

.filter-grid {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-input-wrap {
  flex: 1;
  min-width: 18rem;
  position: relative;
  display: flex;
  align-items: center;

  .search-icon {
    position: absolute;
    right: 0.75rem;
    width: 1.1rem;
    height: 1.1rem;
    color: var(--muted-foreground);
    pointer-events: none;
  }

  .filter-input {
    width: 100%;
    padding: 0.55rem 0.75rem;
    padding-inline-start: 2.25rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background-color: var(--background);
    color: var(--foreground);
    font-family: inherit;
    font-size: 0.875rem;

    &:focus {
      outline: none;
      border-color: var(--primary);
    }
  }
}

.filter-select {
  padding: 0.55rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--background);
  color: var(--foreground);
  font-family: inherit;
  font-size: 0.875rem;
}

.btn-reset-filters {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted-foreground);
  font-size: 0.8125rem;
  cursor: pointer;

  &:hover {
    color: var(--foreground);
  }
}

.table-scroll-container {
  width: 100%;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;

  th {
    background-color: var(--muted);
    color: var(--muted-foreground);
    padding: 0.625rem 0.75rem;
    font-weight: 700;
    text-align: right;
    white-space: nowrap;
    border-bottom: 1px solid var(--border);

    &.text-center,
    &.th-id,
    &.th-actions {
      text-align: center;
    }

    &.th-id {
      width: 90px;
    }

    &.th-actions {
      min-width: 290px;
    }
  }

  td {
    padding: 0.625rem 0.75rem;
    border-bottom: 1px solid var(--border);
    color: var(--foreground);
    vertical-align: middle;

    &.text-center,
    &.td-id,
    &.td-actions {
      text-align: center;
    }
  }
}

.unit-code-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background-color: var(--muted);
  font-weight: 700;
  font-family: monospace;
}

.unit-cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;

  .unit-title {
    color: var(--foreground);
  }
  .union-sub {
    font-size: 0.6875rem;
    color: var(--muted-foreground);
  }
}

.op-cell {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.address-snippet {
  display: inline-block;
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.75rem;
}

.status-pill-table {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  white-space: nowrap;

  &.badge-warning-1 { background: #fef3c7; color: #92400e; }
  &.badge-warning-2 { background: #ffedd5; color: #9a3412; }
  &.badge-seal-requested { background: #fee2e2; color: #991b1b; }
  &.badge-seal-ordered { background: #fecaca; color: #b91c1c; }
  &.badge-sealed { background: #7f1d1d; color: #ffffff; }
  &.badge-resolved { background: #dcfce7; color: #166534; }
  &.badge-default { background: var(--muted); color: var(--foreground); }
}

.meta-cell {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.6875rem;

  .warning-tag {
    font-weight: 700;
    color: #b45309;
  }
  .audit-tag {
    color: #2563eb;
    font-weight: 600;
  }
  .date-txt {
    color: var(--muted-foreground);
  }
}

.row-actions-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  width: 100%;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.38rem 0.72rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
  }

  &:active {
    transform: translateY(0);
  }

    &.navigate {
      color: #0284c7;
      border: 1px solid #7dd3fc;
      background: #f0f9ff;
      &:hover {
        background: #e0f2fe;
        border-color: #38bdf8;
        color: #0369a1;
      }
    }

    &.edit {
      color: #15803d;
      border: 1px solid #86efac;
      background: #f0fdf4;
      &:hover {
        background: #dcfce7;
        border-color: #4ade80;
        color: #14532d;
      }
    }

  &.escalate {
    color: #b45309;
    border: 1px solid #fde68a;
    background: #fffbeb;
    &:hover {
      background: #fef3c7;
      border-color: #fcd34d;
      color: #78350f;
    }
  }

  &.seal-request {
    color: #c2410c;
    border: 1px solid #fed7aa;
    background: #fff7ed;
    &:hover {
      background: #ffedd5;
      border-color: #fdba74;
      color: #7c2d12;
    }
  }

  &.chamber-order {
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    &:hover {
      background: #dbeafe;
      border-color: #93c5fd;
      color: #1e3a8a;
    }
  }

  &.seal-execute {
    color: #ffffff;
    background: #dc2626;
    border: 1px solid #dc2626;
    &:hover {
      background: #b91c1c;
      border-color: #b91c1c;
      color: #ffffff;
    }
  }

  &.draft-dismissal {
    color: #0369a1;
    border: 1px solid #bae6fd;
    background: #f0f9ff;
    &:hover {
      background: #e0f2fe;
      border-color: #7dd3fc;
      color: #0c4a6e;
    }
  }

  &.approve-resolution {
    color: #047857;
    border: 1px solid #a7f3d0;
    background: #ecfdf5;
    &:hover {
      background: #d1fae5;
      border-color: #6ee7b7;
      color: #064e3b;
    }
  }
}

.empty-state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

// Stage 1 Banner
.stage1-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-lg);
  background: linear-gradient(to left, oklch(from var(--primary) l c h / 12%), oklch(from var(--primary) l c h / 4%));
  border: 1px solid oklch(from var(--primary) l c h / 25%);

  .banner-info {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .banner-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--radius-md);
    background: oklch(from var(--primary) l c h / 15%);
  }

  .banner-title {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--primary);
  }

  .banner-text {
    margin: 0.2rem 0 0;
    font-size: 0.8125rem;
    color: var(--muted-foreground);
  }

  .btn-stage1-register {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    background: var(--primary);
    color: var(--primary-foreground);
    border: none;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s ease;

    &:hover {
      opacity: 0.9;
    }
  }
}

// Table & Mobile responsiveness
.mobile-units-list {
  display: flex !important;
  flex-direction: column;
  gap: 0.875rem;

  @media (min-width: 900px) {
    display: none !important;
  }
}

.desktop-units-table {
  display: none !important;

  @media (min-width: 900px) {
    display: block !important;
  }
}

// Mobile Card Item
.unit-mobile-card {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  .card-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .unit-code-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .union-chip {
    font-size: 0.6875rem;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-sm);
    background: var(--muted);
    color: var(--muted-foreground);
    font-weight: 600;
  }

  .card-name-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .card-unit-name {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--foreground);
    }
  }

  .card-operator-box {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: oklch(from var(--foreground) l c h / 3%);
    border-radius: var(--radius-md);
    font-size: 0.8125rem;

    @media (max-width: 480px) {
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;

      .lbl { color: var(--muted-foreground); }
      .val { color: var(--foreground); }
      .nat-val { font-size: 0.75rem; color: var(--muted-foreground); }
      .phone-link {
        color: var(--primary);
        text-decoration: none;
        font-weight: 700;
        &:hover { text-decoration: underline; }
      }
    }
  }

  .card-address-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }

  .card-violation-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.75rem;

    .violation-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: #b45309;
      font-weight: 600;
    }

    .warning-meta-box {
      display: flex;
      align-items: center;
      gap: 0.4rem;

      .warning-tag {
        font-weight: 700;
        color: #b45309;
      }
      .date-txt {
        color: var(--muted-foreground);
      }
    }
  }

  .audit-banner {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.6875rem;
    color: #2563eb;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    padding: 0.25rem 0.6rem;
    border-radius: var(--radius-sm);
  }

  .card-actions-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-top: 0.25rem;
    padding-top: 0.5rem;
    border-top: 1px dashed var(--border);

    .btn-action {
      flex: 1 1 auto;
      justify-content: center;
      padding-block: 0.45rem;
    }
  }
}

.icon-xs { width: 0.9rem; height: 0.9rem; }
.icon-sm { width: 1.1rem; height: 1.1rem; }
.icon-md { width: 1.35rem; height: 1.35rem; }
.font-sm { font-size: 0.6875rem; }
.ltr-text { direction: ltr; text-align: left; }
</style>

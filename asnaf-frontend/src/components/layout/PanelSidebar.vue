<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from 'src/stores/session';
import { useUnitsStore } from 'src/stores/units';
import { useSpecializedStore } from 'src/stores/specialized';
import { reportModules } from 'src/utils/data';
import emblem from 'src/assets/emblem.png';
import {
  LayoutDashboard,
  Map,
  ShieldAlert,
  Wheat,
  Gauge,
  BarChart3,
  History,
  Settings,
  LogOut,
  X,
  ChevronDown,
  Scale,
  Hourglass,
  FileText,
  Layers,
  ShoppingBag,
  Beef,
  UtensilsCrossed,
  Wrench,
  Gem,
  Shirt,
  Cake,
  Tv,
  Hammer,
  Store,
  Building2,
} from 'lucide-vue-next';

defineProps<{
  open?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const unitsStore = useUnitsStore();
const specializedStore = useSpecializedStore();

function getSpecializedIcon(iconName?: string) {
  switch (iconName) {
    case 'ShoppingBag':
      return ShoppingBag;
    case 'Beef':
      return Beef;
    case 'UtensilsCrossed':
      return UtensilsCrossed;
    case 'Wrench':
      return Wrench;
    case 'Gem':
      return Gem;
    case 'Shirt':
      return Shirt;
    case 'Cake':
      return Cake;
    case 'Tv':
      return Tv;
    case 'Hammer':
      return Hammer;
    default:
      return Store;
  }
}

// Accordion open states
const openModules = ref<Record<string, boolean>>({
  missions: false,
  inspections: false,
  dismissal: false,
  warnings: false,
  specialized: false,
  reports: false,
});

// Auto-expand module if route matches
watch(
  () => [route.path, route.query],
  ([path, query]) => {
    if (typeof path === 'string' && path.startsWith('/warnings')) openModules.value.warnings = true;
    if (typeof path === 'string' && path.startsWith('/missions')) {
      openModules.value.missions = true;
      if (path.startsWith('/missions/inspections')) {
        openModules.value.inspections = true;
        if (query && typeof query === 'object' && 'stage' in query && query.stage === 'dismissed') {
          openModules.value.dismissal = true;
        }
      }
    }
    if (typeof path === 'string' && (path.startsWith('/bread') || path.startsWith('/specialized'))) openModules.value.specialized = true;
    if (typeof path === 'string' && path.startsWith('/reports')) openModules.value.reports = true;
  },
  { immediate: true }
);

function toggleModule(mod: string): void {
  openModules.value[mod] = !openModules.value[mod];
}

function handleLogout(): void {
  sessionStore.logout();
  router.push('/');
}

const isUnion = computed(() => sessionStore.session?.role === 'union');
const unionAllowed = [0, 4, 5, 8, 9, 11];

const availableReports = computed(() => {
  return reportModules
    .map((name, index) => ({ name, index }))
    .filter(({ index }) => !isUnion.value || unionAllowed.includes(index));
});

const currentReportId = computed(() => {
  if (route.path !== '/reports') return null;
  const q = Number(route.query.id);
  return isNaN(q) ? 0 : q;
});
</script>

<template>
  <aside :class="['panel-sidebar', { 'is-open': open }]" data-testid="panel-sidebar">
    <div class="sidebar-header">
      <div class="sidebar-emblem-wrap">
        <img :src="emblem" alt="نشان سامانه" class="sidebar-emblem" />
      </div>
      <div class="sidebar-titles">
        <p class="sidebar-main-title">سامانه جامع نظارت اصناف</p>
        <p class="sidebar-sub-title">شهرستان اهواز</p>
      </div>
      <button class="close-btn" @click="emit('close')" aria-label="بستن">
        <X class="icon-sm" />
      </button>
    </div>

    <nav class="sidebar-nav">
      <!-- ۱. داشبورد اصلی -->
      <router-link
        v-if="sessionStore.canAccess('dashboard')"
        to="/dashboard"
        :class="['nav-link', { 'is-active': route.path === '/dashboard' }]"
        @click="emit('close')"
        data-testid="nav-dashboard"
      >
        <span v-if="route.path === '/dashboard'" class="active-indicator" />
        <LayoutDashboard :class="['nav-icon', { 'is-active-icon': route.path === '/dashboard' }]" />
        <span class="nav-label">داشبورد مرکزی</span>
      </router-link>

      <!-- ۲. ماموریت‌های بازرسی (ساختار درختی شامل بازرسی واحدهای صنفی) -->
      <div v-if="sessionStore.canAccess('missions')" class="accordion-item">
        <button
          type="button"
          :class="['nav-link accordion-toggle', { 'is-active': route.path.startsWith('/missions') }]"
          @click="toggleModule('missions')"
          data-testid="nav-missions-accordion"
        >
          <span v-if="route.path.startsWith('/missions')" class="active-indicator" />
          <Map :class="['nav-icon', { 'is-active-icon': route.path.startsWith('/missions') }]" />
          <span class="nav-label">ماموریت‌های بازرسی</span>
          <ChevronDown class="icon-xs chevron" :class="{ 'rotate-180': openModules.missions }" />
        </button>

        <div v-if="openModules.missions" class="accordion-sub-menu">
          <!-- سطح ۲ درختی: فهرست ماموریت‌ها و GIS (فقط برای نقش مدیر ارشد Admin) -->
          <router-link
            v-if="sessionStore.session?.role === 'admin'"
            to="/missions"
            :class="['sub-link', { 'is-sub-active': route.path === '/missions' }]"
            @click="emit('close')"
            data-testid="subnav-missions-gis"
          >
            <span class="bullet" />
            <span>فهرست ماموریت‌ها و GIS</span>
          </router-link>

          <!-- سطح ۲ درختی: شکایات ثبت شده در سامانه سیمبا (انحصاری فقط برای نقش admin) -->
          <router-link
            v-if="sessionStore.session?.role === 'admin'"
            to="/missions/complaints"
            :class="['sub-link', { 'is-sub-active': route.path === '/missions/complaints' }]"
            @click="emit('close')"
            data-testid="subnav-missions-complaints"
          >
            <span class="bullet" />
            <span>شکایات ثبت شده در سامانه سیمبا</span>
          </router-link>

          <!-- برای نقش بازرسان: پیوند مستقیم به صفحه بازرسی واحدهای صنفی (بدون زیرمنو) -->
          <router-link
            v-if="sessionStore.session?.role === 'inspector'"
            to="/missions/inspections"
            :class="['sub-link', { 'is-sub-active': route.path.startsWith('/missions/inspections') }]"
            @click="emit('close')"
            data-testid="subnav-inspections-direct"
          >
            <span class="bullet" />
            <span>بازرسی واحدهای صنفی</span>
          </router-link>

          <!-- برای سایر نقش‌ها (اتحادیه‌ها و اتاق اصناف): ساختار درختی همراه با زیرمنوهای مجزا -->
          <div v-else class="nested-tree-branch">
            <button
              type="button"
              :class="['nested-tree-toggle', { 'is-nested-active': route.path.startsWith('/missions/inspections') }]"
              @click="toggleModule('inspections')"
              data-testid="subnav-inspections-tree-toggle"
            >
              <span class="bullet" />
              <span class="nested-tree-label">بازرسی واحدهای صنفی</span>
              <ChevronDown class="icon-xs chevron" :class="{ 'rotate-180': openModules.inspections }" />
            </button>

            <!-- سطح ۳ درختی: زیرمجموعه بازرسی واحدهای صنفی -->
            <div v-if="openModules.inspections" class="nested-tree-sub-menu">
              <!-- ۱. ثبت سرکشی جدید (مشترک اتحادیه و اتاق اصناف) -->
              <router-link
                to="/missions/inspections/new"
                :class="['sub-sub-link', { 'is-sub-active': route.path === '/missions/inspections/new' }]"
                @click="emit('close')"
                data-testid="subnav-inspections-new"
              >
                <span class="bullet" />
                <span class="sub-link-title">ثبت سرکشی جدید</span>
              </router-link>

              <!-- ۲. اخطار ۷۲ ساعته (مشترک اتحادیه و اتاق اصناف) -->
              <router-link
                to="/missions/inspections/warnings"
                :class="['sub-sub-link', { 'is-sub-active': route.path === '/missions/inspections/warnings' || (route.path === '/missions/inspections' && route.query.stage === 'warning_1') }]"
                @click="emit('close')"
                data-testid="subnav-inspections-warnings"
              >
                <span class="bullet" />
                <span class="sub-link-title">اخطار ۷۲ ساعته</span>
              </router-link>

              <!-- ۳. اقدام به پلمپ (اختصاصی اتاق اصناف) -->
              <router-link
                v-if="!isUnion"
                to="/missions/inspections/seal"
                :class="['sub-sub-link', { 'is-sub-active': route.path === '/missions/inspections/seal' }]"
                @click="emit('close')"
                data-testid="subnav-inspections-seal"
              >
                <span class="bullet" />
                <span class="sub-link-title">اقدام به پلمپ</span>
              </router-link>

              <!-- ۴. منع پیگیری -->
              <!-- الف) برای اتحادیه: لینک مستقیم به سه ماه (بدون زیرمنو) -->
              <router-link
                v-if="isUnion"
                to="/missions/inspections/dismissed?duration=3m"
                :class="['sub-sub-link', { 'is-sub-active': route.path === '/missions/inspections/dismissed' || (route.path === '/missions/inspections' && route.query.stage === 'dismissed') }]"
                @click="emit('close')"
                data-testid="subnav-inspections-dismissed-union"
              >
                <span class="bullet" />
                <span class="sub-link-title">منع پیگیری</span>
              </router-link>

              <!-- ب) برای اتاق اصناف: دارای دو زیرمنوی یک ماه و سه ماه -->
              <div v-else class="nested-sub-branch">
                <button
                  type="button"
                  :class="['sub-sub-link nested-sub-toggle', { 'is-sub-active': route.path === '/missions/inspections/dismissed' || (route.path === '/missions/inspections' && route.query.stage === 'dismissed') }]"
                  @click="toggleModule('dismissal')"
                  data-testid="subnav-inspections-dismissal-toggle"
                >
                  <span class="bullet" />
                  <span class="sub-link-title">منع پیگیری</span>
                  <ChevronDown class="icon-xs chevron" :class="{ 'rotate-180': openModules.dismissal }" />
                </button>

                <div v-if="openModules.dismissal" class="nested-sub-items">
                  <router-link
                    to="/missions/inspections/dismissed?duration=1m"
                    :class="['nested-leaf-link', { 'is-leaf-active': (route.path === '/missions/inspections/dismissed' || route.path === '/missions/inspections') && route.query.duration === '1m' }]"
                    @click="emit('close')"
                    data-testid="subnav-inspections-dismissed-1m"
                  >
                    <span class="leaf-dot" />
                    <span>یک ماه</span>
                  </router-link>

                  <router-link
                    to="/missions/inspections/dismissed?duration=3m"
                    :class="['nested-leaf-link', { 'is-leaf-active': (route.path === '/missions/inspections/dismissed' || route.path === '/missions/inspections') && (route.query.duration === '3m' || !route.query.duration) }]"
                    @click="emit('close')"
                    data-testid="subnav-inspections-dismissed-3m"
                  >
                    <span class="leaf-dot" />
                    <span>سه ماه</span>
                  </router-link>
                </div>
              </div>

              <!-- ۵. فک پلمپ (اختصاصی اتاق اصناف) -->
              <router-link
                v-if="!isUnion"
                to="/missions/inspections/unseal"
                :class="['sub-sub-link', { 'is-sub-active': route.path === '/missions/inspections/unseal' || (route.path === '/missions/inspections' && route.query.stage === 'unsealed') }]"
                @click="emit('close')"
                data-testid="subnav-inspections-unsealed"
              >
                <span class="bullet" />
                <span class="sub-link-title">فک پلمپ</span>
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- ۳. مدیریت اخطار و پلمپ (ماژول کلان با ۳ زیرسامانه) -->
      <div v-if="sessionStore.canAccess('warnings')" class="accordion-item">
        <button
          type="button"
          :class="['nav-link accordion-toggle', { 'is-active': route.path.startsWith('/warnings') }]"
          @click="toggleModule('warnings')"
          data-testid="nav-warnings-accordion"
        >
          <span v-if="route.path.startsWith('/warnings')" class="active-indicator" />
          <ShieldAlert :class="['nav-icon', { 'is-active-icon': route.path.startsWith('/warnings') }]" />
          <span class="nav-label">مدیریت اخطار و پلمپ</span>
          <ChevronDown class="icon-xs chevron" :class="{ 'rotate-180': openModules.warnings }" />
        </button>

        <div v-if="openModules.warnings" class="accordion-sub-menu">
          <router-link
            to="/warnings?tab=management"
            :class="['sub-link', { 'is-sub-active': route.path === '/warnings' && (!route.query.tab || route.query.tab === 'management') }]"
            @click="emit('close')"
            data-testid="subnav-warning-management"
          >
            <FileText class="icon-xs text-muted-sub" />
            <span>سامانه مدیریت اخطارها</span>
          </router-link>

          <router-link
            to="/warnings?tab=article27"
            :class="['sub-link', { 'is-sub-active': route.path === '/warnings' && route.query.tab === 'article27' }]"
            @click="emit('close')"
            data-testid="subnav-article27"
          >
            <Scale class="icon-xs text-muted-sub" />
            <span>تطبیق اخطارهای ماده ۲۷</span>
          </router-link>

          <router-link
            to="/warnings?tab=grace"
            :class="['sub-link', { 'is-sub-active': route.path === '/warnings' && route.query.tab === 'grace' }]"
            @click="emit('close')"
            data-testid="subnav-grace"
          >
            <Hourglass class="icon-xs text-muted-sub" />
            <span>تطبیق هوشمند امهال</span>
          </router-link>
        </div>
      </div>

      <!-- ۴. ماژول‌های تخصصی اصناف و اتحادیه‌ها -->
      <div v-if="sessionStore.canAccess('specialized') || sessionStore.canAccess('bread')" class="accordion-item">
        <button
          type="button"
          :class="['nav-link accordion-toggle', { 'is-active': route.path.startsWith('/bread') || route.path.startsWith('/specialized') }]"
          @click="toggleModule('specialized')"
          data-testid="nav-specialized-accordion"
        >
          <span v-if="route.path.startsWith('/bread') || route.path.startsWith('/specialized')" class="active-indicator" />
          <Layers :class="['nav-icon', { 'is-active-icon': route.path.startsWith('/bread') || route.path.startsWith('/specialized') }]" />
          <span class="nav-label">ماژول‌های تخصصی اصناف</span>
          <ChevronDown class="icon-xs chevron" :class="{ 'rotate-180': openModules.specialized }" />
        </button>

        <div v-if="openModules.specialized" class="accordion-sub-menu">
          <router-link
            to="/specialized"
            :class="['sub-link', { 'is-sub-active': route.path === '/specialized' }]"
            @click="emit('close')"
            data-testid="subnav-specialized-hub"
          >
            <span class="bullet" />
            <span>مرکز پایش ماژول‌ها (Hub)</span>
          </router-link>

          <router-link
            to="/bread"
            :class="['sub-link', { 'is-sub-active': route.path === '/bread' }]"
            @click="emit('close')"
            data-testid="subnav-specialized-bread"
          >
            <Wheat class="icon-xs text-muted-sub" />
            <span>نان و آرد یارانه‌ای</span>
          </router-link>

          <router-link
            v-for="union in specializedStore.allUnionsList"
            :key="union.slug"
            :to="`/specialized/${union.slug}`"
            :class="['sub-link', { 'is-sub-active': route.path === `/specialized/${union.slug}` }]"
            @click="emit('close')"
            :data-testid="`subnav-specialized-${union.slug}`"
          >
            <component :is="getSpecializedIcon(union.iconName)" class="icon-xs text-muted-sub" />
            <span>{{ union.badgeText || union.name }}</span>
          </router-link>
        </div>
      </div>

      <!-- ۵. مرکز گزارشات و تحلیل‌ها -->
      <div v-if="sessionStore.canAccess('reports')" class="accordion-item">
        <button
          type="button"
          :class="['nav-link accordion-toggle', { 'is-active': route.path.startsWith('/reports') }]"
          @click="toggleModule('reports')"
          data-testid="nav-reports-accordion"
        >
          <span v-if="route.path.startsWith('/reports')" class="active-indicator" />
          <BarChart3 :class="['nav-icon', { 'is-active-icon': route.path.startsWith('/reports') }]" />
          <span class="nav-label">گزارشات و تحلیل‌ها</span>
          <ChevronDown class="icon-xs chevron" :class="{ 'rotate-180': openModules.reports }" />
        </button>

        <div v-if="openModules.reports" class="accordion-sub-menu reports-sub-menu">
          <router-link
            v-for="{ name, index } in availableReports"
            :key="index"
            :to="{ path: '/reports', query: { id: index } }"
            :class="[
              'sub-link report-sub-link',
              { 'is-sub-active': route.path === '/reports' && currentReportId === index }
            ]"
            @click="emit('close')"
            :data-testid="`nav-report-item-${index + 1}`"
          >
            <span class="bullet" />
            <span class="report-title-text" :title="name">{{ name }}</span>
          </router-link>
        </div>
      </div>

      <!-- ابزارهای تکمیلی -->
      <router-link
        v-if="sessionStore.canAccess('risk')"
        to="/risk"
        :class="['nav-link', { 'is-active': route.path.startsWith('/risk') }]"
        @click="emit('close')"
      >
        <span v-if="route.path.startsWith('/risk')" class="active-indicator" />
        <Gauge :class="['nav-icon', { 'is-active-icon': route.path.startsWith('/risk') }]" />
        <span class="nav-label">رتبه‌بندی فازی ریسک</span>
      </router-link>

      <router-link
        v-if="sessionStore.canAccess('audit')"
        to="/audit"
        :class="['nav-link', { 'is-active': route.path.startsWith('/audit') }]"
        @click="emit('close')"
      >
        <span v-if="route.path.startsWith('/audit')" class="active-indicator" />
        <History :class="['nav-icon', { 'is-active-icon': route.path.startsWith('/audit') }]" />
        <span class="nav-label">تاریخچه ممیزی</span>
      </router-link>

      <!-- مدیریت ۵۲ اتحادیه (اختصاصی کاربران اتاق اصناف) -->
      <router-link
        v-if="sessionStore.canAccess('unions')"
        to="/unions"
        :class="['nav-link', { 'is-active': route.path.startsWith('/unions') }]"
        @click="emit('close')"
        data-testid="nav-unions-management"
      >
        <span v-if="route.path.startsWith('/unions')" class="active-indicator" />
        <Building2 :class="['nav-icon', { 'is-active-icon': route.path.startsWith('/unions') }]" />
        <span class="nav-label">مدیریت اتحادیه‌ها</span>
      </router-link>

      <router-link
        v-if="sessionStore.canAccess('settings')"
        to="/settings"
        :class="['nav-link', { 'is-active': route.path.startsWith('/settings') }]"
        @click="emit('close')"
      >
        <span v-if="route.path.startsWith('/settings')" class="active-indicator" />
        <Settings :class="['nav-icon', { 'is-active-icon': route.path.startsWith('/settings') }]" />
        <span class="nav-label">تنظیمات کاربری</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <button class="logout-btn" @click="handleLogout" data-testid="sidebar-logout-btn">
        <LogOut class="icon-sm" />
        <span>خروج از سامانه</span>
      </button>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.panel-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  left: auto;
  width: 18.5rem;
  min-width: 18.5rem;
  max-width: 85vw;
  flex-shrink: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  background-color: var(--sidebar);
  color: var(--sidebar-foreground);
  border-left: 1px solid var(--sidebar-border);
  border-right: none;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  transform: translateX(100%);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.35);

  &.is-open {
    transform: translateX(0) !important;
  }
}

.sidebar-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  height: var(--header-height, 4rem);
  box-sizing: border-box;
  gap: 0.75rem;
  border-bottom: 1px solid var(--sidebar-border);
  padding: 0 1rem;
  overflow: hidden;
}

.sidebar-emblem-wrap {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
}

.sidebar-emblem {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: brightness(0) invert(1);
}

.sidebar-titles {
  display: flex;
  flex-direction: column;
  justify-content: center;
  line-height: 1.25;
  min-width: 0;
  flex: 1;
}

.sidebar-main-title {
  font-size: 0.8125rem;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #ffffff;
}

.sidebar-sub-title {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-btn {
  margin-inline-start: auto;
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
  border-radius: var(--radius-md);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.sidebar-nav {
  flex: 1 1 0%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.75rem 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 9999px;
  }
}

.menu-divider {
  height: 1px;
  background-color: rgba(255, 255, 255, 0.1);
  margin: 0.5rem 0 0.25rem;
}

.menu-category-title {
  font-size: 0.6875rem;
  color: #94a3b8;
  padding: 0.25rem 0.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.accordion-item {
  display: flex;
  flex-direction: column;
}

.accordion-toggle {
  width: 100%;
  border: none !important;
  background: transparent !important;
  cursor: pointer;
  text-align: right;
  color: inherit !important;
  box-shadow: none !important;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08) !important;
    color: #ffffff !important;
  }
}

.chevron {
  transition: transform 0.2s ease;
  color: #94a3b8;

  &.rotate-180 {
    transform: rotate(180deg);
  }
}

.badge-counter {
  font-size: 0.6875rem;
  font-weight: 700;
  background-color: rgba(245, 158, 11, 0.18);
  color: var(--sidebar-primary);
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  margin-inline-end: 0.25rem;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.accordion-sub-menu {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding-inline-start: 0.75rem;
  margin-top: 0.125rem;
  margin-bottom: 0.25rem;
  border-inline-start: 1px solid rgba(255, 255, 255, 0.15);
  margin-inline-start: 1.25rem;
}

.reports-sub-menu {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.sub-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.42rem 0.625rem;
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  font-weight: 500;
  color: #e2e8f0;
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: #ffffff;
  }

  &.is-sub-active {
    background-color: rgba(245, 158, 11, 0.14);
    color: var(--sidebar-primary);
    font-weight: 700;

    .bullet {
      background-color: var(--sidebar-primary);
    }
  }
}

.report-sub-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.38rem 0.5rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 500;
  color: #e2e8f0;
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: #ffffff;
  }

  &.is-sub-active {
    background-color: rgba(245, 158, 11, 0.14);
    color: var(--sidebar-primary);
    font-weight: 700;
  }
}

.report-index-badge {
  display: grid;
  place-items: center;
  width: 1.35rem;
  height: 1.35rem;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background-color: rgba(255, 255, 255, 0.12);
  color: #f1f5f9;
  font-size: 0.6875rem;
  font-weight: 700;

  &.is-active-badge {
    background-color: var(--sidebar-primary);
    color: var(--sidebar-primary-foreground, #0f172a);
  }
}

.report-title-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: inherit;
}

.step-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  flex-shrink: 0;

  &.yellow { background-color: #f59e0b; }
  &.orange { background-color: #ea580c; }
  &.red { background-color: #dc2626; }
  &.dark-red { background-color: #991b1b; }
  &.green { background-color: #16a34a; }
}

.sub-link-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bullet {
  width: 0.25rem;
  height: 0.25rem;
  border-radius: 9999px;
  background-color: #94a3b8;
}

.bullet-mini {
  width: 0.2rem;
  height: 0.2rem;
  border-radius: 9999px;
  background-color: #94a3b8;
  flex-shrink: 0;
}

.nested-tree-branch {
  display: flex;
  flex-direction: column;
  margin-top: 0.15rem;
}

.nested-tree-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.42rem 0.625rem;
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  font-weight: 600;
  color: #e2e8f0;
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: right;
  transition: all 0.15s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: #ffffff;
  }

  &.is-nested-active {
    color: var(--sidebar-primary);
    font-weight: 700;

    .bullet {
      background-color: var(--sidebar-primary);
    }
  }
}

.nested-tree-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nested-tree-sub-menu {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding-inline-start: 0.75rem;
  margin-top: 0.125rem;
  margin-bottom: 0.25rem;
  border-inline-start: 1px dashed rgba(255, 255, 255, 0.2);
  margin-inline-start: 0.85rem;
}

.sub-sub-link {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.5rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 500;
  color: #cbd5e1;
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: #ffffff;
  }

  &.is-sub-active {
    background-color: rgba(245, 158, 11, 0.14);
    color: var(--sidebar-primary);
    font-weight: 700;

    .bullet {
      background-color: var(--sidebar-primary);
    }
  }
}

.nested-sub-branch {
  display: flex;
  flex-direction: column;
}

.nested-sub-toggle {
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: right;

  .chevron {
    margin-inline-start: auto;
  }
}

.nested-sub-items {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding-inline-start: 0.65rem;
  margin-top: 0.1rem;
  margin-bottom: 0.2rem;
  border-inline-start: 1px dotted rgba(255, 255, 255, 0.25);
  margin-inline-start: 0.85rem;
}

.nested-leaf-link {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.28rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.715rem;
  font-weight: 500;
  color: #94a3b8;
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: #ffffff;
  }

  &.is-leaf-active {
    background-color: rgba(245, 158, 11, 0.16);
    color: var(--sidebar-primary);
    font-weight: 700;

    .leaf-dot {
      background-color: var(--sidebar-primary);
      box-shadow: 0 0 4px var(--sidebar-primary);
    }
  }
}

.leaf-dot {
  width: 0.25rem;
  height: 0.25rem;
  border-radius: 9999px;
  background-color: #64748b;
  flex-shrink: 0;
}

.mini-counter {
  margin-inline-start: auto;
  font-size: 0.625rem;
  font-weight: 600;
  background-color: rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  padding: 0.05rem 0.35rem;
  border-radius: 9999px;
}

.text-muted-sub {
  color: #94a3b8;
}

.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: var(--radius-lg);
  padding: 0.55rem 0.75rem;
  padding-inline-start: 1rem;
  font-size: 0.8125rem;
  text-decoration: none;
  background: transparent;
  border: none;
  color: #f8fafc;
  transition: all 0.15s ease;
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: #ffffff;
  }

  &.is-active {
    background-color: rgba(245, 158, 11, 0.14);
    color: var(--sidebar-primary);
    font-weight: 700;
  }

  &:focus,
  &:focus-visible {
    outline: none !important;
    box-shadow: none !important;
  }
}

.nav-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  color: #94a3b8;

  &.is-active-icon {
    color: var(--sidebar-primary);
  }
}

.nav-label {
  flex: 1;
}

.active-indicator {
  position: absolute;
  right: 0.25rem;
  left: auto;
  top: 50%;
  transform: translateY(-50%);
  width: 0.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  background-color: var(--sidebar-primary);
}

.sidebar-footer {
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.75rem 1rem;
  background-color: var(--sidebar);
}

.logout-btn {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.4);
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
</style>

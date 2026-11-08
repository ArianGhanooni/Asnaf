<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from 'src/stores/session';
import { can, type Section } from 'src/types/auth';
import PanelSidebar from 'src/components/layout/PanelSidebar.vue';
import PanelHeader from 'src/components/layout/PanelHeader.vue';
import AccessDenied from 'src/components/layout/AccessDenied.vue';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const sidebarOpen = ref(false);

const navMap: Record<string, { label: string; section: Section }> = {
  '/dashboard': { label: 'داشبورد مرکزی', section: 'dashboard' },
  '/missions/inspections/warnings': { label: 'اخطارهای ۷۲ ساعته بازرسی', section: 'missions' },
  '/missions/inspections/amaken': { label: 'اخطارهای ثانویه اماکن', section: 'missions' },
  '/missions/inspections/seal': { label: 'اقدام به پلمپ واحدهای صنفی', section: 'missions' },
  '/missions/inspections/dismissed': { label: 'منع پیگیری واحدهای صنفی', section: 'missions' },
  '/missions/inspections/unseal': { label: 'فک پلمپ واحدهای صنفی', section: 'missions' },
  '/missions/inspections/new': { label: 'ثبت سرکشی و بازرسی جدید', section: 'missions' },
  '/missions/complaints': { label: 'شکایات ثبت شده در سامانه سیمبا', section: 'missions' },
  '/missions/inspections': { label: 'بازرسی واحدهای صنفی', section: 'missions' },
  '/missions': { label: 'فهرست ماموریت‌ها و GIS', section: 'missions' },
  '/warnings': { label: 'اخطار و پلمپ', section: 'warnings' },
  '/bread': { label: 'ماژول نان و آرد', section: 'bread' },
  '/specialized/supermarket': { label: 'ماژول سوپرمارکت و اقلام اساسی', section: 'specialized' },
  '/specialized/protein': { label: 'ماژول گوشت و مواد پروتئینی', section: 'specialized' },
  '/specialized/restaurant': { label: 'ماژول رستوران و اغذیه‌فروشان', section: 'specialized' },
  '/specialized/automotive': { label: 'ماژول خدمات فنی و تعمیرکاران خودرو', section: 'specialized' },
  '/specialized': { label: 'سامانه ماژول‌های تخصصی اصناف', section: 'specialized' },
  '/risk': { label: 'رتبه‌بندی فازی ریسک', section: 'risk' },
  '/reports': { label: 'گزارشات', section: 'reports' },
  '/audit': { label: 'تاریخچه ممیزی', section: 'audit' },
  '/settings': { label: 'تنظیمات کاربری', section: 'settings' },
};

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && sidebarOpen.value) {
    sidebarOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  sessionStore.initSession();
  if (sessionStore.ready && !sessionStore.isAuthenticated) {
    router.push('/');
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

watch(
  () => route.path,
  () => {
    sidebarOpen.value = false;
  }
);

watch(
  () => [sessionStore.ready, sessionStore.isAuthenticated],
  ([ready, isAuth]) => {
    if (ready && !isAuth) {
      router.push('/');
    }
  }
);

const currentNav = computed(() => {
  if (route.path === '/missions/inspections/dismissed') {
    const duration = route.query.duration as string;
    if (duration === '1m') return { label: 'منع پیگیری (مهلت ۱ ماهه)', section: 'missions' as Section };
    if (duration === '3m') return { label: 'منع پیگیری (مهلت ۳ ماهه)', section: 'missions' as Section };
    return { label: 'منع پیگیری واحدهای صنفی', section: 'missions' as Section };
  }
  if (route.path === '/missions/inspections') {
    const stage = route.query.stage as string;
    const duration = route.query.duration as string;
    if (stage === 'seal_ordered') return { label: 'اقدام به پلمپ واحدهای صنفی', section: 'missions' as Section };
    if (stage === 'dismissed') {
      if (duration === '1m') return { label: 'منع پیگیری (مهلت ۱ ماهه)', section: 'missions' as Section };
      if (duration === '3m') return { label: 'منع پیگیری (مهلت ۳ ماهه)', section: 'missions' as Section };
      return { label: 'منع پیگیری پرونده‌های صنفی', section: 'missions' as Section };
    }
    if (stage === 'unsealed') return { label: 'فک پلمپ واحدهای صنفی', section: 'missions' as Section };
    if (stage === 'warning_2') return { label: 'اخطارهای ثانویه اماکن', section: 'missions' as Section };
    return { label: 'بازرسی واحدهای صنفی', section: 'missions' as Section };
  }
  const match = Object.entries(navMap).find(([path]) => route.path.startsWith(path));
  if (match) {
    return match[1];
  }
  return { label: 'پنل', section: 'dashboard' as Section };
});

const isAllowed = computed(() => {
  if (!sessionStore.session) return false;
  const role = sessionStore.session.role;
  if (role === 'admin') return true;

  // برای نقش‌های غیر ادمین، فهرست مأموریت‌های سازمانی GIS و شکایات سیمبا مسدود است
  if (route.path === '/missions') {
    return false;
  }
  if (route.path.startsWith('/missions/complaints')) {
    return false;
  }

  return can(role, currentNav.value.section);
});
</script>

<template>
  <div v-if="sessionStore.isAuthenticated" class="panel-layout" dir="rtl">
    <!-- Sidebar Backdrop -->
    <div
      v-if="sidebarOpen && sessionStore.session?.role !== 'inspector'"
      class="sidebar-backdrop"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar (Hidden for Inspector, starts closed on login) -->
    <PanelSidebar
      v-if="sessionStore.session?.role !== 'inspector'"
      :open="sidebarOpen"
      @close="sidebarOpen = false"
    />

    <!-- Main Content Area -->
    <div :class="['main-wrapper', { 'is-inspector': sessionStore.session?.role === 'inspector' }]">
      <PanelHeader
        :title="currentNav.label"
        @toggle-menu="sidebarOpen = !sidebarOpen"
      />

      <main class="page-content">
        <router-view v-if="isAllowed" />
        <AccessDenied v-else />
      </main>
    </div>
  </div>
  <div v-else class="loading-screen" />
</template>

<style scoped lang="scss">
.panel-layout {
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  max-width: 100vw;
  background-color: var(--background);
  direction: rtl;
  position: relative;
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  z-index: 45;
  background-color: oklch(from var(--foreground) l c h / 45%);
  backdrop-filter: blur(2px);
  transition: opacity 0.25s ease;
}

.main-wrapper {
  display: flex;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  margin-right: 0;
  margin-left: 0;
  flex: 1;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;

  &.is-inspector {
    margin-right: 0 !important;
    margin-left: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }
}

.page-content {
  flex: 1;
  min-width: 0;
  max-width: 100%;
  padding: 1rem;

  @media (min-width: 768px) {
    padding: 2rem;
  }
}

.loading-screen {
  min-height: 100vh;
  background-color: var(--background);
}
</style>

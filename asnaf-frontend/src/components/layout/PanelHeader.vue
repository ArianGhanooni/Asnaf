<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from 'src/stores/session';
import emblem from 'src/assets/emblem.png';
import {
  Menu,
  Bell,
  Sun,
  Moon,
  Settings,
  ArrowRight,
  LogOut,
  User,
} from 'lucide-vue-next';

defineProps<{
  title?: string;
}>();

const emit = defineEmits<{
  (e: 'toggle-menu'): void;
}>();

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();

const isInspector = computed(() => sessionStore.session?.role === 'inspector');
const canGoBack = computed(() => isInspector.value && route.path !== '/dashboard');
const userDisplayName = computed(() => {
  if (isInspector.value) {
    return 'آرین قانونی';
  }
  return sessionStore.session?.name ?? '';
});

const userRoleTitle = computed(() => {
  const role = sessionStore.session?.role;
  if (role === 'inspector' || role === 'union') {
    return 'بازرس اتحادیه';
  }
  if (role === 'general') {
    return 'اتاق اصناف اهواز';
  }
  if (role === 'admin') {
    return 'مدیر ارشد سامانه';
  }
  return 'بازرس اتحادیه';
});

const userPersonnelCode = computed(() => {
  const role = sessionStore.session?.role;
  if (role === 'inspector') return '۴۰۱۲';
  if (role === 'union') return 'صنف-۹۲۸';
  if (role === 'general') return 'اتاق-۱۰۱';
  return 'ADM-001';
});

// Dropdown state for inspector user info popover (always opens to the left)
const isMenuOpen = ref(false);
const userPillContainerRef = ref<HTMLElement | null>(null);

function toggleUserMenu(e: Event): void {
  e.stopPropagation();
  isMenuOpen.value = !isMenuOpen.value;
}

function handleClickOutside(e: MouseEvent): void {
  if (userPillContainerRef.value && !userPillContainerRef.value.contains(e.target as Node)) {
    isMenuOpen.value = false;
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    isMenuOpen.value = false;
  }
}

watch(() => route.fullPath, () => {
  isMenuOpen.value = false;
});

onMounted(() => {
  window.addEventListener('click', handleClickOutside);
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside);
  window.removeEventListener('keydown', handleKeydown);
});

function handleBack(): void {
  const currentPath = route.path;

  // ۱. در صورتی که داخل زیرپنل، جزئیات واحد یا ویرایش در همان مرحله هستیم (?unit=... یا هر query)
  if (Object.keys(route.query).length > 0) {
    void router.push({ path: currentPath, query: {} });
    return;
  }

  // ۲. بازگشت سلسله‌مراتبی از ۴ مرحله اخطار، اخطار اماکن، اقدام به پلمپ، ثبت سرکشی جدید به هاب ماموریت‌های بازرسی
  if (
    currentPath.startsWith('/missions/inspections/warnings') ||
    currentPath.startsWith('/missions/inspections/amaken') ||
    currentPath.startsWith('/missions/inspections/seal') ||
    currentPath.startsWith('/missions/inspections/new')
  ) {
    void router.push('/missions/inspections');
    return;
  }

  // ۳. بازگشت از هاب ماموریت‌های بازرسی یا سایر صفحات زیرمجموعه مأموریت‌ها به داشبورد
  if (currentPath.startsWith('/missions')) {
    void router.push('/dashboard');
    return;
  }

  // ۴. بازگشت پیش‌فرض برای صفحات دیگر نظیر تنظیمات به داشبورد
  void router.push('/dashboard');
}

function handleLogout(): void {
  sessionStore.logout();
  void router.push('/login');
}
</script>

<template>
  <header class="panel-header">
    <!-- Back Button for Inspector in Sub-pages (Hierarchical back, not browser backspace) -->
    <button
      v-if="canGoBack"
      class="action-btn back-btn"
      @click="handleBack"
      aria-label="بازگشت به مرحله قبل"
      title="بازگشت به مرحله قبل"
      data-testid="header-back-btn"
    >
      <ArrowRight class="header-icon" />
    </button>

    <button
      v-if="!isInspector"
      class="menu-btn"
      @click="emit('toggle-menu')"
      aria-label="منو"
    >
      <Menu class="header-icon" />
    </button>
    
    <!-- Title or Official Emblem Banner for Inspector -->
    <div
      v-if="isInspector"
      class="inspector-brand-hero"
      data-testid="header-inspector-brand"
    >
      <img
        :src="emblem"
        alt="لوگوی اتاق اصناف"
        class="brand-logo-img"
        :class="{ 'is-dark': sessionStore.theme === 'dark' }"
      />
      <div class="brand-title-text">
        <span class="brand-title-main">سامانه جامع نظارت اصناف</span>
        <span class="brand-title-sub">شهرستان اهواز</span>
      </div>
    </div>

    <div class="header-actions">
      <!-- User Identity Tag beside Notification Bell (Interactive Dropdown opening to the left) -->
      <div
        v-if="sessionStore.session"
        ref="userPillContainerRef"
        class="inspector-user-pill-container"
      >
        <button
          type="button"
          class="inspector-user-pill"
          :class="{ 'is-active': isMenuOpen }"
          data-testid="header-inspector-user-pill"
          aria-label="اطلاعات کاربر"
          :aria-expanded="isMenuOpen"
          @click="toggleUserMenu"
        >
          <div class="user-pill-avatar">
            <User class="user-pill-icon" />
          </div>
          <div class="user-pill-details">
            <span class="user-pill-name">{{ userDisplayName }}</span>
            <span class="user-pill-union">{{ userRoleTitle }}</span>
          </div>
        </button>

        <!-- Submenu / Popover opening explicitly to the LEFT -->
        <transition name="popover-fade">
          <div
            v-if="isMenuOpen"
            class="user-popover-card"
            data-testid="header-inspector-dropdown"
          >
            <div class="user-popover-header">
              <div class="user-popover-avatar">
                <User class="user-popover-icon" />
              </div>
              <div class="user-popover-meta">
                <span class="user-popover-name">{{ userDisplayName }}</span>
                <span class="user-popover-role">{{ userRoleTitle }}</span>
              </div>
            </div>

            <div class="user-popover-divider" />

            <div class="user-popover-info-row">
              <span class="info-label">وضعیت حساب:</span>
              <span class="status-badge">
                <span class="status-dot" />
                آماده به خدمت
              </span>
            </div>

            <div class="user-popover-info-row">
              <span class="info-label">شناسه / کد پرسنلی:</span>
              <span class="info-value">{{ userPersonnelCode }}</span>
            </div>

            <div class="user-popover-info-row">
              <span class="info-label">شماره همراه:</span>
              <span class="info-value">{{ sessionStore.session.mobile || '۰۹۱۶۵۵۵۷۷۸۸' }}</span>
            </div>
          </div>
        </transition>
      </div>

      <button class="action-btn" aria-label="اعلان‌ها">
        <Bell class="header-icon" />
        <span class="notification-dot" />
      </button>

      <!-- Settings Icon Button (placed beside Theme Toggle) - Only for Inspector -->
      <router-link
        v-if="isInspector"
        to="/settings"
        class="action-btn"
        aria-label="تنظیمات"
        data-testid="header-settings-btn"
      >
        <Settings class="header-icon" />
      </router-link>

      <button class="action-btn" @click="sessionStore.toggleTheme" aria-label="تغییر تم" title="تغییر تم">
        <Sun v-if="sessionStore.theme === 'dark'" class="header-icon" />
        <Moon v-else class="header-icon" />
      </button>

      <button
        class="action-btn logout-btn"
        @click="handleLogout"
        aria-label="خروج از سامانه"
        title="خروج از سامانه"
        data-testid="header-logout-btn"
      >
        <LogOut class="header-icon" />
      </button>
    </div>
  </header>
</template>

<style scoped lang="scss">
.panel-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  height: var(--header-height, 4rem);
  box-sizing: border-box;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid var(--border);
  background-color: var(--card);
  padding-inline: 1rem;

  @media (min-width: 768px) {
    padding-inline: 2rem;
  }
}

.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--foreground);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-md);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--muted);
  }
}

.current-section-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 0;
}

.inspector-brand-hero {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-shrink: 0;

  .brand-logo-img {
    width: 2.375rem;
    height: 2.375rem;
    object-fit: contain;
    flex-shrink: 0;
    transition: filter 0.25s ease;

    // در لایت مد دقیقاً رنگ اصلی حفظ شده و در دارک مد به رنگ سفید خالص تغییر می‌یابد
    :root.dark &,
    body.body--dark &,
    &.is-dark {
      filter: brightness(0) invert(1);
    }
  }

  .brand-title-text {
    display: none; // در ابعاد موبایل پنهان است تا با مشخصات کاربر و ابزارهای هدر همپوشانی نکند

    @media (min-width: 768px) {
      display: flex;
      flex-direction: column;
      justify-content: center;
      line-height: 1.25;
    }

    .brand-title-main {
      font-size: 0.875rem;
      font-weight: 800;
      color: var(--foreground);
      white-space: nowrap;
      letter-spacing: -0.015em;

      @media (min-width: 1024px) {
        font-size: 0.9375rem;
      }
    }

    .brand-title-sub {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--muted-foreground);
      white-space: nowrap;
      margin-top: 0.05rem;
    }
  }
}

.header-actions {
  margin-inline-start: auto;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.inspector-user-pill-container {
  position: relative;
  display: flex;
  align-items: center;
}

.inspector-user-pill {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-inline: 0.75rem;
  padding-block: 0.25rem;
  border-radius: var(--radius-lg);
  background-color: var(--muted);
  border: 1px solid var(--border);
  margin-inline-end: 0.25rem;
  flex-shrink: 0;
  cursor: pointer;
  color: inherit;
  font: inherit;
  text-align: start;
  transition: all 0.2s ease;

  &:hover,
  &.is-active {
    background-color: oklch(from var(--muted) l c h / 75%);
    border-color: var(--primary);
  }

  .user-pill-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 9999px;
    background-color: oklch(from var(--primary) l c h / 12%);
    color: var(--primary);
    flex-shrink: 0;
    transition: all 0.2s ease;
  }

  .user-pill-icon {
    width: 1rem;
    height: 1rem;
  }

  .user-pill-details {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
  }

  .user-pill-name {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--foreground);
    white-space: nowrap;
  }

  .user-pill-union {
    font-size: 0.6875rem;
    color: var(--muted-foreground);
    white-space: nowrap;
  }

  // در اندازه موبایل: فقط آیکون شخص نمایش داده می‌شود و با کلیک روی آن زیرمنو باز می‌شود
  @media (max-width: 768px) {
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    justify-content: center;
    border-radius: var(--radius-md);
    background-color: transparent;
    border: none;
    margin-inline-end: 0;

    .user-pill-avatar {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: var(--radius-md);
      background-color: var(--muted);
      border: 1px solid var(--border);
      color: var(--foreground);
    }

    .user-pill-icon {
      width: 1.125rem;
      height: 1.125rem;
    }

    &:hover .user-pill-avatar,
    &:focus-visible .user-pill-avatar,
    &.is-active .user-pill-avatar {
      background-color: oklch(from var(--primary) l c h / 12%);
      color: var(--primary);
      border-color: var(--primary);
    }

    .user-pill-details {
      display: none !important;
    }
  }
}

.user-popover-card {
  position: absolute;
  top: calc(100% + 8px);
  right: 0; // لبه راست منو دقیقاً با لبه راست دکمه تراز شده و کارت به سمت چپ باز می‌شود
  left: auto;
  z-index: 100;
  padding: 0.85rem 1rem;
  width: max-content;
  min-width: 13.5rem;
  max-width: min(18rem, calc(100vw - 1rem));
  direction: rtl;
  color: var(--foreground);
  background-color: var(--card);
  border-radius: 0.85rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.22), 0 8px 10px -6px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--border);
  box-sizing: border-box;

  .user-popover-header {
    display: flex;
    align-items: center;
    gap: 0.65rem;

    .user-popover-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 9999px;
      background-color: oklch(from var(--primary) l c h / 12%);
      color: var(--primary);
      flex-shrink: 0;

      .user-popover-icon {
        width: 1.15rem;
        height: 1.15rem;
      }
    }

    .user-popover-meta {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;

      .user-popover-name {
        font-size: 0.875rem;
        font-weight: 800;
        color: var(--foreground);
      }

      .user-popover-role {
        font-size: 0.725rem;
        color: var(--muted-foreground);
      }
    }
  }

  .user-popover-divider {
    height: 1px;
    background-color: var(--border);
    margin-block: 0.65rem;
  }

  .user-popover-info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.75rem;
    margin-block: 0.35rem;

    .info-label {
      color: var(--muted-foreground);
    }

    .info-value {
      font-weight: 600;
      color: var(--foreground);
      font-feature-settings: 'tnum';
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-weight: 700;
      color: #16a34a;

      .status-dot {
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 9999px;
        background-color: #22c55e;
        box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
      }
    }
  }
}

.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}

.action-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--foreground);
  cursor: pointer;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-md);
  transition: background-color 0.15s ease;

  &:hover {
    background-color: var(--muted);
  }
}

.logout-btn {
  color: var(--destructive);

  &:hover {
    background-color: var(--destructive-bg);
    color: var(--destructive);
  }
}

.header-icon {
  width: 1.125rem;
  height: 1.125rem;
}

.notification-dot {
  position: absolute;
  top: 0.5rem;
  inset-inline-start: 0.5rem;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background-color: var(--destructive);
}
</style>

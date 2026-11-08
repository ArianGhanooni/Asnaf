<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSessionStore } from 'src/stores/session';
import { useUnionsStore } from 'src/stores/unions';
import {
  useChamberUsersStore,
  type ChamberUserAccount,
  type RoleMatrixItem,
  systemSections,
} from 'src/stores/chamberUsers';
import ChamberUserManageDialog from 'src/components/settings/ChamberUserManageDialog.vue';
import RoleManageDialog from 'src/components/settings/RoleManageDialog.vue';
import RolesPermissionsMatrixCard from 'src/components/settings/RolesPermissionsMatrixCard.vue';
import { roleLabels, type Role } from 'src/types/auth';
import { useQuasar } from 'quasar';
import { fa } from 'src/utils/fa';
import {
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  Save,
  ShieldAlert,
  ShieldCheck,
  ShieldPlus,
  Building2,
  Store,
  UserCheck,
  Bell,
  Check,
  Sparkles,
  BadgeCheck,
  UserPlus,
  UserCog,
  Users,
  Search,
  ExternalLink,
  Unlock,
  Trash2,
  Edit3,
  Plus,
} from 'lucide-vue-next';

const $q = useQuasar();
const sessionStore = useSessionStore();
const unionsStore = useUnionsStore();
const chamberUsersStore = useChamberUsersStore();

const activeTab = ref<'mobile' | 'password' | 'permissions' | 'notifications'>('mobile');
const mobile = ref(sessionStore.session?.mobile ?? '');
const pwNext = ref('');
const pwConfirm = ref('');
const currentPass = ref('');

const showCurrent = ref(false);
const showNext = ref(false);
const showConfirm = ref(false);

const notifySms = ref(true);
const notifySound = ref(true);
const offlineMapCache = ref(false);
const isSaving = ref(false);

// Sub-tabs in "مدیریت کاربران و نقش‌ها"
const subTab = ref<'users' | 'matrix'>('users');
const userRoleFilter = ref<'all' | 'chamber' | 'union' | 'inspector'>('all');
const userSearchQuery = ref('');

// Modals
const showChamberUserModal = ref(false);
const selectedChamberUserForEdit = ref<ChamberUserAccount | null>(null);

const showRoleModal = ref(false);
const selectedRoleForEdit = ref<RoleMatrixItem | null>(null);

function openCreateChamberUser(): void {
  selectedChamberUserForEdit.value = null;
  showChamberUserModal.value = true;
}

function openEditChamberUser(chamberUser: ChamberUserAccount): void {
  selectedChamberUserForEdit.value = chamberUser;
  showChamberUserModal.value = true;
}

function openCreateRole(): void {
  selectedRoleForEdit.value = null;
  showRoleModal.value = true;
}

function openEditRole(role: RoleMatrixItem): void {
  selectedRoleForEdit.value = role;
  showRoleModal.value = true;
}

function confirmDeleteRole(role: RoleMatrixItem): void {
  $q.dialog({
    title: 'حذف نقش از سامانه',
    message: `آیا از حذف نقش «${role.title}» و کلیه اختیارات تعیین‌شده برای آن اطمینان دارید؟`,
    ok: { label: 'حذف نقش', color: 'negative' },
    cancel: { label: 'انصراف', flat: true },
    persistent: true,
  }).onOk(() => {
    chamberUsersStore.deleteRole(role.id);
    $q.notify({
      type: 'positive',
      message: `نقش «${role.title}» با موفقیت حذف گردید.`,
      position: 'top',
    });
  });
}

function confirmDeleteUser(u: UnifiedUserItem): void {
  $q.dialog({
    title: 'حذف حساب کاربری',
    message: `آیا از حذف حساب کاربری «${u.fullName}» (${u.roleTitle}) اطمینان دارید؟ این عملیات قابل بازگشت نیست.`,
    ok: { label: 'حذف کاربر', color: 'negative' },
    cancel: { label: 'انصراف', flat: true },
    persistent: true,
  }).onOk(() => {
    if (u.type === 'chamber') {
      chamberUsersStore.deleteChamberUser(u.rawId);
    } else if (u.type === 'union') {
      unionsStore.deleteUnionUser(u.rawId);
    }
    $q.notify({
      type: 'positive',
      message: `حساب کاربری «${u.fullName}» با موفقیت حذف گردید.`,
      position: 'top',
    });
  });
}

interface UnifiedUserItem {
  id: string;
  rawId: number;
  type: 'chamber' | 'union' | 'inspector';
  fullName: string;
  username: string;
  nationalId: string;
  mobile: string;
  roleTitle: string;
  org: string;
  unionId?: number;
  isActive: boolean;
  permissionsSummary: string;
  rawChamberUser?: ChamberUserAccount;
}

const unifiedUsers = computed<UnifiedUserItem[]>(() => {
  const result: UnifiedUserItem[] = [];

  // 1. Chamber Users
  for (const cu of chamberUsersStore.chamberUsers) {
    result.push({
      id: `chamber-${cu.id}`,
      rawId: cu.id,
      type: 'chamber',
      fullName: cu.fullName,
      username: cu.username || '',
      nationalId: cu.nationalId,
      mobile: cu.mobile,
      roleTitle: cu.roleTitle,
      org: 'اتاق اصناف اهواز',
      isActive: cu.isActive,
      permissionsSummary: 'دسترسی حاکمیتی اتاق',
      rawChamberUser: cu,
    });
  }

  // 2. Union Users
  for (const uu of unionsStore.unionUsers) {
    result.push({
      id: `union-${uu.id}`,
      rawId: uu.id,
      type: 'union',
      fullName: uu.fullName,
      username: uu.username || '',
      nationalId: uu.nationalId,
      mobile: uu.mobile,
      roleTitle: uu.roleTitle,
      org: uu.unionName,
      unionId: uu.unionId,
      isActive: uu.isActive,
      permissionsSummary: 'دسترسی اتحادیه صنفی',
    });
  }

  // 3. Inspectors
  for (const ins of chamberUsersStore.inspectors) {
    result.push({
      id: `ins-${ins.id}`,
      rawId: ins.id,
      type: 'inspector',
      fullName: ins.fullName,
      username: ins.username || '',
      nationalId: ins.code,
      mobile: ins.mobile,
      roleTitle: `بازرس میدانی (${ins.rank})`,
      org: ins.region,
      isActive: ins.isActive,
      permissionsSummary: 'نظارت میدانی و بازرسی',
    });
  }

  return result;
});

const totalUsersCount = computed(() => unifiedUsers.value.length);
const chamberUsersCount = computed(() => unifiedUsers.value.filter((u) => u.type === 'chamber').length);
const unionUsersCount = computed(() => unifiedUsers.value.filter((u) => u.type === 'union').length);
const inspectorsCount = computed(() => unifiedUsers.value.filter((u) => u.type === 'inspector').length);

const filteredUsers = computed(() => {
  const q = userSearchQuery.value.trim().toLowerCase();
  return unifiedUsers.value.filter((u) => {
    if (userRoleFilter.value !== 'all' && u.type !== userRoleFilter.value) {
      return false;
    }
    if (!q) return true;
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.nationalId.includes(q) ||
      u.mobile.includes(q) ||
      u.roleTitle.toLowerCase().includes(q) ||
      u.org.toLowerCase().includes(q)
    );
  });
});

function toggleUserStatus(u: UnifiedUserItem): void {
  if (u.type === 'chamber') {
    chamberUsersStore.toggleChamberUserStatus(u.rawId);
  } else if (u.type === 'union') {
    unionsStore.toggleUnionUserStatus(u.rawId);
  } else if (u.type === 'inspector') {
    chamberUsersStore.toggleInspectorStatus(u.rawId);
  }
  $q.notify({
    type: 'info',
    message: `وضعیت حساب کاربری «${u.fullName}» به ${u.isActive ? 'غیرفعال' : 'فعال'} تغییر یافت.`,
    position: 'top',
  });
}

watch(
  () => sessionStore.session,
  (newSession) => {
    if (newSession) {
      mobile.value = newSession.mobile;
    }
  },
  { immediate: true }
);

const userRole = computed<Role>(() => sessionStore.session?.role ?? 'inspector');
const isUnion = computed(() => userRole.value === 'union');
const isGeneral = computed(() => userRole.value === 'general');
const isAdmin = computed(() => userRole.value === 'admin');
const canAccessUsersAndRoles = computed(() => isGeneral.value || isAdmin.value);

watch(
  userRole,
  () => {
    if (!canAccessUsersAndRoles.value && activeTab.value === 'permissions') {
      activeTab.value = 'mobile';
    }
    if (userRole.value === 'inspector' && activeTab.value === 'notifications') {
      activeTab.value = 'mobile';
    }
  },
  { immediate: true }
);

const roleBadgeInfo = computed(() => {
  switch (userRole.value) {
    case 'inspector':
      return {
        badgeClass: 'badge-inspector',
        icon: UserCheck,
        code: '۴۰۱۲',
      };
    case 'union':
      return {
        badgeClass: 'badge-union',
        icon: Store,
        code: 'صنف-۹۲۸',
      };
    case 'general':
      return {
        badgeClass: 'badge-general',
        icon: Building2,
        code: 'اتاق-۱۰۱',
      };
    case 'admin':
    default:
      return {
        badgeClass: 'badge-admin',
        icon: ShieldCheck,
        code: 'ADM-001',
      };
  }
});

function saveSettings(): void {
  if (!currentPass.value) {
    $q.notify({
      type: 'negative',
      message: 'جهت ذخیره تغییرات، وارد کردن رمز عبور فعلی الزامی است.',
      position: 'top',
    });
    return;
  }
  if (!/^09\d{9}$/.test(mobile.value)) {
    $q.notify({
      type: 'negative',
      message: 'شماره موبایل معتبر نیست (فرمت صحیح: ۰۹xxxxxxxxx).',
      position: 'top',
    });
    return;
  }
  if (pwNext.value && pwNext.value.length < 6) {
    $q.notify({
      type: 'negative',
      message: 'رمز عبور جدید باید حداقل حاوی ۶ کاراکتر باشد.',
      position: 'top',
    });
    return;
  }
  if (pwNext.value && pwNext.value !== pwConfirm.value) {
    $q.notify({
      type: 'negative',
      message: 'تکرار رمز عبور با رمز عبور جدید مطابقت ندارد.',
      position: 'top',
    });
    return;
  }

  isSaving.value = true;
  setTimeout(() => {
    if (sessionStore.session && sessionStore.session.mobile !== mobile.value) {
      sessionStore.session = {
        ...sessionStore.session,
        mobile: mobile.value,
      };
      localStorage.setItem('asnaf-session', JSON.stringify(sessionStore.session));
    }

    currentPass.value = '';
    pwNext.value = '';
    pwConfirm.value = '';
    isSaving.value = false;

    $q.notify({
      type: 'positive',
      message: 'تنظیمات حساب کاربری با موفقیت به‌روزرسانی شد.',
      caption: `نقش: ${roleLabels[userRole.value]}`,
      position: 'top',
    });
  }, 400);
}
</script>

<template>
  <div class="settings-page-container" data-testid="settings-page">
    <!-- Header with identical spacing & structure to RegisterFieldInspectionPage -->
    <div class="settings-header">
      <div class="title-wrap">
        <h1 class="page-title">تنظیمات کاربری</h1>
      </div>
    </div>

    <!-- 1. Profile Hero Banner for the Current Role -->
    <div class="profile-hero-card" :class="roleBadgeInfo.badgeClass">
      <div class="hero-main-content">
        <div class="hero-avatar-wrap">
          <div class="hero-avatar">
            <component :is="roleBadgeInfo.icon" class="avatar-icon" />
          </div>
          <span class="avatar-status-dot" title="حساب فعال" />
        </div>

        <div class="hero-user-meta">
          <div class="user-name-row">
            <h2 class="user-display-name">{{ sessionStore.session?.name }}</h2>
          </div>
          <div class="user-sub-row">
            <span class="user-org-text">
              <Building2 class="inline-icon" />
              <span>{{ sessionStore.session?.org }}</span>
            </span>
            <span class="meta-dot">·</span>
            <span class="user-code-text">
              شناسه صنفی/پرسنلی: <strong>{{ roleBadgeInfo.code }}</strong>
            </span>
            <span class="meta-dot">·</span>
            <span class="user-status-text">
              <span class="live-dot" />
              حساب فعال و برخط
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Main Settings Panel Card -->
    <div class="settings-main-card">
      <!-- Responsive Segmented Tabs Bar -->
      <div class="settings-tabs-bar" role="tablist">
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'mobile'"
          :class="['tab-nav-btn', { 'is-active': activeTab === 'mobile' }]"
          data-testid="settings-tab-mobile"
          @click="activeTab = 'mobile'"
        >
          <Smartphone class="tab-icon" />
          <span>موبایل ورود</span>
        </button>

        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'password'"
          :class="['tab-nav-btn', { 'is-active': activeTab === 'password' }]"
          data-testid="settings-tab-password"
          @click="activeTab = 'password'"
        >
          <Lock class="tab-icon" />
          <span>رمز عبور</span>
        </button>

        <!-- Only visible for Chamber of Commerce role (General) and Admin -->
        <button
          v-if="canAccessUsersAndRoles"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'permissions'"
          :class="['tab-nav-btn', { 'is-active': activeTab === 'permissions' }]"
          data-testid="settings-tab-permissions"
          @click="activeTab = 'permissions'"
        >
          <UserCog class="tab-icon" />
          <span>مدیریت کاربران و نقش‌ها</span>
        </button>

        <!-- Only visible for non-inspector roles (Union and Chamber) -->
        <button
          v-if="userRole !== 'inspector'"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'notifications'"
          :class="['tab-nav-btn', { 'is-active': activeTab === 'notifications' }]"
          data-testid="settings-tab-notifications"
          @click="activeTab = 'notifications'"
        >
          <Bell class="tab-icon" />
          <span>اعلان‌ها و هشدارها</span>
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="tab-pane-content">
        <!-- Tab 1: Mobile -->
        <div v-if="activeTab === 'mobile'" class="tab-content-panel">
          <div class="current-mobile-badge-box">
            <div class="badge-icon-wrap">
              <Smartphone class="badge-box-icon" />
            </div>
            <div class="badge-box-text">
              <span class="badge-box-label">شماره همراه فعال در سامانه:</span>
              <strong class="badge-box-val font-mono" dir="ltr">{{ sessionStore.session?.mobile || '۰۹۱۶۵۵۵۷۷۸۸' }}</strong>
            </div>
            <span class="badge-status-tag">
              <Check class="icon-xs" />
              احراز هویت شده
            </span>
          </div>

          <div class="field-group">
            <label for="mob" class="field-label">شماره تلفن همراه ورود به سامانه:</label>
            <div class="input-wrap">
              <input
                id="mob"
                v-model="mobile"
                type="text"
                dir="rtl"
                data-testid="settings-mobile-input"
                class="settings-input font-mono"
                placeholder="0916..."
              />
              <Smartphone class="input-inline-icon" />
            </div>
          </div>
        </div>

        <!-- Tab 2: Password -->
        <div v-if="activeTab === 'password'" class="tab-content-panel">
          <div class="password-fields-grid">
            <div class="field-group">
              <label for="p1" class="field-label">رمز عبور جدید (اختیاری):</label>
              <div class="input-wrap">
                <input
                  id="p1"
                  v-model="pwNext"
                  :type="showNext ? 'text' : 'password'"
                  dir="rtl"
                  data-testid="settings-new-password-input"
                  class="settings-input"
                  placeholder="حداقل ۶ کاراکتر"
                />
                <button
                  type="button"
                  class="password-toggle-btn"
                  aria-label="نمایش رمز جدید"
                  @click="showNext = !showNext"
                >
                  <EyeOff v-if="showNext" class="icon-sm" />
                  <Eye v-else class="icon-sm" />
                </button>
              </div>
            </div>

            <div class="field-group">
              <label for="p2" class="field-label">تکرار رمز عبور جدید:</label>
              <div class="input-wrap">
                <input
                  id="p2"
                  v-model="pwConfirm"
                  :type="showConfirm ? 'text' : 'password'"
                  dir="rtl"
                  data-testid="settings-confirm-password-input"
                  class="settings-input"
                  placeholder="تکرار رمز عبور جدید"
                />
                <button
                  type="button"
                  class="password-toggle-btn"
                  aria-label="نمایش تکرار رمز"
                  @click="showConfirm = !showConfirm"
                >
                  <EyeOff v-if="showConfirm" class="icon-sm" />
                  <Eye v-else class="icon-sm" />
                </button>
              </div>
            </div>
          </div>

          <!-- Password Guidelines -->
          <div class="password-guidelines-box">
            <h5 class="guidelines-title">
              <ShieldCheck class="icon-sm text-primary" />
              <span>معیارهای استاندارد امنیت کلمه عبور:</span>
            </h5>
            <ul class="guidelines-list">
              <li>حداقل ۶ کاراکتر شامل حروف و ارقام انگلیسی</li>
              <li>عدم استفاده از الگوهای ساده و تکراری (نظیر ۱۲۳۴۵۶ یا نام کاربری)</li>
              <li>توصیه به به‌روزرسانی دوره‌ای رمز عبور هر ۹۰ روز یک‌بار</li>
            </ul>
          </div>
        </div>

        <!-- Tab 3: مدیریت کاربران و نقش‌ها (Only for Chamber of Commerce role: General and Admin) -->
        <div v-if="canAccessUsersAndRoles && activeTab === 'permissions'" class="tab-content-panel users-roles-panel">
          <!-- Inner Sub-Tabs Segmented Bar -->
          <div class="users-roles-subtabs-bar" role="tablist">
            <button
              type="button"
              :class="['subtab-pill-btn', { 'is-active': subTab === 'users' }]"
              data-testid="subtab-users-directory"
              @click="subTab = 'users'"
            >
              <Users class="icon-xs" />
              <span>فهرست یکپارچه کاربران سامانه</span>
              <span class="subtab-counter">{{ fa(filteredUsers.length) }}</span>
            </button>
            <button
              type="button"
              :class="['subtab-pill-btn', { 'is-active': subTab === 'matrix' }]"
              data-testid="subtab-roles-matrix"
              @click="subTab = 'matrix'"
            >
              <ShieldCheck class="icon-xs" />
              <span>ماتریس نقش‌ها و سطوح دسترسی</span>
            </button>
          </div>

          <!-- Sub-Tab 1: فهرست یکپارچه کاربران سامانه -->
          <div v-if="subTab === 'users'" class="users-directory-subview">
            <!-- Header Action Row -->
            <div class="directory-top-row">
              <div class="directory-info">
                <h4 class="subview-title">کاربران فعال سامانه نظارت اصناف شهرستان اهواز</h4>
              </div>
              <button
                type="button"
                class="btn-add-chamber-user"
                @click="openCreateChamberUser"
                data-testid="btn-add-chamber-user"
              >
                <UserPlus class="icon-sm" />
                <span>تعریف کاربر جدید اتاق اصناف</span>
              </button>
            </div>

            <!-- Filters Bar: Search & Role Pills -->
            <div class="users-filter-bar">
              <div class="user-search-wrap">
                <Search class="search-icon" />
                <input
                  v-model="userSearchQuery"
                  type="text"
                  placeholder="جستجو با نام، کدملی، شماره تماس، سمت یا اتحادیه..."
                  class="user-search-input"
                  data-testid="input-search-system-users"
                />
              </div>

              <div class="role-pills-group">
                <button
                  type="button"
                  :class="['role-pill-btn', { 'is-active': userRoleFilter === 'all' }]"
                  @click="userRoleFilter = 'all'"
                >
                  همه ({{ fa(totalUsersCount) }})
                </button>
                <button
                  type="button"
                  :class="['role-pill-btn', { 'is-active': userRoleFilter === 'chamber' }]"
                  @click="userRoleFilter = 'chamber'"
                >
                  اتاق اصناف ({{ fa(chamberUsersCount) }})
                </button>
                <button
                  type="button"
                  :class="['role-pill-btn', { 'is-active': userRoleFilter === 'union' }]"
                  @click="userRoleFilter = 'union'"
                >
                  اتحادیه‌ها ({{ fa(unionUsersCount) }})
                </button>
                <button
                  type="button"
                  :class="['role-pill-btn', { 'is-active': userRoleFilter === 'inspector' }]"
                  @click="userRoleFilter = 'inspector'"
                >
                  بازرسان ({{ fa(inspectorsCount) }})
                </button>
              </div>
            </div>

            <!-- Users List Table / Cards -->
            <div class="users-table-container">
              <table class="users-data-table" dir="rtl">
                <thead>
                  <tr>
                    <th class="text-right">کاربر، نام کاربری و کد ملی</th>
                    <th class="text-center">نقش / سمت سازمانی</th>
                    <th class="text-center">سازمان / اتحادیه متبوع</th>
                    <th class="text-center">شماره تماس</th>
                    <th class="text-center">وضعیت</th>
                    <th class="text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="u in filteredUsers" :key="u.id" class="user-table-row">
                    <!-- نام، نام کاربری و کد ملی (راست چین) -->
                    <td class="text-right">
                      <div class="user-name-cell">
                        <div :class="['user-avatar-wrap', `tone-${u.type}`]">
                          <Building2 v-if="u.type === 'chamber'" class="icon-sm" />
                          <Store v-else-if="u.type === 'union'" class="icon-sm" />
                          <UserCheck v-else class="icon-sm" />
                        </div>
                        <div class="user-name-info">
                          <span class="user-full-name font-bold">{{ u.fullName }}</span>
                          <div class="user-meta-details">
                            <span v-if="u.username" class="user-username-badge ltr-inline font-mono">@{{ u.username }}</span>
                            <span v-if="u.username" class="user-separator">·</span>
                            <span class="user-nat-id-badge ltr-inline font-mono">کدملی: {{ u.nationalId }}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- سمت (وسط چین) -->
                    <td class="text-center">
                      <span :class="['user-type-badge', `badge-${u.type}`]">
                        {{ u.roleTitle }}
                      </span>
                    </td>

                    <!-- سازمان / اتحادیه (وسط چین) -->
                    <td class="text-center">
                      <div class="user-org-info text-center">
                        <span class="org-title">{{ u.org }}</span>
                        <span class="org-sub text-muted font-xs">{{ u.permissionsSummary }}</span>
                      </div>
                    </td>

                    <!-- شماره همراه (وسط چین) -->
                    <td class="text-center">
                      <span class="user-mobile-text font-mono ltr-inline">{{ u.mobile }}</span>
                    </td>

                    <!-- وضعیت فعال / غیرفعال (وسط چین) -->
                    <td class="text-center">
                      <button
                        type="button"
                        :class="['user-status-btn', { 'is-active': u.isActive }]"
                        @click="toggleUserStatus(u)"
                        :title="u.isActive ? 'کلیک جهت غیرفعال‌سازی' : 'کلیک جهت فعال‌سازی'"
                      >
                        <component :is="u.isActive ? Unlock : Lock" class="icon-xxs" />
                        <span>{{ u.isActive ? 'فعال' : 'غیرفعال' }}</span>
                      </button>
                    </td>

                    <!-- عملیات (وسط چین) -->
                    <td class="text-center">
                      <div class="user-actions-cell-wrap">
                        <!-- کاربر اتاق اصناف: ویرایش کامل و دسترسی‌ها -->
                        <template v-if="u.type === 'chamber' && u.rawChamberUser">
                          <button
                            type="button"
                            class="btn-edit-chamber-user"
                            @click="openEditChamberUser(u.rawChamberUser)"
                            title="ویرایش مشخصات، رمز و سطح دسترسی کاربر اتاق اصناف"
                          >
                            <UserCog class="icon-xs" />
                            <span>ویرایش</span>
                          </button>
                          <button
                            type="button"
                            class="btn-delete-table-user"
                            @click="confirmDeleteUser(u)"
                            title="حذف حساب کاربر"
                          >
                            <Trash2 class="icon-xs" />
                          </button>
                        </template>

                        <!-- کاربر اتحادیه: هدایت به صفحه مدیریت اتحادیه‌ها و دکمه حذف -->
                        <template v-else-if="u.type === 'union'">
                          <router-link
                            :to="u.unionId ? `/unions?openUnion=${u.unionId}` : '/unions'"
                            class="btn-link-union"
                            title="مشاهده و مدیریت در دایرکتوری اتحادیه‌ها"
                          >
                            <ExternalLink class="icon-xs" />
                            <span>مشاهده در صنف</span>
                          </router-link>
                          <button
                            type="button"
                            class="btn-delete-table-user"
                            @click="confirmDeleteUser(u)"
                            title="حذف حساب کاربر"
                          >
                            <Trash2 class="icon-xs" />
                          </button>
                        </template>

                        <!-- بازرس: نشان نظارت میدانی -->
                        <div v-else class="inspector-tag-info">
                          <BadgeCheck class="icon-xs text-success" />
                          <span>پایش میدانی ۳۶۰</span>
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr v-if="filteredUsers.length === 0">
                    <td colspan="6" class="empty-users-cell">
                      هیچ کاربری با فیلتر یا عبارت جستجوی واردشده یافت نشد.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Sub-Tab 2: ماتریس نقش‌ها و سطوح دسترسی -->
          <div v-if="subTab === 'matrix'" class="roles-matrix-subview">
            <RolesPermissionsMatrixCard
              :roles="chamberUsersStore.systemRoles"
              :sections="systemSections"
              @create-role="openCreateRole"
              @edit-role="openEditRole"
              @delete-role="confirmDeleteRole"
            />
          </div>
        </div>

        <!-- Tab 4: Notifications (Only for non-inspector roles) -->
        <div v-if="userRole !== 'inspector' && activeTab === 'notifications'" class="tab-content-panel">
          <div class="toggles-list">
            <div class="toggle-row-item">
              <div class="toggle-text">
                <h4 class="toggle-title">دریافت پیامک‌های وضعیت پرونده‌ها</h4>
                <p class="toggle-desc">ارسال پیامک آنی در صورت انقضای مهلت‌های قانونی اخطارها یا ارجاعات جدید.</p>
              </div>
              <q-toggle v-model="notifySms" color="primary" />
            </div>

            <div class="toggle-row-item">
              <div class="toggle-text">
                <h4 class="toggle-title">هشدار صوتی ثبت ماموریت جدید</h4>
                <p class="toggle-desc">پخش زنگ هشدار در پنل هنگام تخصیص ماموریت یا شکایت جدید.</p>
              </div>
              <q-toggle v-model="notifySound" color="primary" />
            </div>

            <div class="toggle-row-item">
              <div class="toggle-text">
                <h4 class="toggle-title">بهینه‌سازی دیتای نقشه GIS (Data Saver)</h4>
                <p class="toggle-desc">کاهش مصرف اینترنت و لود فشرده لایه‌های جغرافیایی در ماموریت‌های میدانی.</p>
              </div>
              <q-toggle v-model="offlineMapCache" color="primary" />
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Security Password Confirmation Box & Save Button (Only shown for personal settings tabs) -->
      <div v-if="activeTab !== 'permissions'" class="security-confirm-box">
        <div class="security-box-header">
          <div class="security-icon-wrap">
            <ShieldAlert class="security-icon" />
          </div>
          <div>
            <h4 class="security-title">تایید هویت امنیتی</h4>
            <p class="security-desc">
              جهت اعمال هرگونه تغییرات در حساب کاربری و تنظیمات، وارد کردن رمز عبور فعلی الزامی است:
            </p>
          </div>
        </div>

        <div class="security-action-row">
          <div class="input-wrap security-input-wrap">
            <input
              id="cur"
              v-model="currentPass"
              :type="showCurrent ? 'text' : 'password'"
              dir="rtl"
              placeholder="رمز عبور فعلی خود را بنویسید..."
              data-testid="settings-current-password-input"
              class="settings-input"
            />
            <button
              type="button"
              class="password-toggle-btn"
              aria-label="نمایش رمز فعلی"
              @click="showCurrent = !showCurrent"
            >
              <EyeOff v-if="showCurrent" class="icon-sm" />
              <Eye v-else class="icon-sm" />
            </button>
          </div>

          <button
            type="button"
            class="save-btn"
            :disabled="isSaving"
            data-testid="save-settings-btn"
            @click="saveSettings"
          >
            <Save class="icon-sm" />
            <span>{{ isSaving ? 'در حال ثبت...' : 'ذخیره تغییرات حساب' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: تعریف / ویرایش کاربر اتاق اصناف -->
    <ChamberUserManageDialog
      v-model="showChamberUserModal"
      :user="selectedChamberUserForEdit"
    />

    <!-- Modal: تعریف / ویرایش سطح دسترسی نقش -->
    <RoleManageDialog
      v-model="showRoleModal"
      :role="selectedRoleForEdit"
    />
  </div>
</template>

<style scoped lang="scss">
.settings-page-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 80rem;
  margin: 0 auto;
  width: 100%;
}

.settings-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.title-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.page-title {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--foreground);
  margin: 0;
}

/* 1. Profile Hero Card */
.profile-hero-card {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  border-radius: var(--radius-xl, 1rem);
  background-color: var(--card);
  border: 1px solid var(--border);
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;

  &.badge-inspector {
    border-inline-start: 5px solid #d97706;
    .avatar-icon {
      color: #d97706;
    }
    .hero-avatar {
      background-color: oklch(from #d97706 l c h / 12%);
    }
  }

  &.badge-union {
    border-inline-start: 5px solid #059669;
    .avatar-icon {
      color: #059669;
    }
    .hero-avatar {
      background-color: oklch(from #059669 l c h / 12%);
    }
  }

  &.badge-general {
    border-inline-start: 5px solid #2563eb;
    .avatar-icon {
      color: #2563eb;
    }
    .hero-avatar {
      background-color: oklch(from #2563eb l c h / 12%);
    }
  }

  &.badge-admin {
    border-inline-start: 5px solid #7c3aed;
    .avatar-icon {
      color: #7c3aed;
    }
    .hero-avatar {
      background-color: oklch(from #7c3aed l c h / 12%);
    }
  }
}

.hero-main-content {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.hero-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.hero-avatar {
  display: grid;
  place-items: center;
  width: 4rem;
  height: 4rem;
  border-radius: 1.1rem;
  border: 1px solid var(--border);
}

.avatar-icon {
  width: 2rem;
  height: 2rem;
}

.avatar-status-dot {
  position: absolute;
  bottom: -2px;
  inset-inline-end: -2px;
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 50%;
  background-color: #10b981;
  border: 2px solid var(--card);
}

.hero-user-meta {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-display-name {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--foreground);
  margin: 0;
}

.user-sub-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.825rem;
  color: var(--muted-foreground);
}

.user-org-text {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.inline-icon {
  width: 0.95rem;
  height: 0.95rem;
}

.meta-dot {
  color: var(--border);
}

.user-code-text strong {
  color: var(--foreground);
}

.user-status-text {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #10b981;
  font-weight: 600;
}

.live-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background-color: #10b981;
}

/* 2. Main Settings Card */
.settings-main-card {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  padding: 1.75rem;
  border-radius: var(--radius-xl, 1rem);
  background-color: var(--card);
  border: 1px solid var(--border);
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);

  @media (max-width: 640px) {
    padding: 1.25rem;
    gap: 1.25rem;
  }
}

/* Segmented Tabs Bar */
.settings-tabs-bar {
  display: flex;
  gap: 0.35rem;
  background-color: var(--muted);
  padding: 0.35rem;
  border-radius: var(--radius-lg, 0.75rem);
  overflow-x: auto;

  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
}

.tab-nav-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  background: none;
  color: var(--muted-foreground);
  padding: 0.65rem 0.9rem;
  font-size: 0.825rem;
  font-weight: 600;
  border-radius: var(--radius-md, 0.5rem);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover {
    color: var(--foreground);
  }

  &.is-active {
    background-color: var(--card);
    color: var(--primary);
    font-weight: 700;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }
}

.tab-icon {
  width: 1.05rem;
  height: 1.05rem;
}

/* Tab Pane Content */
.tab-pane-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.tab-content-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Mobile Tab */
.current-mobile-badge-box {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-lg, 0.75rem);
  background-color: oklch(from var(--primary) l c h / 6%);
  border: 1px solid oklch(from var(--primary) l c h / 18%);
}

.badge-icon-wrap {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.65rem;
  background-color: oklch(from var(--primary) l c h / 12%);
  color: var(--primary);
  flex-shrink: 0;
}

.badge-box-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.badge-box-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
}

.badge-box-label {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.badge-box-val {
  font-size: 1.05rem;
  color: var(--foreground);
}

.badge-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: 0.45rem;
  background-color: #10b981;
  color: #ffffff;
  font-size: 0.725rem;
  font-weight: 700;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--foreground);
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.input-inline-icon {
  position: absolute;
  inset-inline-end: 0.875rem;
  width: 1.125rem;
  height: 1.125rem;
  color: var(--muted-foreground);
  pointer-events: none;
}

.password-toggle-btn {
  position: absolute;
  inset-inline-end: 0.75rem;
  background: none;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem;
  border-radius: var(--radius-sm, 0.25rem);
  transition: color 0.15s ease;

  &:hover {
    color: var(--foreground);
  }
}

.settings-input {
  width: 100%;
  height: 3rem;
  border-radius: var(--radius-md, 0.5rem);
  border: 1px solid var(--border);
  background-color: var(--background);
  color: var(--foreground);
  direction: rtl;
  text-align: right;
  padding-inline-start: 1rem;
  padding-inline-end: 3rem;
  font-size: 0.9375rem;
  outline: none;
  transition: all 0.15s ease;

  &::placeholder {
    color: var(--muted-foreground);
    opacity: 0.75;
    direction: rtl;
    text-align: right;
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px oklch(from var(--primary) l c h / 15%);
  }
}

/* Password Tab */
.password-fields-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.25rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.password-guidelines-box {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-lg, 0.75rem);
  background-color: var(--muted);
  border: 1px solid var(--border);
}

.guidelines-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.825rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 0;
}

.guidelines-list {
  margin: 0;
  padding-inline-start: 1.25rem;
  font-size: 0.775rem;
  color: var(--muted-foreground);
  line-height: 1.7;
}

/* Permissions Tab */
.role-permissions-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Notifications Tab */
.toggles-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.toggle-row-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-lg, 0.75rem);
  background-color: var(--card);
  border: 1px solid var(--border);
}

.toggle-text {
  flex: 1;
}

.toggle-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 0;
}

.toggle-desc {
  font-size: 0.775rem;
  color: var(--muted-foreground);
  margin: 0.25rem 0 0;
  line-height: 1.5;
}

/* 3. Security Confirm Box */
.security-confirm-box {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-radius: var(--radius-lg, 0.75rem);
  border: 1px solid oklch(from var(--warning) l c h / 35%);
  background-color: oklch(from var(--warning) l c h / 7%);
  padding: 1.25rem;
}

.security-box-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.security-icon-wrap {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.55rem;
  background-color: oklch(from var(--warning) l c h / 15%);
  color: var(--warning);
  flex-shrink: 0;
}

.security-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.security-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 0;
}

.security-desc {
  font-size: 0.785rem;
  color: var(--muted-foreground);
  line-height: 1.5;
  margin: 0.25rem 0 0;
}

.security-action-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
  }
}

.security-input-wrap {
  flex: 1;
}

.save-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: var(--radius-md, 0.5rem);
  border: none;
  background-color: var(--primary);
  color: #ffffff;
  padding: 0 1.75rem;
  height: 3rem;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px oklch(from var(--primary) l c h / 25%);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.icon-xs {
  width: 0.75rem;
  height: 0.75rem;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.icon-md {
  width: 1.25rem;
  height: 1.25rem;
}

/* Users & Roles Panel & Subtabs */
.users-roles-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.users-roles-subtabs-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--muted);
  padding: 0.35rem;
  border-radius: var(--radius-lg, 0.75rem);
  border: 1px solid var(--border);
  flex-wrap: wrap;
}

.subtab-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: var(--radius-md, 0.5rem);
  border: none;
  background: none;
  color: var(--muted-foreground);
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: var(--foreground);
    background-color: oklch(from var(--card) l c h / 50%);
  }

  &.is-active {
    background-color: var(--card);
    color: var(--primary);
    font-weight: 700;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);

    .subtab-counter {
      background-color: oklch(from var(--primary) l c h / 12%);
      color: var(--primary);
    }
  }
}

.subtab-counter {
  font-size: 0.7rem;
  padding: 0.1rem 0.45rem;
  border-radius: 9999px;
  background-color: oklch(from var(--muted-foreground) l c h / 20%);
  color: var(--muted-foreground);
  font-weight: 700;
}

/* Directory Subview */
.users-directory-subview {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.directory-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.subview-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--foreground);
}

.btn-add-chamber-user {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.15rem;
  border-radius: var(--radius-md, 0.5rem);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;

  &:hover {
    opacity: 0.92;
    transform: translateY(-1px);
  }
}

.users-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.user-search-wrap {
  flex: 1;
  min-width: 16rem;
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

  .user-search-input {
    width: 100%;
    padding: 0.55rem 0.75rem;
    padding-inline-start: 2.25rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background-color: var(--background);
    color: var(--foreground);
    font-family: inherit;
    font-size: 0.85rem;

    &:focus {
      outline: none;
      border-color: var(--primary);
    }
  }
}

.role-pills-group {
  display: flex;
  gap: 0.35rem;
  background-color: var(--muted);
  padding: 0.25rem;
  border-radius: var(--radius-md);
  flex-wrap: wrap;
}

.role-pill-btn {
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-sm);
  border: none;
  background: none;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: var(--foreground);
  }

  &.is-active {
    background-color: var(--card);
    color: var(--primary);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }
}

.users-table-container {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 0.75rem);
  background-color: var(--card);
}

.users-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;

  thead tr {
    background-color: var(--muted);
    border-bottom: 1px solid var(--border);
  }

  th, td {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
    text-align: center;
  }

  th:first-child, td:first-child {
    text-align: right;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover {
    background-color: oklch(from var(--muted) l c h / 40%);
  }
}

.user-name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar-wrap {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  flex-shrink: 0;

  &.tone-chamber {
    background-color: oklch(from var(--primary) l c h / 12%);
    color: var(--primary);
  }
  &.tone-union {
    background-color: oklch(from #059669 l c h / 12%);
    color: #059669;
  }
  &.tone-inspector {
    background-color: oklch(from #d97706 l c h / 12%);
    color: #d97706;
  }
}

.user-name-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;

  .user-full-name {
    color: var(--foreground);
    font-size: 0.875rem;
  }
}

.user-meta-details {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  flex-wrap: wrap;

  .user-username-badge {
    color: var(--primary);
    font-weight: 700;
  }

  .user-separator {
    color: var(--border);
  }

  .user-nat-id-badge {
    color: var(--muted-foreground);
    font-weight: 600;
  }
}

.user-type-badge {
  display: inline-flex;
  padding: 0.15rem 0.55rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;

  &.badge-chamber {
    background-color: oklch(from var(--primary) l c h / 12%);
    color: var(--primary);
    border: 1px solid oklch(from var(--primary) l c h / 25%);
  }
  &.badge-union {
    background-color: oklch(from #059669 l c h / 12%);
    color: #059669;
    border: 1px solid oklch(from #059669 l c h / 25%);
  }
  &.badge-inspector {
    background-color: oklch(from #d97706 l c h / 12%);
    color: #d97706;
    border: 1px solid oklch(from #d97706 l c h / 25%);
  }
}

.user-org-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;

  .org-title {
    font-weight: 600;
    color: var(--foreground);
  }
  .org-sub {
    font-size: 0.6875rem;
    color: var(--muted-foreground);
  }
}

.user-status-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  border: 1px solid var(--border);
  background: var(--card);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &.is-active {
    background-color: #dcfce7;
    color: #166534;
    border-color: #86efac;
  }
  &:not(.is-active) {
    background-color: #fee2e2;
    color: #991b1b;
    border-color: #fca5a5;
  }
}

.user-actions-cell-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.btn-edit-chamber-user {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--primary);
  background-color: oklch(from var(--primary) l c h / 8%);
  color: var(--primary);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--primary);
    color: var(--primary-foreground);
  }
}

.btn-link-union {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted-foreground);
  font-size: 0.72rem;
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    color: var(--primary);
    border-color: var(--primary);
    background-color: var(--muted);
  }
}

.btn-delete-table-user {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--destructive);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--destructive);
    color: #ffffff;
    border-color: var(--destructive);
  }
}

.inspector-tag-info {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.empty-users-cell {
  text-align: center;
  padding: 2.5rem 1rem !important;
  color: var(--muted-foreground);
}

/* Comparative Matrix Card & Table */
.roles-matrix-subview {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import type { RoleMatrixItem, SystemSectionDef } from 'src/stores/chamberUsers';
import { fa } from 'src/utils/fa';
import {
  ShieldCheck,
  ShieldAlert,
  Building2,
  Store,
  UserCheck,
  Users,
  UserCog,
  Plus,
  Edit3,
  Trash2,
  Check,
  AlertCircle,
  Minus,
  SlidersHorizontal,
  BarChart3,
  FileCheck2,
  History,
  Lock,
} from 'lucide-vue-next';

interface Props {
  roles: RoleMatrixItem[];
  sections: SystemSectionDef[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'create-role': [];
  'edit-role': [role: RoleMatrixItem];
  'delete-role': [role: RoleMatrixItem];
}>();

// Helper to get meta information for each section
function getSectionMeta(key: string) {
  switch (key) {
    case 'dashboard':
      return {
        icon: BarChart3,
        category: 'نظارت و آمار',
        desc: 'داشبورد مدیریتی، شاخص‌های نظارتی و آمار برخط',
      };
    case 'unionsManagement':
      return {
        icon: Building2,
        category: 'دایرکتوری صنفی',
        desc: 'شناسنامه اتحادیه‌ها، رسته‌ها و مدیریت ساختار',
      };
    case 'unionUsers':
      return {
        icon: Users,
        category: 'کاربران صنوف',
        desc: 'روسا، اعضای هیئت‌مدیره و پرسنل اتحادیه‌ها',
      };
    case 'chamberUsers':
      return {
        icon: UserCog,
        category: 'کاربران ستادی',
        desc: 'پرسنل و مدیران اتاق اصناف اهواز',
      };
    case 'sealOrders':
      return {
        icon: Lock,
        category: 'ضابط قضایی',
        desc: 'صدور اخطار ماده ۲۷/۲۸ و پلمپ انتظامی اماکن',
      };
    case 'unsealDismissal':
      return {
        icon: FileCheck2,
        category: 'حقوقی و انتظامی',
        desc: 'فک پلمپ، ابطال اخطار و تسویه بدهی صنفی',
      };
    case 'auditLogs':
      return {
        icon: History,
        category: 'حراست و ممیزی',
        desc: 'لاگ فعالیت‌های امنیتی، استعلام‌ها و نشست‌ها',
      };
    default:
      return {
        icon: ShieldCheck,
        category: 'ماژول سیستم',
        desc: 'دسترسی‌ها و صلاحیت‌های اجرایی ماژول',
      };
  }
}

// Helper to style each role column header distinctly
function getRoleMeta(role: RoleMatrixItem) {
  if (role.id === 'admin') {
    return {
      icon: ShieldAlert,
      badgeText: 'سیستمی ارشد',
      theme: 'theme-admin',
      subtitle: 'اختیارات کامل مدیریتی',
    };
  }
  if (role.id === 'general') {
    return {
      icon: Building2,
      badgeText: 'سیستمی ستاد',
      theme: 'theme-chamber',
      subtitle: 'نظارت عالیه استانی',
    };
  }
  if (role.id === 'union') {
    return {
      icon: Store,
      badgeText: 'سیستمی صنف',
      theme: 'theme-union',
      subtitle: 'مدیریت کاربران صنف',
    };
  }
  if (role.id === 'inspector') {
    return {
      icon: UserCheck,
      badgeText: 'سیستمی میدان',
      theme: 'theme-inspector',
      subtitle: 'پایش میدانی ۳۶۰',
    };
  }
  return {
    icon: SlidersHorizontal,
    badgeText: 'نقش سفارشی',
    theme: 'theme-custom',
    subtitle: 'تعریف‌شده توسط کاربر',
  };
}

const configuredRolesCount = computed(() => props.roles.length);
</script>

<template>
  <div class="roles-permissions-matrix-card" data-testid="roles-permissions-matrix-card">
    <!-- Top Header Toolbar -->
    <div class="matrix-card-header">
      <div class="header-main-info">
        <div class="matrix-icon-badge">
          <ShieldCheck class="badge-icon" />
        </div>
        <div class="matrix-title-group">
          <h4 class="matrix-title">ماتریس تطبیقی سطوح دسترسی نقش‌ها</h4>
          <p class="matrix-subtitle">
            پیکربندی، ویرایش اختیارات و مقایسه تفکیکی سطوح دسترسی نقش‌های فعال در بخش‌های سامانه
          </p>
        </div>
      </div>

      <div class="header-actions">
        <button
          type="button"
          class="btn-create-role-primary"
          @click="emit('create-role')"
          data-testid="btn-add-role"
        >
          <Plus class="icon-sm" />
          <span>تعریف نقش جدید</span>
        </button>
      </div>
    </div>

    <!-- Quick Legend Bar -->
    <div class="matrix-legend-bar">
      <div class="legend-title">
        <SlidersHorizontal class="icon-xxs" />
        <span>راهنمای وضعیت سطوح دسترسی:</span>
      </div>
      <div class="legend-items">
        <span class="legend-pill is-full">
          <Check class="icon-xxs" />
          <span>دسترسی کامل</span>
        </span>
        <span class="legend-pill is-limited">
          <AlertCircle class="icon-xxs" />
          <span>دسترسی محدود یا مشروط</span>
        </span>
        <span class="legend-pill is-none">
          <Minus class="icon-xxs" />
          <span>عدم دسترسی</span>
        </span>
      </div>
    </div>

    <!-- Responsive Table Container -->
    <div class="matrix-table-container">
      <table class="roles-matrix-table" dir="rtl">
        <thead>
          <tr>
            <!-- Col 1: بخش / صلاحیت سامانه (راست‌چین) -->
            <th class="col-section-header">
              <div class="section-th-content">
                <span class="th-main-label">بخش / صلاحیت سامانه</span>
                <span class="th-sub-label">ماژول‌های عملیاتی پلتفرم</span>
              </div>
            </th>

            <!-- Role Columns (وسط‌چین) -->
            <th
              v-for="role in roles"
              :key="role.id"
              class="col-role-header"
              :data-testid="`role-col-${role.id}`"
            >
              <div class="role-header-card" :class="getRoleMeta(role).theme">
                <div class="role-header-top">
                  <div class="role-avatar-wrap">
                    <component :is="getRoleMeta(role).icon" class="role-avatar-icon" />
                  </div>
                  <span class="role-type-tag">{{ getRoleMeta(role).badgeText }}</span>
                </div>

                <div class="role-info-wrap">
                  <h5 class="role-name-text">{{ role.title }}</h5>
                  <span class="role-desc-text">{{ getRoleMeta(role).subtitle }}</span>
                </div>

                <!-- Sleek Header Actions (Edit / Delete) -->
                <div class="role-actions-strip">
                  <button
                    type="button"
                    class="role-strip-btn edit"
                    @click="emit('edit-role', role)"
                    :title="`ویرایش دسترسی‌های نقش «${role.title}»`"
                    :data-testid="`btn-edit-role-${role.id}`"
                  >
                    <Edit3 class="icon-xxs" />
                    <span>ویرایش دسترسی</span>
                  </button>

                  <button
                    v-if="!role.isSystem || role.id !== 'admin'"
                    type="button"
                    class="role-strip-btn delete"
                    @click="emit('delete-role', role)"
                    :title="`حذف نقش «${role.title}»`"
                    :data-testid="`btn-delete-role-${role.id}`"
                  >
                    <Trash2 class="icon-xxs" />
                  </button>
                </div>
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(sec, index) in sections"
            :key="sec.key"
            class="matrix-data-row"
            :class="{ 'is-even': index % 2 === 0 }"
          >
            <!-- Section Info Cell (راست‌چین) -->
            <td class="col-section-cell">
              <div class="section-cell-card">
                <div class="section-icon-box">
                  <component :is="getSectionMeta(sec.key).icon" class="section-icon" />
                </div>
                <div class="section-text-info">
                  <span class="section-main-title">{{ sec.title }}</span>
                  <div class="section-meta-row">
                    <span class="section-category-tag">{{ getSectionMeta(sec.key).category }}</span>
                    <span class="section-desc-hint">{{ getSectionMeta(sec.key).desc }}</span>
                  </div>
                </div>
              </div>
            </td>

            <!-- Role Permission Status Cells (وسط‌چین) -->
            <td
              v-for="role in roles"
              :key="`${sec.key}-${role.id}`"
              class="col-role-cell text-center"
            >
              <div class="cell-perm-wrapper">
                <!-- Full Access -->
                <span
                  v-if="role.permissions[sec.key]?.level === 'full'"
                  class="matrix-perm-badge is-full"
                  :title="role.permissions[sec.key]?.text || 'دسترسی کامل'"
                >
                  <Check class="badge-icon-status" />
                  <span>{{ role.permissions[sec.key]?.text || 'دسترسی کامل' }}</span>
                </span>

                <!-- Limited Access -->
                <span
                  v-else-if="role.permissions[sec.key]?.level === 'limited'"
                  class="matrix-perm-badge is-limited"
                  :title="role.permissions[sec.key]?.text || 'دسترسی محدود'"
                >
                  <SlidersHorizontal class="badge-icon-status" />
                  <span>{{ role.permissions[sec.key]?.text || 'دسترسی محدود' }}</span>
                </span>

                <!-- No Access -->
                <span
                  v-else
                  class="matrix-perm-badge is-none"
                  :title="role.permissions[sec.key]?.text || 'عدم دسترسی'"
                >
                  <Minus class="badge-icon-status" />
                  <span>{{ role.permissions[sec.key]?.text || 'عدم دسترسی' }}</span>
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Security & Audit Info Footer -->
    <div class="matrix-card-footer">
      <div class="footer-note-content">
        <ShieldCheck class="footer-note-icon" />
        <span class="footer-note-text">
          <strong>نکته امنیتی و انضباطی:</strong> هرگونه تغییر در سطوح دسترسی نقش‌ها بلافاصله در نشست‌های فعال اعمال شده و در سوابق ممیزی امنیتی سامانه اصناف ثبت می‌گردد.
        </span>
      </div>
      <div class="footer-stats-tag">
        <span>تعداد نقش‌های پیکربندی‌شده: {{ fa(configuredRolesCount) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.roles-permissions-matrix-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  border-radius: var(--radius-xl, 1rem);
  background-color: var(--card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card, 0 1px 3px 0 rgba(0, 0, 0, 0.05));
}

// 1. Top Header Toolbar
.matrix-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;

  .header-main-info {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .matrix-icon-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: var(--radius-lg, 0.75rem);
    background-color: oklch(from var(--primary) l c h / 12%);
    color: var(--primary);
    flex-shrink: 0;

    .badge-icon {
      width: 1.5rem;
      height: 1.5rem;
    }
  }

  .matrix-title-group {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;

    .matrix-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--foreground);
      margin: 0;
      line-height: 1.4;
    }

    .matrix-subtitle {
      font-size: 0.8125rem;
      color: var(--muted-foreground);
      margin: 0;
      line-height: 1.6;
    }
  }

  .btn-create-role-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 1.15rem;
    border-radius: var(--radius-md, 0.5rem);
    background-color: var(--primary);
    color: var(--primary-foreground);
    font-size: 0.85rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 6px oklch(from var(--primary) l c h / 25%);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background-color: oklch(from var(--primary) l c h / 90%);
      transform: translateY(-1px);
      box-shadow: 0 4px 10px oklch(from var(--primary) l c h / 35%);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

// 2. Legend Bar
.matrix-legend-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  border-radius: var(--radius-md, 0.5rem);
  background-color: oklch(from var(--muted) l c h / 50%);
  border: 1px solid var(--border);

  .legend-title {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.775rem;
    font-weight: 600;
    color: var(--muted-foreground);
  }

  .legend-items {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-wrap: wrap;
  }

  .legend-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.65rem;
    border-radius: 9999px;
    font-size: 0.72rem;
    font-weight: 600;

    &.is-full {
      background-color: var(--success-bg);
      color: var(--success-foreground);
      border: 1px solid oklch(from var(--success) l c h / 30%);
    }

    &.is-limited {
      background-color: var(--warning-bg);
      color: var(--warning-foreground);
      border: 1px solid oklch(from var(--warning) l c h / 30%);
    }

    &.is-none {
      background-color: oklch(from var(--muted) l c h / 70%);
      color: var(--muted-foreground);
      border: 1px solid var(--border);
    }
  }
}

// 3. Table Container & Table
.matrix-table-container {
  overflow-x: auto;
  border-radius: var(--radius-lg, 0.75rem);
  border: 1px solid var(--border);
  background-color: var(--card);
}

.roles-matrix-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.8125rem;

  thead tr {
    background-color: oklch(from var(--muted) l c h / 65%);
  }

  th {
    padding: 1rem 0.85rem;
    border-bottom: 2px solid var(--border);
    vertical-align: top;
  }

  td {
    padding: 0.85rem 0.85rem;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }

  // First Column: Sections (Right-aligned in RTL)
  .col-section-header {
    text-align: start;
    min-width: 290px;
    width: 310px;
    border-inline-end: 1px solid var(--border);

    .section-th-content {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;

      .th-main-label {
        font-size: 0.875rem;
        font-weight: 700;
        color: var(--foreground);
      }

      .th-sub-label {
        font-size: 0.72rem;
        color: var(--muted-foreground);
      }
    }
  }

  .col-section-cell {
    text-align: start;
    border-inline-end: 1px solid var(--border);
  }

  // Role Columns (Centered)
  .col-role-header {
    text-align: center;
    min-width: 175px;
    border-inline-end: 1px solid var(--border);

    &:last-child {
      border-inline-end: none;
    }
  }

  .col-role-cell {
    text-align: center;
    border-inline-end: 1px solid var(--border);

    &:last-child {
      border-inline-end: none;
    }
  }
}

// Role Header Card inside TH
.role-header-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 0.75rem;
  border-radius: var(--radius-md, 0.5rem);
  background-color: var(--card);
  border: 1px solid var(--border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  // Thematic Top Border Accents
  &.theme-admin {
    border-top: 3px solid #8b5cf6;
    .role-avatar-wrap {
      background-color: oklch(0.6 0.2 290 / 12%);
      color: #7c3aed;
    }
  }

  &.theme-chamber {
    border-top: 3px solid var(--primary);
    .role-avatar-wrap {
      background-color: oklch(from var(--primary) l c h / 12%);
      color: var(--primary);
    }
  }

  &.theme-union {
    border-top: 3px solid #10b981;
    .role-avatar-wrap {
      background-color: oklch(0.6 0.18 150 / 12%);
      color: #059669;
    }
  }

  &.theme-inspector {
    border-top: 3px solid #f59e0b;
    .role-avatar-wrap {
      background-color: oklch(0.65 0.18 75 / 12%);
      color: #d97706;
    }
  }

  &.theme-custom {
    border-top: 3px solid #06b6d4;
    .role-avatar-wrap {
      background-color: oklch(0.65 0.15 210 / 12%);
      color: #0891b2;
    }
  }

  .role-header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .role-avatar-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: var(--radius-sm, 0.375rem);

    .role-avatar-icon {
      width: 1.15rem;
      height: 1.15rem;
    }
  }

  .role-type-tag {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.1rem 0.45rem;
    border-radius: 9999px;
    background-color: oklch(from var(--muted) l c h / 80%);
    color: var(--muted-foreground);
    border: 1px solid var(--border);
  }

  .role-info-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    text-align: center;

    .role-name-text {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--foreground);
      margin: 0;
      white-space: nowrap;
    }

    .role-desc-text {
      font-size: 0.72rem;
      color: var(--muted-foreground);
      margin: 0;
      white-space: nowrap;
    }
  }

  .role-actions-strip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    width: 100%;
    margin-block-start: 0.35rem;
    padding-block-start: 0.45rem;
    border-top: 1px dashed var(--border);
  }

  .role-strip-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);

    &.edit {
      gap: 0.3rem;
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-sm, 0.375rem);
      background-color: oklch(from var(--primary) l c h / 10%);
      border-color: oklch(from var(--primary) l c h / 30%);
      color: var(--primary);
      font-size: 0.72rem;
      font-weight: 600;

      &:hover {
        background-color: var(--primary);
        color: var(--primary-foreground);
        transform: translateY(-1px);
      }
    }

    &.delete {
      width: 1.65rem;
      height: 1.65rem;
      border-radius: var(--radius-sm, 0.375rem);
      background-color: transparent;
      border-color: oklch(from var(--destructive) l c h / 30%);
      color: var(--destructive);

      &:hover {
        background-color: var(--destructive);
        color: #ffffff;
        transform: translateY(-1px);
      }
    }
  }
}

// Section Cell Layout
.section-cell-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  .section-icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.35rem;
    height: 2.35rem;
    border-radius: var(--radius-md, 0.5rem);
    background-color: oklch(from var(--muted) l c h / 80%);
    border: 1px solid var(--border);
    color: var(--primary);
    flex-shrink: 0;

    .section-icon {
      width: 1.15rem;
      height: 1.15rem;
    }
  }

  .section-text-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;

    .section-main-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--foreground);
    }

    .section-meta-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;

      .section-category-tag {
        font-size: 0.68rem;
        font-weight: 600;
        padding: 0.05rem 0.4rem;
        border-radius: var(--radius-sm, 0.375rem);
        background-color: oklch(from var(--primary) l c h / 10%);
        color: var(--primary);
      }

      .section-desc-hint {
        font-size: 0.72rem;
        color: var(--muted-foreground);
      }
    }
  }
}

// Data Row Styling
.matrix-data-row {
  transition: background-color 0.15s ease;

  &.is-even {
    background-color: oklch(from var(--muted) l c h / 20%);
  }

  &:hover {
    background-color: oklch(from var(--primary) l c h / 5%);
  }

  &:last-child td {
    border-bottom: none;
  }
}

// Permission Badges
.cell-perm-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.matrix-perm-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: transform 0.15s ease;
  white-space: nowrap;

  .badge-icon-status {
    width: 0.85rem;
    height: 0.85rem;
    flex-shrink: 0;
  }

  &.is-full {
    background-color: var(--success-bg);
    color: var(--success-foreground);
    border: 1px solid oklch(from var(--success) l c h / 25%);
  }

  &.is-limited {
    background-color: var(--warning-bg);
    color: var(--warning-foreground);
    border: 1px solid oklch(from var(--warning) l c h / 25%);
  }

  &.is-none {
    background-color: oklch(from var(--muted) l c h / 65%);
    color: var(--muted-foreground);
    border: 1px solid var(--border);
  }

  &:hover {
    transform: scale(1.02);
  }
}

// 4. Security & Audit Info Footer
.matrix-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.85rem;
  padding: 0.85rem 1.15rem;
  border-radius: var(--radius-md, 0.5rem);
  background-color: oklch(from var(--muted) l c h / 35%);
  border: 1px solid var(--border);

  .footer-note-content {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 0.775rem;
    color: var(--foreground);
    line-height: 1.6;

    .footer-note-icon {
      width: 1.15rem;
      height: 1.15rem;
      color: var(--primary);
      flex-shrink: 0;
    }

    strong {
      color: var(--primary);
      font-weight: 700;
    }
  }

  .footer-stats-tag {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--muted-foreground);
    padding: 0.2rem 0.65rem;
    border-radius: 9999px;
    background-color: var(--card);
    border: 1px solid var(--border);
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .roles-permissions-matrix-card {
    padding: 1rem;
  }

  .matrix-card-header {
    flex-direction: column;
    align-items: flex-start;

    .btn-create-role-primary {
      width: 100%;
      justify-content: center;
    }
  }

  .matrix-legend-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .matrix-card-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>


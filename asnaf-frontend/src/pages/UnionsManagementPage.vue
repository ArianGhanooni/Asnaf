<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useUnionsStore } from 'src/stores/unions';
import { useSessionStore } from 'src/stores/session';
import type { UnionRegistryItem, UnionUserAccount, UnionCategory } from 'src/types/asnaf';
import { useQuasar } from 'quasar';
import { fa } from 'src/utils/fa';
import PageHeader from 'src/components/gov/PageHeader.vue';
import PanelCard from 'src/components/gov/PanelCard.vue';
import StatCard from 'src/components/gov/StatCard.vue';
import UnionUserManageDialog from 'src/components/unions/UnionUserManageDialog.vue';
import EditUnionInfoDialog from 'src/components/unions/EditUnionInfoDialog.vue';
import DeleteUnionConfirmDialog from 'src/components/unions/DeleteUnionConfirmDialog.vue';
import {
  Building2,
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  User,
  UserCheck,
  Lock,
  Unlock,
  Edit,
  Trash2,
  X,
} from 'lucide-vue-next';

const $q = useQuasar();
const unionsStore = useUnionsStore();
const sessionStore = useSessionStore();

// Search & Category Filters
const categoryFilter = ref<'all' | UnionCategory>('all');
const query = ref('');

// Pagination
const currentPage = ref(1);
const itemsPerPage = ref(9);

// Modals
const showUserModal = ref(false);
const selectedUserForEdit = ref<UnionUserAccount | null>(null);
const selectedUnionForNewUser = ref<number | undefined>(undefined);

const selectedUnionDetailId = ref<number | null>(null);
const selectedUnionDetail = computed(() => {
  if (selectedUnionDetailId.value === null) return null;
  return unionsStore.getUnionById(selectedUnionDetailId.value) || null;
});
const showDetailModal = ref(false);

const showEditUnionModal = ref(false);
const selectedUnionForEditId = ref<number | null>(null);
const selectedUnionForEdit = computed(() => {
  if (selectedUnionForEditId.value === null) return null;
  return unionsStore.getUnionById(selectedUnionForEditId.value) || null;
});

function openEditUnion(union: UnionRegistryItem): void {
  selectedUnionForEditId.value = union.id;
  showEditUnionModal.value = true;
}

function openCreateUnion(): void {
  selectedUnionForEditId.value = null;
  showEditUnionModal.value = true;
}

const showDeleteConfirmModal = ref(false);
const selectedUnionForDeleteId = ref<number | null>(null);
const selectedUnionForDelete = computed(() => {
  if (selectedUnionForDeleteId.value === null) return null;
  return unionsStore.getUnionById(selectedUnionForDeleteId.value) || null;
});

function openDeleteUnionConfirm(union: UnionRegistryItem): void {
  selectedUnionForDeleteId.value = union.id;
  showDeleteConfirmModal.value = true;
}

const filteredList = computed(() => {
  const q = query.value.trim().toLowerCase();
  return unionsStore.unions.filter((u) => {
    if (categoryFilter.value !== 'all' && u.category !== categoryFilter.value) {
      return false;
    }
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.code.toLowerCase().includes(q) ||
      u.presidentName.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      u.address.toLowerCase().includes(q)
    );
  });
});

const totalPages = computed(() => Math.ceil(filteredList.value.length / itemsPerPage.value) || 1);

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredList.value.slice(start, start + itemsPerPage.value);
});

watch([query, categoryFilter], () => {
  currentPage.value = 1;
});

function openCreateUser(unionId?: number): void {
  selectedUserForEdit.value = null;
  selectedUnionForNewUser.value = unionId;
  showUserModal.value = true;
}

function openEditUser(user: UnionUserAccount): void {
  selectedUserForEdit.value = user;
  selectedUnionForNewUser.value = user.unionId;
  showUserModal.value = true;
}

function confirmDeleteUnionUser(user: UnionUserAccount): void {
  $q.dialog({
    title: 'حذف حساب کاربر اتحادیه',
    message: `آیا از حذف حساب کاربری «${user.fullName}» از اتحادیه اطمینان دارید؟`,
    ok: { label: 'حذف کاربر', color: 'negative' },
    cancel: { label: 'انصراف', flat: true },
    persistent: true,
  }).onOk(() => {
    unionsStore.deleteUnionUser(user.id);
    $q.notify({ type: 'positive', message: `حساب کاربری «${user.fullName}» با موفقیت حذف گردید.` });
  });
}

function openUnionUsers(union: UnionRegistryItem): void {
  selectedUnionDetailId.value = union.id;
  showDetailModal.value = true;
}
</script>

<template>
  <div class="unions-management-page" data-testid="unions-management-page">
    <PageHeader
      title="مدیریت اتحادیه‌ها و اصناف اهواز"
    >
      <button
        class="action-btn-primary"
        @click="openCreateUnion()"
        data-testid="btn-create-union-header"
      >
        <Plus class="icon-sm" />
        <span>تعریف اتحادیه جدید</span>
      </button>
    </PageHeader>

    <!-- KPI Summary Cards -->
    <div class="kpi-grid">
      <StatCard
        label="کل اتحادیه‌های اهواز"
        :value="unionsStore.totalUnions"
        :icon="Building2"
      />
      <StatCard
        label="اتحادیه‌های توزیعی - خدماتی"
        :value="unionsStore.distributiveCount"
        :icon="Building2"
        tone="primary"
      />
      <StatCard
        label="اتحادیه‌های تولیدی - خدماتی"
        :value="unionsStore.productiveCount"
        :icon="Building2"
        tone="accent"
      />
      <StatCard
        label="کاربران فعال اتحادیه‌ها"
        :value="unionsStore.totalUsers"
        :icon="Users"
        tone="success"
      />
    </div>

    <!-- Main Content: دایرکتوری و کارت‌های اتحادیه‌ها -->
    <div class="tab-content">
      <!-- Filter Bar -->
      <PanelCard class="filter-panel-card">
        <div class="filter-bar">
          <div class="search-input-wrap">
            <Search class="search-icon" />
            <input
              v-model="query"
              type="text"
              placeholder="جستجو با نام اتحادیه، کد صنف، رئیس یا آدرس..."
              class="filter-input"
              data-testid="unions-search-input"
            />
          </div>

          <div class="category-pill-group">
            <button
              type="button"
              :class="['pill-btn', { 'is-pill-active': categoryFilter === 'all' }]"
              @click="categoryFilter = 'all'"
            >
              همه ({{ fa(unionsStore.totalUnions) }})
            </button>
            <button
              type="button"
              :class="['pill-btn', { 'is-pill-active': categoryFilter === 'distributive' }]"
              @click="categoryFilter = 'distributive'"
            >
              توزیعی - خدماتی
            </button>
            <button
              type="button"
              :class="['pill-btn', { 'is-pill-active': categoryFilter === 'productive' }]"
              @click="categoryFilter = 'productive'"
            >
              تولیدی - خدماتی
            </button>
          </div>
        </div>
      </PanelCard>

      <!-- View: CARDS (نمای اختصاصی کارتی اتحادیه‌ها) -->
      <div class="unions-card-grid">
        <div
          v-for="u in paginatedList"
          :key="u.id"
          class="union-card"
          data-testid="union-registry-card"
        >
          <div class="card-top">
            <span :class="['cat-badge', `cat-${u.category}`]">
              {{ u.categoryLabel }}
            </span>
          </div>

          <h4 class="union-title" :title="u.name">{{ u.name }}</h4>

          <div class="card-meta">
            <div class="meta-row">
              <User class="meta-icon" />
              <span class="meta-lbl">رئیس اتحادیه:</span>
              <span class="meta-val font-bold">{{ u.presidentName }}</span>
            </div>

            <div class="meta-row">
              <Phone class="meta-icon" />
              <span class="meta-lbl">شماره تماس:</span>
              <span class="meta-val ltr-text">{{ u.phone }}</span>
            </div>

            <div class="meta-row address-row">
              <MapPin class="meta-icon" />
              <span class="meta-lbl">نشانی:</span>
              <span class="meta-val address-val" :title="u.address">{{ u.address }}</span>
            </div>
          </div>

          <div class="card-stats-strip">
            <div class="stat-col">
              <span class="stat-num">{{ fa(u.activeMembersCount) }}</span>
              <span class="stat-lbl">اعضای فعال</span>
            </div>
            <div class="stat-col">
              <span class="stat-num text-warning">{{ fa(u.activeWarningsCount) }}</span>
              <span class="stat-lbl">اخطار جاری</span>
            </div>
            <div class="stat-col">
              <span class="stat-num text-destructive">{{ fa(u.sealedCount) }}</span>
              <span class="stat-lbl">پلمپ شده</span>
            </div>
            <div
              class="stat-col is-clickable"
              @click="openUnionUsers(u)"
              title="مشاهده کاربران این اتحادیه"
            >
              <span class="stat-num text-primary">{{ fa(u.usersCount) }}</span>
              <span class="stat-lbl">کاربر سامانه</span>
            </div>
          </div>

          <div class="card-actions">
            <button
              type="button"
              class="btn-detail"
              @click="openUnionUsers(u)"
              data-testid="btn-view-union-detail"
              title="مشاهده و مدیریت کاربران این اتحادیه"
            >
              <Users class="icon-xxs" />
              <span>مشاهده و مدیریت ({{ fa(u.usersCount) }})</span>
            </button>
            <button
              type="button"
              class="btn-edit-union"
              @click="openEditUnion(u)"
              title="ویرایش اطلاعات اتحادیه"
              data-testid="btn-edit-union-info"
            >
              <Edit class="icon-xxs" />
              <span>ویرایش اطلاعات</span>
            </button>
            <button
              type="button"
              class="btn-delete-union"
              @click="openDeleteUnionConfirm(u)"
              title="حذف اتحادیه"
              data-testid="btn-delete-union"
            >
              <Trash2 class="icon-xxs" />
              <span>حذف</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredList.length === 0" class="empty-unions-state">
        <p>هیچ اتحادیه‌ای منطبق با جستجو و فیلتر انتخاب‌شده یافت نشد.</p>
      </div>

      <!-- Pagination Controls -->
      <div v-if="totalPages > 1" class="unions-pagination-wrap" dir="rtl">
        <div class="pagination-info">
          نمایش {{ fa((currentPage - 1) * itemsPerPage + 1) }} تا {{ fa(Math.min(currentPage * itemsPerPage, filteredList.length)) }} از {{ fa(filteredList.length) }} اتحادیه
        </div>
        <q-pagination
          v-model="currentPage"
          :max="totalPages"
          :max-pages="6"
          direction-links
          boundary-links
          color="primary"
          active-color="primary"
          gutter="4px"
          class="custom-q-pagination"
        />
      </div>
    </div>

    <!-- Modal: مدیریت / ایجاد کاربر اتحادیه -->
    <UnionUserManageDialog
      v-model="showUserModal"
      :user="selectedUserForEdit"
      :default-union-id="selectedUnionForNewUser"
    />

    <!-- Modal: ویرایش یا ایجاد اطلاعات اتحادیه -->
    <EditUnionInfoDialog
      v-model="showEditUnionModal"
      :union="selectedUnionForEdit"
    />

    <!-- Modal: تایید دو مرحله‌ای حذف اتحادیه -->
    <DeleteUnionConfirmDialog
      v-model="showDeleteConfirmModal"
      :union="selectedUnionForDelete"
    />

    <!-- Modal: مدیریت کاربران و پروفایل اختصاصی اتحادیه -->
    <q-dialog v-model="showDetailModal">
      <q-card v-if="selectedUnionDetail" class="union-detail-dialog" dir="rtl">
        <q-card-section class="detail-header">
          <div class="header-right-side">
            <div class="detail-icon-wrap">
              <Building2 class="icon-md" />
            </div>
            <div>
              <span :class="['cat-badge', `cat-${selectedUnionDetail.category}`]">
                {{ selectedUnionDetail.categoryLabel }}
              </span>
              <h3 class="detail-title">مدیریت کاربران و دسترسی‌های اتحادیه</h3>
            </div>
          </div>
          <button type="button" class="btn-close-header" @click="showDetailModal = false" aria-label="بستن">
            <X class="icon-sm" />
          </button>
        </q-card-section>

        <q-separator />

        <q-card-section class="detail-body">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="lbl">رئیس اتحادیه:</span>
              <span class="val font-bold">{{ selectedUnionDetail.presidentName }}</span>
            </div>
            <div class="detail-item">
              <span class="lbl">شماره تماس دفتر:</span>
              <span class="val ltr-text font-bold">{{ selectedUnionDetail.phone }}</span>
            </div>
            <div class="detail-item full">
              <span class="lbl">نشانی دفتر مرکزی:</span>
              <span class="val">{{ selectedUnionDetail.address }}</span>
            </div>
          </div>

          <div class="union-users-list-section">
            <div class="section-head">
              <h4 class="section-title">کاربران دارای دسترسی در این اتحادیه:</h4>
              <button
                type="button"
                class="btn-mini-add"
                @click="openCreateUser(selectedUnionDetail.id)"
              >
                <Plus class="icon-xxs" />
                <span>تعریف کاربر جدید</span>
              </button>
            </div>

            <div class="users-list">
              <div
                v-for="usr in unionsStore.getUsersForUnion(selectedUnionDetail.id)"
                :key="usr.id"
                class="user-row"
              >
                <div class="user-row-header">
                  <div class="user-info">
                    <UserCheck class="icon-xs text-primary" />
                    <strong>{{ usr.fullName }}</strong>
                    <span class="user-role-badge">({{ usr.roleTitle }})</span>
                    <span v-if="usr.username" class="user-uname ltr-text font-sm font-mono text-primary font-bold">@{{ usr.username }}</span>
                    <span class="user-tel ltr-text font-sm">{{ usr.mobile }}</span>
                    <span class="user-nat ltr-text font-sm">کدملی: {{ usr.nationalId }}</span>
                  </div>
                  <div class="user-row-actions">
                    <button
                      type="button"
                      :class="['status-toggle-mini', { 'is-active': usr.isActive }]"
                      @click="unionsStore.toggleUnionUserStatus(usr.id)"
                      :title="usr.isActive ? 'غیرفعال‌سازی کاربر' : 'فعال‌سازی کاربر'"
                    >
                      <component :is="usr.isActive ? Unlock : Lock" class="icon-xxs" />
                      <span>{{ usr.isActive ? 'فعال' : 'غیرفعال' }}</span>
                    </button>
                    <button
                      type="button"
                      class="btn-edit-mini"
                      @click="openEditUser(usr)"
                    >
                      <Edit class="icon-xxs" />
                      <span>ویرایش</span>
                    </button>
                    <button
                      type="button"
                      class="btn-delete-mini"
                      @click="confirmDeleteUnionUser(usr)"
                      title="حذف حساب کاربر"
                    >
                      <Trash2 class="icon-xxs" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>

                <div class="user-perms-row">
                  <span class="perms-label">دسترسی‌ها:</span>
                  <div class="perms-chips">
                    <span v-if="usr.permissions.canEditOperator" class="perm-chip green">
                      ویرایش ۵ فیلد
                    </span>
                    <span v-if="usr.permissions.canDraftDismissal" class="perm-chip blue">
                      صدور منع پیگیری
                    </span>
                    <span v-if="usr.permissions.canDraftSealRequest" class="perm-chip red">
                      تقاضای پلمپ
                    </span>
                    <span v-if="usr.permissions.canViewReports" class="perm-chip yellow">
                      گزارشات صنف
                    </span>
                  </div>
                </div>
              </div>

              <div
                v-if="unionsStore.getUsersForUnion(selectedUnionDetail.id).length === 0"
                class="empty-users"
              >
                هنوز کاربری برای این اتحادیه ثبت نشده است. با دکمه «تعریف کاربر جدید» می‌توانید حساب ایجاد فرمایید.
              </div>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
          <button
            type="button"
            class="btn-close-detail"
            @click="showDetailModal = false"
          >
            بستن
          </button>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped lang="scss">
.unions-management-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  :deep(.page-title) {
    white-space: nowrap !important;

    @media (max-width: 768px) {
      font-size: 1.25rem !important;
    }

    @media (max-width: 480px) {
      font-size: clamp(0.9rem, 4.4vw, 1.1rem) !important;
    }

    @media (max-width: 360px) {
      font-size: 0.85rem !important;
    }
  }
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.submodules-tabs-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  background-color: var(--muted);
  padding: 0.375rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.submodule-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-radius: var(--radius-md);
  border: none;
  background: none;
  color: var(--muted-foreground);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: var(--foreground);
    background-color: oklch(from var(--card) l c h / 50%);
  }

  &.is-active {
    background-color: var(--card);
    color: var(--foreground);
    font-weight: 700;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);

    .tab-icon {
      color: var(--primary);
    }
    .tab-counter {
      background-color: oklch(from var(--primary) l c h / 12%);
      color: var(--primary);
    }
  }
}

.tab-icon {
  width: 1.125rem;
  height: 1.125rem;
}

.tab-counter {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  background-color: oklch(from var(--muted-foreground) l c h / 20%);
  color: var(--muted-foreground);
  font-weight: 600;
}

.action-btn-primary {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: var(--radius-md);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.9;
  }
}

.filter-panel-card {
  margin-bottom: 1.25rem;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-input-wrap {
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

.category-pill-group {
  display: flex;
  gap: 0.35rem;
  background-color: var(--muted);
  padding: 0.25rem;
  border-radius: var(--radius-md);
}

.pill-btn {
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

  &.is-pill-active {
    background-color: var(--card);
    color: var(--primary);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }
}

.view-mode-toggle {
  display: flex;
  gap: 0.25rem;
  margin-inline-start: auto;
}

.view-btn {
  display: grid;
  place-items: center;
  padding: 0.45rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted-foreground);
  cursor: pointer;

  &.is-active {
    background-color: var(--primary);
    color: var(--primary-foreground);
    border-color: var(--primary);
  }
}

.unions-card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.union-card {
  display: flex;
  flex-direction: column;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.1rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  }
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}

.cat-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;

  &.cat-distributive {
    background-color: oklch(from var(--primary) l c h / 12%);
    color: var(--primary);
    border: 1px solid oklch(from var(--primary) l c h / 25%);
  }
  &.cat-productive {
    background-color: oklch(from var(--accent) l c h / 18%);
    color: var(--accent-foreground);
    border: 1px solid oklch(from var(--accent) l c h / 30%);
  }
}

.code-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  font-family: monospace;
  color: var(--muted-foreground);
  background-color: var(--muted);
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm);
}

.union-title {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--foreground);
  line-height: 1.35;
  height: 2.7rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
  background-color: var(--muted);
  padding: 0.65rem 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;

  &.address-row {
    align-items: flex-start;

    .meta-icon {
      margin-top: 0.2rem;
    }
  }

  .meta-icon {
    width: 0.85rem;
    height: 0.85rem;
    color: var(--muted-foreground);
    flex-shrink: 0;
  }
  .meta-lbl {
    color: var(--muted-foreground);
    flex-shrink: 0;
  }
  .meta-val {
    color: var(--foreground);

    &.address-val {
      line-height: 1.45;
      word-break: break-word;
      white-space: normal;
    }
  }
}

.card-stats-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.25rem;
  padding: 0.5rem 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.85rem;
  text-align: center;
}

.stat-col {
  display: flex;
  flex-direction: column;
  align-items: center;

  &.is-clickable {
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background-color 0.15s ease;

    &:hover {
      background-color: oklch(from var(--primary) l c h / 12%);
    }
  }

  .stat-num {
    font-size: 0.875rem;
    font-weight: 800;
    color: var(--foreground);
  }
  .stat-lbl {
    font-size: 0.625rem;
    color: var(--muted-foreground);
    margin-top: 0.1rem;
  }
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: auto;
}

.btn-detail,
.btn-edit-union,
.btn-delete-union {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.45rem 0.3rem;
  border-radius: var(--radius-md);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  box-sizing: border-box;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.btn-detail {
  flex: 1.15 1 0;
  min-width: 0;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--foreground);

  &:hover {
    background-color: var(--muted);
    border-color: var(--primary);
    color: var(--primary);
  }
}

.btn-edit-union {
  flex: 1 1 0;
  min-width: 0;
  border: 1px solid oklch(from var(--primary) l c h / 20%);
  background-color: oklch(from var(--primary) l c h / 10%);
  color: var(--primary);

  &:hover {
    background-color: oklch(from var(--primary) l c h / 18%);
  }
}

.btn-delete-union {
  flex: 0.85 1 0;
  min-width: 0;
  border: 1px solid oklch(from var(--destructive) l c h / 25%);
  background-color: oklch(from var(--destructive) l c h / 8%);
  color: var(--destructive);

  &:hover {
    background-color: oklch(from var(--destructive) l c h / 16%);
  }
}

/* Pagination & Empty State */
.unions-pagination-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1rem;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  margin-top: 1rem;

  @media (min-width: 640px) {
    flex-direction: row;
  }

  .pagination-info {
    font-size: 0.825rem;
    font-weight: 600;
    color: var(--muted-foreground);
  }
}

:deep(.custom-q-pagination) {
  .q-btn {
    border-radius: var(--radius-md);
    font-weight: 700;
    font-size: 0.825rem;
  }
}

.empty-unions-state {
  padding: 3rem 1rem;
  text-align: center;
  background-color: var(--card);
  border: 1px dashed var(--border);
  border-radius: var(--radius-lg);
  color: var(--muted-foreground);
  font-size: 0.875rem;
  margin-top: 1rem;
}

.ltr-text {
  direction: ltr;
  text-align: left;
}

.role-pill {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  background-color: var(--muted);
  border-radius: var(--radius-sm);
}

.perms-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.perm-chip {
  font-size: 0.625rem;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-weight: 600;

  &.green { background: #dcfce7; color: #166534; }
  &.blue { background: #dbeafe; color: #1e40af; }
  &.red { background: #fee2e2; color: #991b1b; }
  &.yellow { background: #fef3c7; color: #92400e; }
}

.union-detail-dialog {
  width: 100%;
  max-width: 42rem;
  max-height: 90vh;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-xl);
  background-color: var(--card);
  color: var(--card-foreground);
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.detail-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.15rem 1.25rem;
  background-color: var(--muted);

  .header-right-side {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .btn-close-header {
    display: grid;
    place-items: center;
    background: none;
    border: none;
    padding: 0.35rem;
    border-radius: 0.375rem;
    color: var(--muted-foreground);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: oklch(from var(--foreground) l c h / 10%);
      color: var(--foreground);
    }
  }

  .detail-icon-wrap {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: var(--radius-lg);
    background-color: oklch(from var(--primary) l c h / 12%);
    color: var(--primary);
  }

  .detail-title {
    margin: 0.2rem 0 0;
    font-size: 1.05rem;
    font-weight: 800;
  }
  .detail-sub {
    margin: 0.1rem 0 0;
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }
}

.detail-body {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  background-color: var(--muted);
  padding: 0.875rem;
  border-radius: var(--radius-md);

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;

    &.full { grid-column: 1 / -1; }

    .lbl {
      font-size: 0.6875rem;
      color: var(--muted-foreground);
    }
    .val {
      font-size: 0.8125rem;
      color: var(--foreground);
    }
  }
}

.union-users-list-section {
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;

    .section-title {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--primary);
    }
  }

  .btn-mini-add {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.65rem;
    border-radius: var(--radius-sm);
    border: none;
    background-color: var(--primary);
    color: var(--primary-foreground);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.user-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);

  .user-row-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      flex-wrap: wrap;

      .user-role-badge {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--primary);
        background-color: oklch(from var(--primary) l c h / 10%);
        padding: 0.1rem 0.4rem;
        border-radius: var(--radius-sm);
      }
    }

    .user-row-actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;

      .status-toggle-mini {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.2rem 0.5rem;
        border-radius: 9999px;
        border: 1px solid var(--border);
        background: var(--card);
        font-size: 0.6875rem;
        font-weight: 600;
        cursor: pointer;

        &.is-active {
          background-color: #dcfce7;
          color: #166534;
          border-color: #86efac;
        }
      }

      .btn-edit-mini {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.2rem 0.55rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        background: var(--card);
        color: var(--muted-foreground);
        font-size: 0.6875rem;
        cursor: pointer;

        &:hover {
          color: var(--primary);
          border-color: var(--primary);
        }
      }

      .btn-delete-mini {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.2rem 0.55rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        background: var(--card);
        color: var(--destructive);
        font-size: 0.6875rem;
        cursor: pointer;

        &:hover {
          background-color: var(--destructive);
          color: #ffffff;
          border-color: var(--destructive);
        }
      }
    }
  }

  .user-perms-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.4rem;
    border-top: 1px dashed var(--border);

    .perms-label {
      font-size: 0.6875rem;
      color: var(--muted-foreground);
      flex-shrink: 0;
    }
  }
}

.empty-users {
  padding: 1.25rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--muted-foreground);
  background-color: var(--muted);
  border-radius: var(--radius-sm);
}

.btn-close-detail {
  padding: 0.45rem 1.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--foreground);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.icon-xs { width: 0.95rem; height: 0.95rem; }
.icon-xxs { width: 0.8rem; height: 0.8rem; }
.icon-sm { width: 1rem; height: 1rem; }
.icon-md { width: 1.5rem; height: 1.5rem; }
.m-0 { margin: 0; }
.font-sm { font-size: 0.6875rem; }
.text-warning { color: #f59e0b; }
.text-destructive { color: #ef4444; }
.text-primary { color: #2563eb; }
</style>

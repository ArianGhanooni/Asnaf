<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import type { Unit } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import EditOperatorModal from 'src/components/inspections/EditOperatorModal.vue';
import UnionDismissalLetterDialog from 'src/components/inspections/UnionDismissalLetterDialog.vue';
import {
  Search,
  Calendar,
  Edit3,
  FileText,
  MapPin,
  Phone,
  User,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

const isUnion = computed(() => sessionStore.session?.role === 'union');
const isStaff = computed(() => {
  const role = sessionStore.session?.role;
  return role === 'general' || role === 'union' || role === 'admin';
});

const searchQuery = ref('');
const selectedUnitId = ref<number | null>(null);

// همگام‌سازی انتخاب واحد با Query روتر
watch(
  () => route.query.unit,
  (val) => {
    selectedUnitId.value = val ? Number(val) : null;
  },
  { immediate: true }
);

// واحدهای دارای وضعیت فک پلمپ
const unsealedUnits = computed<Unit[]>(() => {
  const userOrg = sessionStore.session?.org || '';

  return unitsStore.units
    .filter((u) => u.status === 'unsealed')
    .filter((u) => {
      // فیلتر دسترسی سازمانی برای اتحادیه‌ها
      if (!isUnion.value || !userOrg) return true;
      return u.union.includes(userOrg) || userOrg.includes(u.union) || u.union.includes('نانوایان');
    });
});

const filteredUnits = computed<Unit[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return unsealedUnits.value;
  return unsealedUnits.value.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.operator.toLowerCase().includes(q) ||
      u.union.toLowerCase().includes(q) ||
      u.address.toLowerCase().includes(q) ||
      u.nationalId.includes(q)
  );
});

function handleSelectUnit(u: Unit): void {
  selectedUnitId.value = u.id;
  void router.replace({ query: { ...route.query, unit: String(u.id) } });
  const el = document.getElementById(`unsealed-card-${u.id}`) || document.getElementById(`unsealed-row-${u.id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function formatInspectionReason(v: string | undefined): string {
  if (!v) return 'ماده ۲۷ قانون نظام صنفی';
  if (
    v.includes('۲۸') ||
    v.includes('28') ||
    v.includes('گران') ||
    v.includes('نرخ') ||
    v.includes('شکایت') ||
    v.includes('کم‌فروشی')
  ) {
    return 'ماده ۲۸ قانون نظام صنفی';
  }
  return 'ماده ۲۷ قانون نظام صنفی';
}

// Dialog 1: ویرایش متصدی
const showEditModal = ref(false);
const activeUnitForEdit = ref<Unit | null>(null);

function openEdit(u: Unit): void {
  activeUnitForEdit.value = u;
  showEditModal.value = true;
}

// Dialog 2: پیش‌نویس نامه فک پلمپ
const showDraftModal = ref(false);
const activeUnitForDraft = ref<Unit | null>(null);

function handleOpenDraft(u: Unit): void {
  activeUnitForDraft.value = u;
  showDraftModal.value = true;
}
</script>

<template>
  <div class="stage-page-container">
    <!-- Header with Stage Title -->
    <div class="stage-header-row">
      <div class="stage-title-wrap">
        <h1 class="stage-title">فک پلمپ واحدهای صنفی</h1>
      </div>
    </div>

    <!-- Search Input (بالای جدول و کارت‌ها) -->
    <div class="search-input-wrap">
      <Search class="search-icon" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="جستجوی واحد، متصدی، صنف یا آدرس..."
        class="stage-search-input"
        data-testid="unsealed-search-input"
      />
    </div>

    <!-- 1. Mobile Cards Grid (نمای کارت در ابعاد موبایل) -->
    <div :class="['units-cards-grid', { 'desktop-hidden': isStaff }]">
      <div
        v-for="u in filteredUnits"
        :id="`unsealed-card-${u.id}`"
        :key="u.id"
        :class="['unit-card', { 'is-selected': u.id === selectedUnitId }]"
        @click="handleSelectUnit(u)"
      >
        <div class="unit-card-header">
          <div class="unit-title-group">
            <h3 class="unit-name">{{ u.name }}</h3>
            <span class="unit-union">{{ u.union }}</span>
          </div>
        </div>

        <div class="unit-info-body">
          <div class="info-row">
            <User class="icon-xs text-muted" />
            <span>متصدی: <strong>{{ u.operator }}</strong> (کدملی: {{ fa(u.nationalId) }})</span>
          </div>
          <div class="info-row">
            <Calendar class="icon-xs text-muted" />
            <span>تاریخ تولد متصدی: {{ u.birthDate ? fa(u.birthDate) : '—' }}</span>
          </div>
          <div class="info-row">
            <Phone class="icon-xs text-muted" />
            <span>شماره همراه: {{ fa(u.mobile) }}</span>
          </div>
          <div class="info-row">
            <MapPin class="icon-xs text-muted" />
            <span>{{ u.region }} · {{ u.address }}</span>
          </div>
          <div class="violation-box">
            <span class="violation-label">علت بازرسی:</span>
            <span class="violation-text">{{ formatInspectionReason(u.violation) }}</span>
          </div>
          <div class="notes-box">
            <span class="notes-label">توضیحات: </span>
            <span class="notes-text">{{ u.notes || '' }}</span>
          </div>
        </div>

        <!-- Action Buttons (ویرایش متصدی + پیش‌نویس نامه فک پلمپ) -->
        <div class="unit-actions">
          <button
            type="button"
            class="action-btn-secondary"
            @click.stop="openEdit(u)"
            data-testid="edit-operator-btn"
          >
            <Edit3 class="icon-xs" />
            <span>ویرایش</span>
          </button>

          <button
            type="button"
            class="action-btn-primary"
            @click.stop="handleOpenDraft(u)"
            data-testid="draft-unseal-btn"
          >
            <FileText class="icon-xs" />
            <span>پیش‌نویس فک پلمپ</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 2. Desktop Table View for Monitor Screen -->
    <div v-if="isStaff" class="desktop-table-container">
      <div class="table-card shadow-card">
        <div class="table-scroll-wrap">
          <table class="warnings-data-table" dir="rtl">
            <thead>
              <tr>
                <th class="th-unit">نام واحد صنفی و اتحادیه</th>
                <th class="th-operator">متصدی و کدملی</th>
                <th class="th-birth">تاریخ تولد</th>
                <th class="th-phone">شماره همراه</th>
                <th class="th-address">نشانی و منطقه</th>
                <th class="th-violation">علت بازرسی</th>
                <th class="th-actions">عملیات</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="u in filteredUnits" :key="u.id">
                <!-- سطر اصلی رکورد واحد صنفی -->
                <tr
                  :id="`unsealed-row-${u.id}`"
                  :class="['table-row', { 'is-selected': u.id === selectedUnitId }]"
                  @click="handleSelectUnit(u)"
                >
                  <!-- نام واحد صنفی و اتحادیه (راست‌چین) -->
                  <td class="td-unit">
                    <div class="unit-cell-wrap">
                      <span class="unit-name-text">{{ u.name }}</span>
                      <span class="unit-union-chip">{{ u.union }}</span>
                    </div>
                  </td>

                  <!-- متصدی و کدملی (وسط‌چین) -->
                  <td class="td-operator">
                    <div class="op-cell-wrap">
                      <span class="op-name-text">{{ u.operator }}</span>
                      <span class="op-id-text">کدملی: {{ fa(u.nationalId) }}</span>
                    </div>
                  </td>

                  <!-- تاریخ تولد متصدی (وسط‌چین) -->
                  <td class="td-birth">
                    <span class="birth-date-text">{{ u.birthDate ? fa(u.birthDate) : '—' }}</span>
                  </td>

                  <!-- شماره تلفن همراه (وسط‌چین) -->
                  <td class="td-phone">
                    <a :href="`tel:${u.mobile}`" class="phone-link-text">{{ fa(u.mobile) }}</a>
                  </td>

                  <!-- نشانی و منطقه (وسط‌چین) -->
                  <td class="td-address">
                    <div class="address-cell-wrap">
                      <span class="region-text">{{ u.region }}</span>
                      <span class="addr-text">{{ u.address }}</span>
                    </div>
                  </td>

                  <!-- علت بازرسی (وسط‌چین) -->
                  <td class="td-violation">
                    <span
                      :class="[
                        'violation-pill',
                        formatInspectionReason(u.violation).includes('۲۸') ? 'is-art28' : 'is-art27',
                      ]"
                    >
                      {{ formatInspectionReason(u.violation) }}
                    </span>
                  </td>

                  <!-- عملیات متناسب با نقش: ویرایش متصدی + پیش‌نویس نامه فک پلمپ -->
                  <td class="td-actions" @click.stop>
                    <div class="table-actions-group">
                      <!-- ۱. ویرایش متصدی -->
                      <button
                        type="button"
                        class="tbl-btn tbl-btn-edit"
                        @click="openEdit(u)"
                        data-testid="tbl-edit-operator-btn"
                        aria-label="ویرایش متصدی"
                      >
                        <Edit3 class="icon-xs" />
                        <q-tooltip class="action-tooltip" anchor="top middle" self="bottom middle" :offset="[0, 6]">
                          ویرایش متصدی
                        </q-tooltip>
                      </button>

                      <!-- ۲. پیش‌نویس نامه فک پلمپ -->
                      <button
                        type="button"
                        class="tbl-btn tbl-btn-draft"
                        @click="handleOpenDraft(u)"
                        data-testid="tbl-draft-unseal-btn"
                        aria-label="پیش‌نویس نامه فک پلمپ"
                      >
                        <FileText class="icon-xs" />
                        <q-tooltip class="action-tooltip" anchor="top middle" self="bottom middle" :offset="[0, 6]">
                          پیش‌نویس نامه فک پلمپ
                        </q-tooltip>
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- سطر فیلد توضیحات در زیر رکورد مربوطه -->
                <tr
                  :class="['table-notes-row', { 'is-selected': u.id === selectedUnitId }]"
                  @click="handleSelectUnit(u)"
                >
                  <td colspan="7" class="td-notes-sub">
                    <div class="notes-sub-inner">
                      <span class="notes-sub-label">توضیحات:</span>
                      <span class="notes-sub-content">{{ u.notes || 'توضیحی برای این پرونده ثبت نشده است.' }}</span>
                    </div>
                  </td>
                </tr>
              </template>

              <tr v-if="filteredUnits.length === 0">
                <td colspan="7" class="empty-table-state">
                  هیچ پرونده فک پلمپی مطابق جستجو یافت نشد.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal 1: ویرایش متصدی -->
    <EditOperatorModal
      v-model="showEditModal"
      :unit="activeUnitForEdit"
    />

    <!-- Modal 2: پیش‌نویس رسمی نامه فک پلمپ -->
    <UnionDismissalLetterDialog
      v-model="showDraftModal"
      :unit="activeUnitForDraft"
      request-type="unseal"
      @submitted="showDraftModal = false"
    />
  </div>
</template>

<style scoped lang="scss">
.stage-page-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 80rem;
  margin: 0 auto;
  width: 100%;
}

.stage-header-row {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.stage-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stage-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--foreground);
  margin: 0;
}

/* Search Bar */
.search-input-wrap {
  position: relative;
  width: 100%;

  .search-icon {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.15rem;
    height: 1.15rem;
    color: var(--muted-foreground);
    pointer-events: none;
  }

  .stage-search-input {
    width: 100%;
    height: 3rem;
    padding-right: 2.85rem;
    padding-left: 1rem;
    border-radius: var(--radius-xl);
    border: 1px solid var(--border);
    background-color: var(--card);
    color: var(--foreground);
    font-size: 0.875rem;
    outline: none;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

    &:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px oklch(from var(--primary) l c h / 15%);
    }

    &::placeholder {
      color: var(--muted-foreground);
    }
  }
}

/* 1. Mobile Cards Grid */
.units-cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  &.desktop-hidden {
    @media (min-width: 1024px) {
      display: none !important;
    }
  }
}

.unit-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--primary);
    box-shadow: 0 4px 12px oklch(from var(--primary) l c h / 8%);
  }

  &.is-selected {
    border-color: var(--primary);
    background-color: oklch(from var(--primary) l c h / 4%);
    box-shadow: 0 0 0 2px var(--primary);
  }
}

.unit-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.unit-title-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.unit-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 0;
  line-height: 1.4;
}

.unit-union {
  font-size: 0.75rem;
  color: var(--primary);
  font-weight: 600;
}

.unit-info-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--foreground);

  .info-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    line-height: 1.4;
  }

  .violation-box {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.65rem;
    background-color: oklch(from var(--muted) l c h / 50%);
    border-radius: var(--radius-sm);
    font-size: 0.775rem;
    margin-top: 0.25rem;

    .violation-label {
      color: var(--muted-foreground);
      font-weight: 600;
    }

    .violation-text {
      color: var(--foreground);
      font-weight: 700;
    }
  }

  .notes-box {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    padding: 0.4rem 0.65rem;
    background-color: oklch(from var(--primary) l c h / 4%);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    line-height: 1.4;

    .notes-label {
      color: var(--primary);
      font-weight: 700;
      white-space: nowrap;
    }

    .notes-text {
      color: var(--foreground);
    }
  }
}

.unit-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);

  button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.45rem 0.65rem;
    border-radius: var(--radius-md);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }

  .action-btn-secondary {
    background: var(--muted);
    color: var(--foreground);
    border-color: var(--border);

    &:hover {
      background: oklch(from var(--foreground) l c h / 8%);
    }
  }

  .action-btn-primary {
    background: var(--primary);
    color: #ffffff;

    &:hover {
      filter: brightness(1.1);
    }
  }
}

/* 2. Desktop Table View for Monitor Screen */
.desktop-table-container {
  display: none;
  width: 100%;

  @media (min-width: 1024px) {
    display: block;
  }
}

.table-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.table-scroll-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.warnings-data-table {
  width: 100%;
  min-width: 960px;
  border-collapse: collapse;
  font-size: 0.8125rem;

  thead {
    background-color: var(--muted);
    border-bottom: 1px solid var(--border);

    th {
      padding: 0.85rem 0.85rem;
      font-weight: 700;
      color: var(--muted-foreground);
      font-size: 0.775rem;
      white-space: nowrap;
      text-align: center;

      &.th-unit {
        text-align: right;
      }
    }
  }

  tbody {
    tr.table-row {
      border-top: 1px solid var(--border);
      transition: background-color 0.15s ease;
      cursor: pointer;

      td {
        padding: 0.75rem 0.85rem;
        vertical-align: middle;
        white-space: nowrap;
        text-align: center;

        &.td-unit {
          text-align: right;
        }
      }
    }

    tr.table-notes-row {
      border-bottom: 1px solid var(--border);
      background-color: oklch(from var(--muted) l c h / 18%);
      transition: background-color 0.15s ease;
      cursor: pointer;

      td.td-notes-sub {
        padding: 0.35rem 0.85rem 0.6rem;
        text-align: right;
        vertical-align: middle;
      }
    }

    tr.table-row,
    tr.table-notes-row {
      &.is-selected {
        background-color: oklch(from var(--primary) l c h / 8%);

        .unit-name-text {
          color: var(--primary);
        }
      }
    }

    tr.table-row:hover,
    tr.table-row:hover + tr.table-notes-row,
    tr.table-notes-row:hover,
    tr.table-row:has(+ tr.table-notes-row:hover) {
      background-color: oklch(from var(--primary) l c h / 4%);
    }
  }
}

.unit-cell-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: right;
  gap: 0.2rem;
  white-space: nowrap;

  .unit-name-text {
    font-weight: 700;
    color: var(--foreground);
    font-size: 0.875rem;
    white-space: nowrap;
  }

  .unit-union-chip {
    font-size: 0.6875rem;
    color: var(--primary);
    font-weight: 600;
    white-space: nowrap;
  }
}

.op-cell-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.15rem;
  white-space: nowrap;

  .op-name-text {
    font-weight: 700;
    color: var(--foreground);
    white-space: nowrap;
  }

  .op-id-text {
    font-size: 0.6875rem;
    color: var(--muted-foreground);
    white-space: nowrap;
  }
}

.birth-date-text {
  font-size: 0.75rem;
  color: var(--foreground);
  white-space: nowrap;
  text-align: center;
}

.phone-link-text {
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--foreground);
  text-decoration: none;
  direction: ltr;
  display: inline-block;
  white-space: nowrap;
  text-align: center;

  &:hover {
    color: var(--primary);
    text-decoration: underline;
  }
}

.address-cell-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.15rem;
  white-space: nowrap;

  .region-text {
    font-weight: 600;
    color: var(--foreground);
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .addr-text {
    font-size: 0.6875rem;
    color: var(--muted-foreground);
    white-space: nowrap;
  }
}

.violation-pill {
  display: inline-block;
  padding: 0.25rem 0.55rem;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 700;
  white-space: nowrap;
  text-align: center;

  &.is-art27 {
    background-color: oklch(from #ea580c l c h / 12%);
    color: #c2410c;
    border: 1px solid oklch(from #ea580c l c h / 25%);
  }

  &.is-art28 {
    background-color: oklch(from #2563eb l c h / 12%);
    color: #1d4ed8;
    border: 1px solid oklch(from #2563eb l c h / 25%);
  }
}

.notes-sub-inner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.775rem;
  text-align: right;

  .notes-sub-label {
    font-weight: 700;
    color: var(--foreground);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .notes-sub-content {
    color: var(--muted-foreground);
    font-weight: 500;
    line-height: 1.4;
  }
}

.table-actions-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.tbl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.05rem;
  height: 2.05rem;
  padding: 0;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;

  .icon-xs {
    width: 1rem;
    height: 1rem;
  }

  &.tbl-btn-edit {
    background: oklch(from var(--primary) l c h / 10%);
    color: var(--primary);
    border-color: oklch(from var(--primary) l c h / 25%);

    &:hover {
      background: oklch(from var(--primary) l c h / 18%);
    }
  }

  &.tbl-btn-draft {
    background: oklch(from #2563eb l c h / 12%);
    color: #2563eb;
    border-color: oklch(from #2563eb l c h / 25%);

    &:hover {
      background: #2563eb;
      color: #ffffff;
    }
  }
}

.empty-table-state {
  text-align: center;
  padding: 3rem 1rem !important;
  color: var(--muted-foreground);
  font-weight: 600;
}
</style>


<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import type { Unit } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import AhvazInspectionHeatmap from 'src/components/inspections/AhvazInspectionHeatmap.vue';
import EditOperatorModal from 'src/components/inspections/EditOperatorModal.vue';
import {
  Search,
  Calendar,
  AlertOctagon,
  Edit3,
  Lock,
  Building2,
  MapPin,
  Phone,
  User,
  ShieldAlert,
  X,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

const isStaff = computed(() => {
  const role = sessionStore.session?.role;
  return role === 'general' || role === 'union' || role === 'admin';
});

const searchQuery = ref('');
const selectedUnitId = ref<number | null>(null);

// همگام‌سازی انتخاب واحد با Query روتر طبق استانداردهای rule.md
watch(
  () => route.query.unit,
  (val) => {
    selectedUnitId.value = val ? Number(val) : null;
  },
  { immediate: true }
);

// Modal states
const showEditModal = ref(false);
const activeUnitForEdit = ref<Unit | null>(null);

// واحدهای در مرحله اقدام به پلمپ (دستور پلمپ صادره از اتاق اصناف)
const sealUnits = computed<Unit[]>(() => {
  const isUnion = sessionStore.session?.role === 'union';
  const userOrg = sessionStore.session?.org || '';
  return unitsStore.units
    .filter(
      (u) =>
        u.status === 'seal_ordered' ||
        u.status === 'readySeal' ||
        u.status === 'seal_requested'
    )
    .filter((u) => {
      if (!isUnion || !userOrg) return true;
      return u.union.includes(userOrg) || userOrg.includes(u.union) || u.union.includes('نانوایان');
    });
});

const filteredUnits = computed<Unit[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return sealUnits.value;
  return sealUnits.value.filter(
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
  // اسکرول نرم به کارت یا سطر واحد
  const el = document.getElementById(`seal-card-${u.id}`) || document.getElementById(`seal-row-${u.id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function openEdit(u: Unit): void {
  activeUnitForEdit.value = u;
  showEditModal.value = true;
}

function formatInspectionReason(v: string | undefined): string {
  if (!v) return 'ماده ۲۷ قانون نظام صنفی';
  if (v.includes('۲۷') || v.includes('27') || v.includes('فاقد پروانه')) {
    return 'ماده ۲۷ قانون نظام صنفی';
  }
  if (v.includes('عدم همکاری') || v.includes('ممانعت')) {
    return 'عدم همکاری متصدی';
  }
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
  return v;
}

// Dialog 1: ثبت عدم همکاری متصدی
const showNonCooperationModal = ref(false);
const targetUnitForNonCooperation = ref<Unit | null>(null);
const nonCooperationReason = ref('ممانعت متصدی از ارائه مدارک صنفی و عدم همکاری با بازرس میدانی');

function handleNonCooperation(u: Unit): void {
  targetUnitForNonCooperation.value = u;
  nonCooperationReason.value = 'ممانعت متصدی از ارائه مدارک صنفی و عدم همکاری با بازرس میدانی';
  showNonCooperationModal.value = true;
}

function confirmNonCooperation(): void {
  if (!targetUnitForNonCooperation.value) return;
  const u = targetUnitForNonCooperation.value;
  const inspectorName = sessionStore.session?.name || 'بازرس اتاق اصناف';
  const notesText = nonCooperationReason.value.trim();
  const updatedNotes = notesText
    ? (u.notes ? `${u.notes} | عدم همکاری: ${notesText}` : `عدم همکاری: ${notesText}`)
    : u.notes;
  unitsStore.updateUnit(u.id, {
    notes: updatedNotes,
    risk: {
      ...u.risk,
      nonCooperation: true,
    },
  });
  unitsStore.addAudit(inspectorName, 'ثبت عدم همکاری متصدی در مرحله پلمپ', `واحد: ${u.name} (شناسه: ${u.id})`);
  $q.notify({
    type: 'warning',
    message: `عدم همکاری متصدی واحد «${u.name}» با موفقیت در سیستم ثبت گردید.`,
    position: 'top',
  });
  showNonCooperationModal.value = false;
}

// Dialog 2: پنل باز شونده پلمپ واحد صنفی
const showSealModal = ref(false);
const targetUnitForSeal = ref<Unit | null>(null);
const sealReportDesc = ref('');

function handleOpenSealModal(u: Unit): void {
  targetUnitForSeal.value = u;
  sealReportDesc.value = 'اجرای حکم پلمپ فیزیکی با حضور نماینده اداره نظارت بر اماکن عمومی و نصب پلاک پلمپ';
  showSealModal.value = true;
}

function confirmSeal(): void {
  if (!targetUnitForSeal.value) return;
  const u = targetUnitForSeal.value;
  const inspectorName = sessionStore.session?.name || 'بازرس اتاق اصناف';
  const reportNo = `REP-AMK-${Date.now().toString().slice(-4)}`;
  const desc = sealReportDesc.value.trim();

  unitsStore.executeFieldSeal(u.id, reportNo, inspectorName);
  if (desc) {
    const updatedNotes = u.notes ? `${u.notes} | گزارش پلمپ: ${desc}` : `گزارش پلمپ: ${desc}`;
    unitsStore.updateUnit(u.id, { notes: updatedNotes });
  }

  $q.notify({
    type: 'positive',
    message: `حکم پلمپ واحد صنفی «${u.name}» با موفقیت اجرا و در سامانه ثبت گردید.`,
    position: 'top',
    timeout: 3500,
  });
  showSealModal.value = false;
}
</script>

<template>
  <div class="stage-page-container">
    <!-- Header -->
    <div class="stage-header-row">
      <div class="stage-title-wrap">
        <h1 class="stage-title">اقدام به پلمپ واحدهای صنفی</h1>
      </div>
    </div>

    <!-- Ahvaz Interactive Heatmap -->
    <AhvazInspectionHeatmap
      :units="filteredUnits"
      :selected-unit-id="selectedUnitId"
      stage="seal_ordered"
      stage-title="موقعیت واحدهای اقدام به پلمپ اهواز"
      height="400px"
      @select-unit="handleSelectUnit"
    />

    <!-- Search Input (زیر نقشه و بالای کارت‌ها و جدول واحدهای صنفی) -->
    <div class="search-input-wrap">
      <Search class="search-icon" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="جستجوی واحد، متصدی، صنف یا آدرس..."
        class="stage-search-input"
        data-testid="seal-search-input"
      />
    </div>

    <!-- 1. Mobile Cards Grid (Default for mobile screen sizes, and for inspectors) -->
    <div :class="['units-cards-grid', { 'desktop-hidden': isStaff }]">
      <div
        v-for="u in filteredUnits"
        :id="`seal-card-${u.id}`"
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

        <!-- Action Buttons (۴ عملیات: نمایش روی نقشه، ویرایش متصدی، ثبت عدم همکاری، پلمپ) -->
        <div class="unit-actions">
          <button
            type="button"
            class="action-btn-secondary"
            @click.stop="handleSelectUnit(u)"
            data-testid="show-on-map-btn"
          >
            <MapPin class="icon-xs" />
            <span>نمایش روی نقشه</span>
          </button>

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
            class="action-btn-warning"
            @click.stop="handleNonCooperation(u)"
            data-testid="non-cooperation-btn"
          >
            <AlertOctagon class="icon-xs" />
            <span>عدم همکاری</span>
          </button>

          <button
            type="button"
            class="action-btn-danger"
            @click.stop="handleOpenSealModal(u)"
            data-testid="execute-seal-btn"
          >
            <Lock class="icon-xs" />
            <span>پلمپ</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 2. Desktop Table View for Monitor Screen (For Chamber of Commerce & Union roles) -->
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
                  :id="`seal-row-${u.id}`"
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

                  <!-- متصدی و کدملی (وسط‌چین - هر مورد در یک خط) -->
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

                  <!-- شماره همراه (وسط‌چین) -->
                  <td class="td-phone">
                    <a :href="`tel:${u.mobile}`" class="phone-link-text" dir="ltr" @click.stop>{{ fa(u.mobile) }}</a>
                  </td>

                  <!-- نشانی و منطقه (وسط‌چین - هر مورد در یک خط) -->
                  <td class="td-address">
                    <div class="address-cell-wrap" :title="u.address">
                      <span class="region-text">{{ u.region }}</span>
                      <span class="addr-text">{{ u.address }}</span>
                    </div>
                  </td>

                  <!-- علت بازرسی (وسط‌چین) -->
                  <td class="td-violation">
                    <span
                      :class="[
                        'violation-pill',
                        formatInspectionReason(u.violation).includes('۲۷')
                          ? 'is-art27'
                          : formatInspectionReason(u.violation).includes('همکاری')
                            ? 'is-noncoop'
                            : 'is-art28',
                      ]"
                    >
                      {{ formatInspectionReason(u.violation) }}
                    </span>
                  </td>

                  <!-- عملیات متناسب با نقش (۴ عملیات آیکونی: نقشه، ویرایش، عدم همکاری، پلمپ با تولتیپ) -->
                  <td class="td-actions" @click.stop>
                    <div class="table-actions-group">
                      <button
                        type="button"
                        class="tbl-btn tbl-btn-map"
                        @click="handleSelectUnit(u)"
                        data-testid="tbl-show-map-btn"
                        aria-label="نمایش روی نقشه"
                      >
                        <MapPin class="icon-xs" />
                        <q-tooltip class="action-tooltip" anchor="top middle" self="bottom middle" :offset="[0, 6]">
                          نمایش روی نقشه
                        </q-tooltip>
                      </button>

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

                      <button
                        type="button"
                        class="tbl-btn tbl-btn-warning"
                        @click="handleNonCooperation(u)"
                        data-testid="tbl-non-cooperation-btn"
                        aria-label="ثبت عدم همکاری"
                      >
                        <AlertOctagon class="icon-xs" />
                        <q-tooltip class="action-tooltip" anchor="top middle" self="bottom middle" :offset="[0, 6]">
                          ثبت عدم همکاری
                        </q-tooltip>
                      </button>

                      <button
                        type="button"
                        class="tbl-btn tbl-btn-seal"
                        @click="handleOpenSealModal(u)"
                        data-testid="tbl-seal-btn"
                        aria-label="پلمپ واحد صنفی"
                      >
                        <Lock class="icon-xs" />
                        <q-tooltip class="action-tooltip" anchor="top middle" self="bottom middle" :offset="[0, 6]">
                          پلمپ واحد صنفی
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
                  هیچ پرونده اقدام به پلمپی مطابق جستجو یافت نشد.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Edit Operator Modal -->
    <EditOperatorModal
      v-model="showEditModal"
      :unit="activeUnitForEdit"
    />

    <!-- ۱. پنل ثبت عدم همکاری متصدی -->
    <q-dialog
      v-model="showNonCooperationModal"
      persistent
      transition-show="scale"
      transition-hide="scale"
    >
      <q-card class="custom-action-dialog-card" dir="rtl" data-testid="non-cooperation-dialog">
        <q-card-section class="custom-dialog-header">
          <div class="header-left-group">
            <div class="dialog-icon-wrap is-warning">
              <AlertOctagon class="dialog-header-icon" />
            </div>
            <h3 class="dialog-header-title">ثبت عدم همکاری متصدی</h3>
          </div>
          <button
            type="button"
            class="dialog-close-btn"
            @click="showNonCooperationModal = false"
            aria-label="بستن"
          >
            <X class="icon-sm" />
          </button>
        </q-card-section>

        <q-separator />

        <q-card-section class="custom-dialog-body">
          <p class="dialog-message-text">
            آیا از ثبت عدم همکاری متصدی واحد صنفی «<strong>{{ targetUnitForNonCooperation?.name }}</strong>» با بازرس میدانی اطمینان دارید؟ این مورد در سوابق پرونده ثبت شده و پیگیری را در اولویت فوری قرار می‌دهد.
          </p>

          <div class="dialog-field-group">
            <label class="dialog-field-label" for="non-cooperation-input">شرح عدم همکاری متصدی:</label>
            <input
              id="non-cooperation-input"
              v-model="nonCooperationReason"
              type="text"
              class="custom-modal-input"
              placeholder="شرح ممانعت یا عدم همکاری متصدی..."
              data-testid="input-non-cooperation-reason"
            />
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions class="custom-dialog-footer">
          <button
            type="button"
            class="btn-dialog-cancel"
            @click="showNonCooperationModal = false"
          >
            انصراف
          </button>
          <button
            type="button"
            class="btn-dialog-action is-warning"
            @click="confirmNonCooperation"
            data-testid="btn-confirm-non-cooperation"
          >
            <AlertOctagon class="icon-xs" />
            <span>تایید و ثبت عدم همکاری</span>
          </button>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ۲. پنل بازطراحی شده: اجرای حکم پلمپ واحد صنفی -->
    <q-dialog
      v-model="showSealModal"
      persistent
      transition-show="scale"
      transition-hide="scale"
    >
      <q-card class="custom-action-dialog-card" dir="rtl" data-testid="seal-action-dialog">
        <q-card-section class="custom-dialog-header">
          <div class="header-left-group">
            <div class="dialog-icon-wrap is-destructive">
              <Lock class="dialog-header-icon" />
            </div>
            <h3 class="dialog-header-title">اجرای حکم پلمپ واحد صنفی</h3>
          </div>
          <button
            type="button"
            class="dialog-close-btn"
            @click="showSealModal = false"
            aria-label="بستن"
          >
            <X class="icon-sm" />
          </button>
        </q-card-section>

        <q-separator />

        <q-card-section class="custom-dialog-body">
          <p class="dialog-message-text">
            آیا از اجرای حکم پلمپ و تعطیلی واحد صنفی «<strong>{{ targetUnitForSeal?.name }}</strong>» با هماهنگی اداره نظارت بر اماکن عمومی اطمینان دارید؟ این اقدام منجر به توقف فعالیت واحد صنفی و ثبت صورتمجلس در پرونده خواهد شد.
          </p>

          <div class="dialog-field-group">
            <label class="dialog-field-label" for="seal-report-desc-input">شرح گزارش پلمپ و مستندات میدانی:</label>
            <textarea
              id="seal-report-desc-input"
              v-model="sealReportDesc"
              rows="3"
              class="custom-modal-textarea"
              placeholder="شرح گزارش پلمپ، مشاهدات بازرس و جزئیات اجرای حکم..."
              data-testid="input-seal-report-desc"
            ></textarea>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions class="custom-dialog-footer">
          <button
            type="button"
            class="btn-dialog-cancel"
            @click="showSealModal = false"
          >
            انصراف
          </button>
          <button
            type="button"
            class="btn-dialog-action is-destructive"
            @click="confirmSeal"
            data-testid="btn-confirm-seal"
          >
            <Lock class="icon-xs" />
            <span>تایید و اجرای پلمپ</span>
          </button>
        </q-card-actions>
      </q-card>
    </q-dialog>
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
  align-items: center;
  justify-content: space-between;
}

.stage-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stage-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--foreground);
  margin: 0;
}

/* Search Bar (زیر نقشه و بالای واحدها) */
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
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);

  button {
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

  .action-btn-warning {
    background: oklch(from #d97706 l c h / 12%);
    color: #b45309;
    border-color: oklch(from #d97706 l c h / 25%);

    &:hover {
      background: oklch(from #d97706 l c h / 20%);
    }
  }

  .action-btn-danger {
    background: oklch(from #dc2626 l c h / 12%);
    color: #dc2626;
    border-color: oklch(from #dc2626 l c h / 25%);

    &:hover {
      background: #dc2626;
      color: #ffffff;
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

  &.is-noncoop {
    background-color: oklch(from #e11d48 l c h / 12%);
    color: #be123c;
    border: 1px solid oklch(from #e11d48 l c h / 25%);
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

  &.tbl-btn-map {
    background: var(--muted);
    color: var(--foreground);
    border-color: var(--border);

    &:hover {
      background: oklch(from var(--foreground) l c h / 8%);
    }
  }

  &.tbl-btn-edit {
    background: oklch(from var(--primary) l c h / 10%);
    color: var(--primary);
    border-color: oklch(from var(--primary) l c h / 25%);

    &:hover {
      background: oklch(from var(--primary) l c h / 18%);
    }
  }

  &.tbl-btn-warning {
    background: oklch(from #d97706 l c h / 12%);
    color: #b45309;
    border-color: oklch(from #d97706 l c h / 25%);

    &:hover {
      background: oklch(from #d97706 l c h / 20%);
    }
  }

  &.tbl-btn-seal {
    background: oklch(from #dc2626 l c h / 12%);
    color: #dc2626;
    border-color: oklch(from #dc2626 l c h / 25%);

    &:hover {
      background: #dc2626;
      color: #ffffff;
    }
  }
}

:deep(.action-tooltip) {
  background-color: var(--foreground) !important;
  color: var(--background) !important;
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  padding: 0.35rem 0.65rem !important;
  border-radius: var(--radius-sm) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18) !important;
  font-family: inherit !important;
}

.empty-table-state {
  padding: 3rem 1rem;
  text-align: center;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

/* Modals & Dialogs */
.custom-action-dialog-card {
  width: 100%;
  max-width: 32rem;
  border-radius: var(--radius-xl);
  background-color: var(--card);
  color: var(--foreground);
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.custom-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.15rem 1.35rem;
  background-color: var(--card);

  .header-left-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;

    .dialog-icon-wrap {
      width: 2.4rem;
      height: 2.4rem;
      border-radius: 0.65rem;
      display: grid;
      place-items: center;

      &.is-warning {
        background-color: oklch(from #d97706 l c h / 12%);
        color: #d97706;
      }
      &.is-destructive {
        background-color: oklch(from #dc2626 l c h / 12%);
        color: #dc2626;
      }
      &.is-primary {
        background-color: oklch(from #2563eb l c h / 12%);
        color: #2563eb;
      }

      .dialog-header-icon {
        width: 1.35rem;
        height: 1.35rem;
      }
    }

    .dialog-header-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--foreground);
    }
  }

  .dialog-close-btn {
    display: grid;
    place-items: center;
    background: none;
    border: none;
    padding: 0.35rem;
    border-radius: 0.4rem;
    color: var(--muted-foreground);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: oklch(from var(--foreground) l c h / 10%);
      color: var(--foreground);
    }
  }
}

.custom-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.35rem;

  .dialog-message-text {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--foreground);
  }

  .dialog-field-group {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;

    .dialog-field-label {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--foreground);
    }

    .custom-modal-input {
      width: 100%;
      height: 2.65rem;
      padding: 0 0.85rem;
      border-radius: 0.65rem;
      border: 1px solid var(--border);
      background-color: var(--background);
      color: var(--foreground);
      font-size: 0.875rem;
      outline: none;
      transition: all 0.2s ease;

      &:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px oklch(from var(--primary) l c h / 15%);
      }
    }

    .custom-modal-textarea {
      width: 100%;
      padding: 0.65rem 0.85rem;
      border-radius: 0.65rem;
      border: 1px solid var(--border);
      background-color: var(--background);
      color: var(--foreground);
      font-size: 0.875rem;
      font-family: inherit;
      outline: none;
      resize: vertical;
      min-height: 4.5rem;
      transition: all 0.2s ease;

      &:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px oklch(from var(--primary) l c h / 15%);
      }
    }
  }
}

.custom-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 1rem 1.25rem;
  background-color: var(--muted);

  .btn-dialog-cancel {
    padding: 0.55rem 1.15rem;
    border-radius: 0.55rem;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--foreground);
    font-size: 0.825rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: var(--muted);
      border-color: var(--muted-foreground);
    }
  }

  .btn-dialog-action {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1.25rem;
    border-radius: 0.55rem;
    border: none;
    font-size: 0.825rem;
    font-weight: 700;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.15s ease;

    &.is-warning {
      background-color: #d97706;
      &:hover {
        background-color: #b45309;
      }
    }

    &.is-destructive {
      background-color: #dc2626;
      &:hover {
        background-color: #b91c1c;
      }
    }
  }
}
</style>

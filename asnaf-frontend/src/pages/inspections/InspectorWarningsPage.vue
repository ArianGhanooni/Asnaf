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
  Send,
  CheckCircle,
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

// واحدهای اخطار ۷۲ ساعته (warning_1 یا وضعیت اخطار اولیه)
const warningUnits = computed<Unit[]>(() => {
  const isUnion = sessionStore.session?.role === 'union';
  const userOrg = sessionStore.session?.org || '';
  return unitsStore.units
    .filter((u) => u.status === 'warning_1' || u.status === 'warning')
    .filter((u) => {
      if (!isUnion || !userOrg) return true;
      return u.union.includes(userOrg) || userOrg.includes(u.union) || u.union.includes('نانوایان');
    });
});

const filteredUnits = computed<Unit[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return warningUnits.value;
  return warningUnits.value.filter(
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
  // اسکرول نرم به کارت واحد
  const el = document.getElementById(`unit-card-${u.id}`);
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

// Dialog 1: منع پیگیری
const showResolveModal = ref(false);
const targetUnitForResolve = ref<Unit | null>(null);
const resolveReason = ref('تطبیق پروانه کسب و رفع کامل تخلف در سرکشی میدانی');

function handleResolveViolation(u: Unit): void {
  targetUnitForResolve.value = u;
  resolveReason.value = 'تطبیق پروانه کسب و رفع کامل تخلف در سرکشی میدانی';
  showResolveModal.value = true;
}

function confirmResolve(): void {
  if (!targetUnitForResolve.value) return;
  const u = targetUnitForResolve.value;
  const inspectorName = sessionStore.session?.name || 'بازرس میدانی';
  unitsStore.submitUnionDismissalDraft(
    u.id,
    'dismissal',
    `LET-${Date.now().toString().slice(-4)}`,
    '۱۴۰۵/۱۲/۲۹',
    inspectorName
  );
  $q.notify({
    type: 'positive',
    message: `منع پیگیری واحد «${u.name}» ثبت و جهت لغو اخطار به اتحادیه ارسال شد.`,
    position: 'top',
  });
  showResolveModal.value = false;
}

// Dialog 2: عدم همکاری
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
  const inspectorName = sessionStore.session?.name || 'بازرس میدانی';
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
  unitsStore.addAudit(inspectorName, 'ثبت عدم همکاری متصدی', `واحد: ${u.name} (شناسه: ${u.id})`);
  $q.notify({
    type: 'warning',
    message: `عدم همکاری متصدی واحد «${u.name}» با موفقیت در سیستم ثبت گردید.`,
    position: 'top',
  });
  showNonCooperationModal.value = false;
}

// Dialog 3: ارجاع به اداره اماکن
const showAmakenModal = ref(false);
const targetUnitForAmaken = ref<Unit | null>(null);

function handleEscalateToAmaken(u: Unit): void {
  targetUnitForAmaken.value = u;
  showAmakenModal.value = true;
}

function confirmEscalateToAmaken(): void {
  if (!targetUnitForAmaken.value) return;
  const u = targetUnitForAmaken.value;
  const inspectorName = sessionStore.session?.name || 'بازرس میدانی';
  unitsStore.escalateToAmaken(u.id, inspectorName, inspectorName);
  $q.notify({
    type: 'positive',
    message: `پرونده «${u.name}» به مرحله اخطار اماکن ارجاع شد و پیامک صادر گردید.`,
    position: 'top',
  });
  showAmakenModal.value = false;
}
</script>

<template>
  <div class="stage-page-container">
    <!-- Header -->
    <div class="stage-header-row">
      <div class="stage-title-wrap">
        <h1 class="stage-title">اخطارهای ۷۲ ساعته بازرسی</h1>
      </div>
    </div>

    <!-- Ahvaz Interactive Heatmap -->
    <AhvazInspectionHeatmap
      :units="filteredUnits"
      :selected-unit-id="selectedUnitId"
      stage="warning_1"
      stage-title="موقعیت واحد صنفی"
      height="400px"
      @select-unit="handleSelectUnit"
    />

    <!-- Search Input (زیر نقشه و بالای کارت‌های واحدهای صنفی) -->
    <div class="search-input-wrap">
      <Search class="search-icon" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="جستجوی واحد، متصدی، صنف یا آدرس..."
        class="stage-search-input"
        data-testid="warning-search-input"
      />
    </div>

    <!-- 1. Mobile Cards Grid (Default for mobile screen sizes, and for inspectors) -->
    <div :class="['units-cards-grid', { 'desktop-hidden': isStaff }]">
      <div
        v-for="u in filteredUnits"
        :id="`unit-card-${u.id}`"
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

        <!-- Action Buttons -->
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
            class="action-btn-success"
            @click.stop="handleResolveViolation(u)"
            data-testid="resolve-violation-btn"
          >
            <CheckCircle class="icon-xs" />
            <span>منع پیگیری</span>
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
            class="action-btn-primary"
            @click.stop="handleEscalateToAmaken(u)"
            data-testid="escalate-amaken-btn"
          >
            <Send class="icon-xs" />
            <span>ارجاع به اماکن</span>
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
                  :id="`warning-row-${u.id}`"
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
                        formatInspectionReason(u.violation).includes('۲۸') ? 'is-art28' : 'is-art27',
                      ]"
                    >
                      {{ formatInspectionReason(u.violation) }}
                    </span>
                  </td>

                  <!-- عملیات متناسب با نقش (فقط با آیکون و نمایش نام در هنگام hover) -->
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
                        class="tbl-btn tbl-btn-resolve"
                        @click="handleResolveViolation(u)"
                        data-testid="tbl-resolve-btn"
                        aria-label="منع پیگیری"
                      >
                        <CheckCircle class="icon-xs" />
                        <q-tooltip class="action-tooltip" anchor="top middle" self="bottom middle" :offset="[0, 6]">
                          منع پیگیری
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
                        class="tbl-btn tbl-btn-escalate"
                        @click="handleEscalateToAmaken(u)"
                        data-testid="tbl-escalate-btn"
                        aria-label="ارجاع به اداره اماکن"
                      >
                        <Send class="icon-xs" />
                        <q-tooltip class="action-tooltip" anchor="top middle" self="bottom middle" :offset="[0, 6]">
                          ارجاع به اداره اماکن
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
                  هیچ پرونده اخطار ۷۲ ساعته‌ای مطابق جستجو یافت نشد.
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

    <!-- ۱. پنل بازطراحی شده: صدور و ثبت منع پیگیری پرونده -->
    <q-dialog
      v-model="showResolveModal"
      persistent
      transition-show="scale"
      transition-hide="scale"
    >
      <q-card class="custom-action-dialog-card" dir="rtl" data-testid="resolve-violation-dialog">
        <q-card-section class="custom-dialog-header">
          <div class="header-left-group">
            <div class="dialog-icon-wrap is-success">
              <CheckCircle class="dialog-header-icon" />
            </div>
            <h3 class="dialog-header-title">صدور و ثبت منع پیگیری پرونده</h3>
          </div>
          <button
            type="button"
            class="dialog-close-btn"
            @click="showResolveModal = false"
            aria-label="بستن"
          >
            <X class="icon-sm" />
          </button>
        </q-card-section>

        <q-separator />

        <q-card-section class="custom-dialog-body">
          <p class="dialog-message-text">
            تخلف واحد صنفی «<strong>{{ targetUnitForResolve?.name }}</strong>» برطرف گردیده است. آیا دستور صدور نامه منع پیگیری و رفع اخطار تایید می‌شود؟
          </p>

          <div class="dialog-field-group">
            <label class="dialog-field-label" for="resolve-reason-input">علت منع پیگیری:</label>
            <input
              id="resolve-reason-input"
              v-model="resolveReason"
              type="text"
              class="custom-modal-input"
              placeholder="علت منع پیگیری را وارد نمایید..."
              data-testid="input-resolve-reason"
            />
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions class="custom-dialog-footer">
          <button
            type="button"
            class="btn-dialog-cancel"
            @click="showResolveModal = false"
          >
            انصراف
          </button>
          <button
            type="button"
            class="btn-dialog-action is-success"
            @click="confirmResolve"
            data-testid="btn-confirm-resolve"
          >
            <CheckCircle class="icon-xs" />
            <span>تایید و ثبت منع پیگیری</span>
          </button>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ۲. پنل بازطراحی شده: ثبت عدم همکاری متصدی -->
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

    <!-- ۳. پنل بازطراحی شده: ارجاع به اداره اماکن (اخطار ۱۰ روزه) -->
    <q-dialog
      v-model="showAmakenModal"
      persistent
      transition-show="scale"
      transition-hide="scale"
    >
      <q-card class="custom-action-dialog-card" dir="rtl" data-testid="amaken-escalate-dialog">
        <q-card-section class="custom-dialog-header">
          <div class="header-left-group">
            <div class="dialog-icon-wrap is-primary">
              <Send class="dialog-header-icon" />
            </div>
            <h3 class="dialog-header-title">ارجاع به اداره اماکن (اخطار ۱۰ روزه)</h3>
          </div>
          <button
            type="button"
            class="dialog-close-btn"
            @click="showAmakenModal = false"
            aria-label="بستن"
          >
            <X class="icon-sm" />
          </button>
        </q-card-section>

        <q-separator />

        <q-card-section class="custom-dialog-body">
          <p class="dialog-message-text">
            آیا از ارجاع واحد صنفی «<strong>{{ targetUnitForAmaken?.name }}</strong>» به مرحله اخطار ثانویه ۱۰ روزه اماکن به علت انقضای مهلت ۷۲ ساعته اطمینان دارید؟
          </p>

          <div class="dialog-notice-box">
            <ShieldAlert class="notice-icon" />
            <span>پرونده واحد صنفی جهت صدور اخطار نوبت دوم به کارتابل اداره نظارت بر اماکن عمومی پلیس ارجاع خواهد شد.</span>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions class="custom-dialog-footer">
          <button
            type="button"
            class="btn-dialog-cancel"
            @click="showAmakenModal = false"
          >
            انصراف
          </button>
          <button
            type="button"
            class="btn-dialog-action is-primary"
            @click="confirmEscalateToAmaken"
            data-testid="btn-confirm-amaken"
          >
            <Send class="icon-xs" />
            <span>تایید و ارجاع</span>
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
  gap: 1rem;
}

.stage-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stage-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--foreground);
  margin: 0;
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 100%;
}

.search-icon {
  position: absolute;
  inset-inline-start: 0.85rem;
  width: 1.15rem;
  height: 1.15rem;
  color: var(--muted-foreground);
  pointer-events: none;
}

.stage-search-input {
  width: 100%;
  height: 2.75rem;
  border-radius: 0.85rem;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--foreground);
  padding: 0 1rem;
  padding-inline-start: 2.5rem;
  font-size: 0.875rem;
  box-sizing: border-box;
  outline: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
}

.units-cards-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1280px) {
    grid-template-columns: repeat(3, 1fr);
  }

  &.desktop-hidden {
    @media (min-width: 1024px) {
      display: none !important;
    }
  }
}

.unit-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 1rem;
  border: 1px solid var(--border);
  background: var(--card);
  padding: 1.25rem;
  gap: 1rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;

  &:hover {
    border-color: var(--primary);
    box-shadow: 0 6px 18px rgba(37, 99, 235, 0.1);
  }

  &.is-selected {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
    background: rgba(37, 99, 235, 0.02);
  }
}

.unit-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.unit-title-group {
  display: flex;
  flex-direction: column;
}

.unit-name {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--foreground);
  margin: 0 0 0.2rem 0;
}

.unit-union {
  font-size: 0.775rem;
  color: var(--primary);
  font-weight: 600;
}

.unit-info-body {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.8rem;
  color: var(--foreground);
}

.info-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.violation-box {
  background: var(--muted);
  border-radius: 0.5rem;
  padding: 0.45rem 0.65rem;
  margin-top: 0.25rem;
  font-size: 0.775rem;

  .violation-label {
    font-weight: 700;
    color: var(--foreground);
    margin-inline-end: 0.35rem;
  }

  .violation-text {
    color: var(--muted-foreground);
  }
}

.notes-box {
  background: var(--muted);
  border-radius: 0.5rem;
  padding: 0.45rem 0.65rem;
  font-size: 0.775rem;

  .notes-label {
    font-weight: 700;
    color: var(--foreground);
    margin-inline-end: 0.35rem;
  }

  .notes-text {
    color: var(--muted-foreground);
  }
}

.unit-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    height: 2.2rem;
    border-radius: 0.55rem;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }
}

.action-btn-secondary {
  background: var(--muted);
  border: 1px solid var(--border);
  color: var(--foreground);

  &:hover {
    background: rgba(37, 99, 235, 0.08);
    border-color: var(--primary);
    color: var(--primary);
  }
}

.action-btn-success {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #059669;

  &:hover {
    background: #059669;
    color: #ffffff;
  }
}

.action-btn-warning {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #d97706;

  &:hover {
    background: #d97706;
    color: #ffffff;
  }
}

.action-btn-primary {
  grid-column: 1 / -1;
  background: #2563eb;
  border: none;
  color: #ffffff;

  &:hover {
    background: #1d4ed8;
  }
}

.icon-sm {
  width: 1.1rem;
  height: 1.1rem;
}

.icon-xs {
  width: 0.85rem;
  height: 0.85rem;
}

.text-amber {
  color: #f59e0b;
}

.text-muted {
  color: var(--muted-foreground);
}

// استایل‌های پنل‌های بازطراحی شده دیالوگ
.custom-action-dialog-card {
  width: 100%;
  max-width: 32rem;
  border-radius: var(--radius-xl, 1.25rem);
  background-color: var(--card);
  color: var(--card-foreground);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  overflow: hidden;
  direction: rtl;
}

.custom-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.15rem 1.25rem;
  background-color: var(--muted);

  .header-left-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;

    .dialog-icon-wrap {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.65rem;

      &.is-success {
        background-color: oklch(from #16a34a l c h / 12%);
        color: #16a34a;
      }
      &.is-warning {
        background-color: oklch(from #d97706 l c h / 12%);
        color: #d97706;
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
  }

  .dialog-notice-box {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.75rem 0.9rem;
    border-radius: 0.65rem;
    background-color: oklch(from var(--primary) l c h / 8%);
    border: 1px solid oklch(from var(--primary) l c h / 20%);
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--foreground);

    .notice-icon {
      width: 1.25rem;
      height: 1.25rem;
      color: var(--primary);
      flex-shrink: 0;
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

    &.is-success {
      background-color: #16a34a;
      &:hover {
        background-color: #15803d;
      }
    }

    &.is-warning {
      background-color: #d97706;
      &:hover {
        background-color: #b45309;
      }
    }

    &.is-primary {
      background-color: #2563eb;
      &:hover {
        background-color: #1d4ed8;
      }
    }
  }
}

/* Desktop Monitor Table View (For Chamber and Union) */
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

  &.tbl-btn-resolve {
    background: oklch(from #16a34a l c h / 12%);
    color: #15803d;
    border-color: oklch(from #16a34a l c h / 25%);

    &:hover {
      background: oklch(from #16a34a l c h / 20%);
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

  &.tbl-btn-escalate {
    background: var(--primary);
    color: #ffffff;

    &:hover {
      filter: brightness(1.1);
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

</style>

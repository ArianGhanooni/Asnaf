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
  ArrowRight,
  Search,
  AlertTriangle,
  Clock,
  Edit3,
  Send,
  CheckCircle,
  Building2,
  MapPin,
  Phone,
  User,
  ShieldAlert,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

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

// واحدهای اخطار ثانویه اماکن (warning_2: ۱۰ روز پس از اخطار ۷۲ ساعته)
const amakenUnits = computed<Unit[]>(() => {
  return unitsStore.units.filter((u) => u.status === 'warning_2');
});

const filteredUnits = computed<Unit[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return amakenUnits.value;
  return amakenUnits.value.filter(
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
  const el = document.getElementById(`amaken-card-${u.id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function openEdit(u: Unit): void {
  activeUnitForEdit.value = u;
  showEditModal.value = true;
}

function handleEscalateToSeal(u: Unit): void {
  $q.dialog({
    title: 'ارجاع به اقدام به پلمپ',
    message: `مهلت نهایی ۱۰ روزه اماکن برای واحد صنفی «${u.name}» سپری شده است. آیا پرونده جهت صدور دستور پلمپ توسط اتاق اصناف ارجاع شود؟`,
    cancel: { label: 'انصراف', color: 'negative', flat: true },
    ok: { label: 'تایید و ارجاع به پلمپ', color: 'negative' },
  }).onOk(() => {
    const inspectorName = sessionStore.session?.name || 'بازرس میدانی';
    unitsStore.requestSealByUnion(u.id, inspectorName);
    unitsStore.issueChamberSealOrder(u.id, `SEAL-${Date.now().toString().slice(-4)}`, inspectorName);
    $q.notify({
      type: 'positive',
      message: `دستور پلمپ واحد ${u.name} صادر و پرونده به مرحله اقدام به پلمپ منتقل شد.`,
      position: 'top',
    });
  });
}

function handleResolveViolation(u: Unit): void {
  $q.dialog({
    title: 'رفع تخلف و ارجاع به اتحادیه',
    message: `تخلف واحد صنفی «${u.name}» در مرحله اماکن برطرف گردیده است. آیا پرونده جهت ابطال اخطار اماکن به اتحادیه ارجاع شود؟`,
    prompt: {
      model: 'اخذ پروانه کسب / تطبیق مدارک ماده ۲۷',
      type: 'text',
      label: 'شرح رفع تخلف',
    },
    cancel: { label: 'انصراف', color: 'negative', flat: true },
    ok: { label: 'ثبت و ارسال به اتحادیه', color: 'positive' },
  }).onOk((reason: string) => {
    const inspectorName = sessionStore.session?.name || 'بازرس میدانی';
    unitsStore.submitUnionDismissalDraft(
      u.id,
      'dismissal',
      `AMK-DIS-${Date.now().toString().slice(-4)}`,
      '۱۴۰۵/۱۲/۲۹',
      inspectorName
    );
    $q.notify({
      type: 'positive',
      message: `رفع تخلف ثبت و پرونده جهت لغو اخطار به اتحادیه مربوطه ارسال شد.`,
      position: 'top',
    });
  });
}
</script>

<template>
  <div class="stage-page-container">
    <!-- Header with Back Button and Quick Stats -->
    <div class="stage-header-row">
      <div class="header-right">
        <button
          type="button"
          class="back-btn"
          @click="router.push('/missions/inspections')"
          aria-label="بازگشت به هاب بازرسی"
          data-testid="amaken-back-btn"
        >
          <ArrowRight class="icon-sm" />
          <span>بازگشت به هاب بازرسی</span>
        </button>
        <div class="stage-title-wrap">
          <h1 class="stage-title">اخطارهای اماکن (۱۰ روزه)</h1>
          <span class="stage-badge orange-badge">
            {{ fa(amakenUnits.length) }} پرونده تحت اقدام اماکن
          </span>
        </div>
      </div>

      <!-- Search Input -->
      <div class="search-input-wrap">
        <Search class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="جستجوی پرونده اماکن..."
          class="stage-search-input"
          data-testid="amaken-search-input"
        />
      </div>
    </div>

    <!-- Ahvaz Interactive Heatmap -->
    <AhvazInspectionHeatmap
      :units="filteredUnits"
      :selected-unit-id="selectedUnitId"
      stage="warning_2"
      stage-title="نقشه حرارتی تراکم اخطارهای ثانویه اداره اماکن اهواز"
      height="400px"
      @select-unit="handleSelectUnit"
    />

    <!-- Overdue Notice Banner -->
    <div class="info-alert-banner">
      <ShieldAlert class="icon-md text-orange" />
      <div>
        <p class="banner-title">اخطارهای منقضی ماده ۲۷ پلیس نظارت بر اماکن</p>
        <p class="banner-desc">
          واحدهای صنفی زیر پس از گذشت ۷۲ ساعت، مهلت نهایی ۱۰ روزه اماکن را سپری نموده‌اند و در صورت عدم ارائه پروانه کسب، مستوجب پلمپ انتظامی می‌باشند.
        </p>
      </div>
    </div>

    <!-- Units Cards Grid -->
    <div class="units-cards-grid">
      <div
        v-for="u in filteredUnits"
        :id="`amaken-card-${u.id}`"
        :key="u.id"
        :class="['unit-card', { 'is-selected': u.id === selectedUnitId }]"
        @click="handleSelectUnit(u)"
      >
        <div class="unit-card-header">
          <div>
            <h3 class="unit-name">{{ u.name }}</h3>
            <span class="unit-union">{{ u.union }}</span>
          </div>
          <span class="hours-badge orange-hours">
            <Clock class="icon-xs" />
            <span>انقضای مهلت ۱۰ روزه</span>
          </span>
        </div>

        <div class="unit-info-body">
          <div class="info-row">
            <User class="icon-xs text-muted" />
            <span>متصدی: <strong>{{ u.operator }}</strong> (کدملی: {{ u.nationalId }})</span>
          </div>
          <div class="info-row">
            <Phone class="icon-xs text-muted" />
            <span>تماس: {{ u.mobile }}</span>
          </div>
          <div class="info-row">
            <MapPin class="icon-xs text-muted" />
            <span>{{ u.region }} · {{ u.address }}</span>
          </div>
          <div class="violation-box">
            <span class="violation-label">شرح اقدام اماکن:</span>
            <span class="violation-text">{{ u.violation }}</span>
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
            <span>رفع تخلف (اتحادیه)</span>
          </button>

          <button
            type="button"
            class="action-btn-danger"
            @click.stop="handleEscalateToSeal(u)"
            data-testid="escalate-seal-btn"
          >
            <ShieldAlert class="icon-xs" />
            <span>اقدام به پلمپ</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Operator Modal -->
    <EditOperatorModal
      v-model="showEditModal"
      :unit="activeUnitForEdit"
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
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-right {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }
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

.stage-badge {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;

  &.orange-badge {
    background: rgba(249, 115, 22, 0.15);
    color: #ea580c;
    border: 1px solid rgba(249, 115, 22, 0.3);
  }
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 22rem;
}

.search-icon {
  position: absolute;
  inset-inline-start: 0.75rem;
  width: 1.1rem;
  height: 1.1rem;
  color: var(--muted-foreground);
  pointer-events: none;
}

.stage-search-input {
  width: 100%;
  height: 2.6rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--foreground);
  padding: 0 0.85rem;
  padding-inline-start: 2.35rem;
  font-size: 0.85rem;
  outline: none;

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
}

.info-alert-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: rgba(249, 115, 22, 0.08);
  border: 1px solid rgba(249, 115, 22, 0.25);
  border-radius: 0.85rem;
  padding: 0.85rem 1.15rem;

  .banner-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: #ea580c;
    margin: 0 0 0.2rem 0;
  }

  .banner-desc {
    font-size: 0.8rem;
    color: var(--muted-foreground);
    margin: 0;
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
    border-color: #f97316;
    box-shadow: 0 6px 18px rgba(249, 115, 22, 0.12);
  }

  &.is-selected {
    border-color: #f97316;
    box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.3);
    background: rgba(249, 115, 22, 0.02);
  }
}

.unit-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.unit-name {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--foreground);
  margin: 0 0 0.2rem 0;
}

.unit-union {
  font-size: 0.775rem;
  color: #ea580c;
  font-weight: 600;
}

.hours-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 0.4rem;
  white-space: nowrap;

  &.orange-hours {
    background: rgba(249, 115, 22, 0.15);
    color: #ea580c;
    border: 1px solid rgba(249, 115, 22, 0.3);
  }
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

.action-btn-danger {
  background: #ea580c;
  border: none;
  color: #ffffff;

  &:hover {
    background: #c2410c;
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

.text-orange {
  color: #ea580c;
}

.text-muted {
  color: var(--muted-foreground);
}
</style>

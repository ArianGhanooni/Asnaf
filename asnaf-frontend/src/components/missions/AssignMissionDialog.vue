<script setup lang="ts">
import { ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import type { Mission } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import {
  MapPin,
  Send,
  X,
  Target,
  AlertCircle,
  Building2,
  Clock,
  ShieldCheck,
  UserCheck,
  Compass,
} from 'lucide-vue-next';

interface Props {
  readonly modelValue: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'assigned', mission: Mission): void;
}>();

const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

const inspectorsList = [
  { name: 'آرین قانونی', region: 'منطقه ۲ و ۴', code: '۴۰۱۲', rank: 'رتبه ۱' },
  { name: 'رضا موسوی', region: 'منطقه ۳', code: '۴۰۱۸', rank: 'رتبه ۲' },
  { name: 'فاطمه نیسی', region: 'منطقه ۱', code: '۴۰۲۵', rank: 'رتبه ۳' },
  { name: 'علی سواری', region: 'منطقه ۶', code: '۴۰۳۰', rank: 'رتبه ۴' },
  { name: 'مریم کریمی', region: 'منطقه ۵ و ۸', code: '۴۰۴۲', rank: 'رتبه ۵' },
];

const missionTypes = [
  'بازرسی نوبتی و ادواری',
  'گشت مشترک با اداره نظارت بر اماکن عمومی',
  'رسیدگی فوری به شکایت مردمی (سیمبا)',
  'پایش هوشمند قیمت‌ها و اقلام تنظیم بازار',
  'نظارت تخصصی بر سهمیه آرد و نان',
  'بازرسی تطبیق پروانه کسب (ماده ۲۷)',
];

const regionsList = [
  'منطقه ۱',
  'منطقه ۲',
  'منطقه ۳',
  'منطقه ۴',
  'منطقه ۵',
  'منطقه ۶',
  'منطقه ۸',
];

const neighborhoodsCoordinates: Record<string, { region: string; x: number; y: number }> = {
  'کیانپارس': { region: 'منطقه ۲', x: 42, y: 38 },
  'زیتون کارمندی': { region: 'منطقه ۳', x: 55, y: 30 },
  'امانیه': { region: 'منطقه ۱', x: 65, y: 52 },
  'گلستان': { region: 'منطقه ۴', x: 38, y: 46 },
  'پادادشهر': { region: 'منطقه ۸', x: 15, y: 30 },
  'کمپلو': { region: 'منطقه ۶', x: 48, y: 22 },
  'عین ۲': { region: 'منطقه ۴', x: 30, y: 58 },
  'خشایار': { region: 'منطقه ۵', x: 72, y: 70 },
  'سه‌راه خرمشهر': { region: 'منطقه ۶', x: 22, y: 78 },
};

// Form Reactive Fields
const selectedInspector = ref(inspectorsList[0]?.name ?? 'آرین قانونی');
const selectedType = ref(missionTypes[0] ?? 'بازرسی نوبتی و ادواری');
const selectedPriority = ref<'normal' | 'high' | 'urgent'>('normal');
const selectedNeighborhood = ref('کیانپارس');
const customPlace = ref('');
const selectedRegion = ref('منطقه ۲');
const targetUnitName = ref('');
const missionTime = ref('۱۰:۳۰');
const coordX = ref(42);
const coordY = ref(38);
const missionNotes = ref('');
const isSubmitting = ref(false);

// Auto-fill coordinates and region when neighborhood changes
watch(selectedNeighborhood, (place) => {
  if (place && neighborhoodsCoordinates[place]) {
    const data = neighborhoodsCoordinates[place]!;
    selectedRegion.value = data.region;
    coordX.value = data.x;
    coordY.value = data.y;
  }
});

// Auto-suggest target units from store
const existingUnits = unitsStore.units.map((u) => u.name);

function submit(): void {
  const finalPlace = customPlace.value.trim() || selectedNeighborhood.value;
  if (!finalPlace) {
    $q.notify({ type: 'negative', message: 'تعیین محل یا محله مأموریت الزامی است', position: 'top' });
    return;
  }
  if (!selectedInspector.value) {
    $q.notify({ type: 'negative', message: 'انتخاب بازرس الزامی است', position: 'top' });
    return;
  }

  isSubmitting.value = true;
  try {
    const currentUser = sessionStore.session?.name ?? 'مدیریت نظارت اصناف';
    const payload: Omit<Mission, 'id'> = {
      inspector: selectedInspector.value,
      region: selectedRegion.value,
      place: finalPlace,
      status: 'active',
      x: coordX.value,
      y: coordY.value,
      time: missionTime.value || '۱۰:۳۰',
      type: selectedType.value,
      priority: selectedPriority.value,
      union: 'اتحادیه خواربار و سوپرمارکت',
      source: 'routine_inspection',
    };
    if (targetUnitName.value.trim()) {
      payload.targetUnit = targetUnitName.value.trim();
    }
    if (missionNotes.value.trim()) {
      payload.notes = missionNotes.value.trim();
    }

    const newMission = unitsStore.addMission(payload, currentUser);

    $q.notify({
      type: 'positive',
      message: `مأموریت کد ${fa(newMission.id)} با موفقیت به بازرس «${newMission.inspector}» تخصیص یافت.`,
      caption: `محل: ${newMission.place} (${newMission.region}) · نقشه GIS و اپلیکیشن میدانی بازرس به‌روز شد.`,
      position: 'top',
    });

    emit('assigned', newMission);
    emit('update:modelValue', false);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    transition-show="scale"
    transition-hide="scale"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="assign-mission-card" dir="rtl" data-testid="assign-mission-dialog">
      <!-- Modal Header -->
      <div class="dialog-header">
        <div class="header-info">
          <div class="mission-badge">سامانه نظارت مکانی GIS & اعزام بازرسان</div>
          <h3 class="dialog-title">تخصیص مأموریت بازرسی میدانی جدید</h3>
          <p class="dialog-desc">تعیین دستور کار، موقعیت جغرافیایی و ارسال مستقیم کارت مأموریت به تبلت بازرس (/adr)</p>
        </div>
        <button
          type="button"
          class="close-btn"
          @click="emit('update:modelValue', false)"
          data-testid="close-mission-dialog-btn"
          aria-label="بستن"
        >
          <X class="icon-sm" />
        </button>
      </div>

      <!-- Form Body -->
      <form class="dialog-form-body" @submit.prevent="submit">
        <!-- ۱. انتخاب بازرس مجری -->
        <div class="form-section-box">
          <div class="section-box-header">
            <UserCheck class="icon-xs text-primary" />
            <span>۱. تعیین بازرس مسئول مأموریت *</span>
          </div>

          <div class="inspectors-cards-grid">
            <div
              v-for="ins in inspectorsList"
              :key="ins.name"
              :class="['inspector-choice-item', { 'is-selected': selectedInspector === ins.name }]"
              @click="selectedInspector = ins.name"
              :data-testid="`choice-inspector-${ins.name}`"
            >
              <div class="choice-main-row">
                <span class="ins-name">{{ ins.name }}</span>
                <span class="ins-rank-pill">{{ ins.rank }}</span>
              </div>
              <div class="choice-sub-row">
                <span class="ins-code">شناسه: {{ fa(ins.code) }}</span>
                <span class="ins-region">{{ ins.region }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ۲. نوع مأموریت و سطح فوریت -->
        <div class="form-section-box">
          <div class="section-box-header">
            <Target class="icon-xs text-warning" />
            <span>۲. نوع مأموریت و سطح اولویت *</span>
          </div>

          <div class="grid-2">
            <div class="field-item">
              <label class="field-label">نوع مأموریت نظارتی</label>
              <select
                v-model="selectedType"
                class="form-select"
                data-testid="mission-type-select"
              >
                <option v-for="t in missionTypes" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>

            <div class="field-item">
              <label class="field-label">سطح فوریت و اولویت</label>
              <div class="priority-options-row">
                <button
                  type="button"
                  :class="['priority-btn tone-normal', { 'is-selected': selectedPriority === 'normal' }]"
                  @click="selectedPriority = 'normal'"
                  data-testid="priority-normal-btn"
                >
                  عادی
                </button>
                <button
                  type="button"
                  :class="['priority-btn tone-high', { 'is-selected': selectedPriority === 'high' }]"
                  @click="selectedPriority = 'high'"
                  data-testid="priority-high-btn"
                >
                  دارای اولویت
                </button>
                <button
                  type="button"
                  :class="['priority-btn tone-urgent', { 'is-selected': selectedPriority === 'urgent' }]"
                  @click="selectedPriority = 'urgent'"
                  data-testid="priority-urgent-btn"
                >
                  فوری و آنی
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ۳. مشخصات مکانی و جغرافیایی -->
        <div class="form-section-box">
          <div class="section-box-header">
            <Compass class="icon-xs text-primary" />
            <span>۳. موقعیت جغرافیایی و محدوده بازرسی *</span>
          </div>

          <div class="grid-3">
            <div class="field-item">
              <label class="field-label">منطقه شهرداری</label>
              <select
                v-model="selectedRegion"
                class="form-select"
                data-testid="mission-region-select"
              >
                <option v-for="r in regionsList" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>

            <div class="field-item">
              <label class="field-label">محله / حوزه نظارتی</label>
              <select
                v-model="selectedNeighborhood"
                class="form-select"
                data-testid="mission-place-select"
              >
                <option v-for="(_, place) in neighborhoodsCoordinates" :key="place" :value="place">
                  {{ place }}
                </option>
              </select>
            </div>

            <div class="field-item">
              <label class="field-label">زمان شروع مأموریت</label>
              <input
                v-model="missionTime"
                type="text"
                class="form-input"
                placeholder="مثلاً ۱۰:۳۰"
                data-testid="mission-time-input"
              />
            </div>
          </div>

          <div class="grid-2 mt-2">
            <div class="field-item">
              <label class="field-label">واحد صنفی هدف (اختیاری)</label>
              <input
                v-model="targetUnitName"
                type="text"
                list="units-list-suggestions"
                placeholder="نام واحد یا انتخاب از لیست..."
                class="form-input"
                data-testid="mission-target-unit-input"
              />
              <datalist id="units-list-suggestions">
                <option v-for="uName in existingUnits" :key="uName" :value="uName" />
              </datalist>
            </div>

            <div class="field-item">
              <label class="field-label">آدرس اختصاصی / معبر دقیق</label>
              <input
                v-model="customPlace"
                type="text"
                placeholder="مثلاً خیابان ۱۴ غربی، پلاک ۲۴..."
                class="form-input"
                data-testid="mission-custom-place-input"
              />
            </div>
          </div>

          <!-- GIS Coordinates display & tuning -->
          <div class="coordinates-preview-bar">
            <div class="coord-label-wrap">
              <MapPin class="icon-xs text-primary" />
              <span>مختصات ثبت روی نقشه تعاملی GIS:</span>
            </div>
            <div class="coord-inputs">
              <span class="coord-chip">X: {{ fa(coordX) }}%</span>
              <span class="coord-chip">Y: {{ fa(coordY) }}%</span>
            </div>
          </div>
        </div>

        <!-- ۴. دستور کار و شرح مأموریت -->
        <div class="form-section-box">
          <div class="section-box-header">
            <ShieldCheck class="icon-xs text-success" />
            <span>۴. دستور کار و نکات بازرسی</span>
          </div>

          <div class="field-item">
            <textarea
              v-model="missionNotes"
              rows="2"
              placeholder="دستورات تکمیلی سرتیم بازرسی: بررسی ترازو، کنترل تابلو، تطبیق پروانه کسب و فاکتورهای رسمی..."
              class="form-textarea"
              data-testid="mission-notes-textarea"
            />
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="dialog-footer">
          <button
            type="submit"
            :disabled="isSubmitting"
            class="submit-mission-btn"
            data-testid="confirm-mission-submit-btn"
          >
            <Send class="icon-xs" />
            <span>{{ isSubmitting ? 'در حال ثبت و ارسال...' : 'تایید، ثبت و ابلاغ مأموریت به بازرس' }}</span>
          </button>
          <button
            type="button"
            class="cancel-btn"
            @click="emit('update:modelValue', false)"
            data-testid="cancel-mission-dialog-btn"
          >
            انصراف
          </button>
        </div>
      </form>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.assign-mission-card {
  width: 100%;
  max-width: 44rem;
  background-color: var(--card);
  color: var(--foreground);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.28);
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.25rem 1.5rem;
  background-color: var(--muted);
  border-bottom: 1px solid var(--border);
}

.mission-badge {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--primary);
  background-color: oklch(from var(--primary) l c h / 12%);
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  margin-bottom: 0.25rem;
}

.dialog-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}

.dialog-desc {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0.25rem 0 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  padding: 0.25rem;

  &:hover {
    color: var(--foreground);
  }
}

.dialog-form-body {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-height: 80vh;
  overflow-y: auto;
}

.form-section-box {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.section-box-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--foreground);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}

.inspectors-cards-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 1fr;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.inspector-choice-item {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.625rem;
  background-color: var(--card);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--primary);
  }

  &.is-selected {
    border-color: var(--primary);
    background-color: oklch(from var(--primary) l c h / 10%);
    box-shadow: 0 0 0 1px var(--primary);

    .ins-name {
      color: var(--primary);
    }
  }
}

.choice-main-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ins-name {
  font-size: 0.8125rem;
  font-weight: 700;
}

.ins-rank-pill {
  font-size: 0.625rem;
  font-weight: 700;
  background-color: rgba(245, 158, 11, 0.15);
  color: #d97706;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm);
}

.choice-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.grid-3 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.mt-2 {
  margin-top: 0.5rem;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.form-input,
.form-select {
  height: 2.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding: 0 0.75rem;
  font-size: 0.8125rem;
  outline: none;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: var(--primary);
  }
}

.priority-options-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.375rem;
}

.priority-btn {
  height: 2.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &.tone-normal.is-selected {
    background-color: rgba(59, 130, 246, 0.15);
    border-color: #3b82f6;
    color: #2563eb;
  }

  &.tone-high.is-selected {
    background-color: rgba(245, 158, 11, 0.18);
    border-color: #f59e0b;
    color: #d97706;
  }

  &.tone-urgent.is-selected {
    background-color: rgba(239, 68, 68, 0.18);
    border-color: #ef4444;
    color: #dc2626;
  }
}

.coordinates-preview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--muted);
  border-radius: var(--radius-md);
  padding: 0.5rem 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.75rem;
}

.coord-label-wrap {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--muted-foreground);
  font-weight: 600;
}

.coord-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.coord-chip {
  background-color: var(--card);
  border: 1px solid var(--border);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-weight: 700;
  color: var(--primary);
}

.form-textarea {
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  outline: none;
  resize: vertical;
  line-height: 1.6;

  &:focus {
    border-color: var(--primary);
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.5rem;
}

.submit-mission-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  height: 2.75rem;
  border-radius: var(--radius-md);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.cancel-btn {
  height: 2.75rem;
  padding: 0 1.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: none;
  color: var(--foreground);
  cursor: pointer;
}

.icon-sm {
  width: 1.125rem;
  height: 1.125rem;
}

.icon-xs {
  width: 0.875rem;
  height: 0.875rem;
}

.text-primary {
  color: var(--primary);
}

.text-warning {
  color: var(--warning);
}

.text-success {
  color: var(--success);
}
</style>

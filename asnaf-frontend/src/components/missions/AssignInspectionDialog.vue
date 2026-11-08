<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import { getInspectorsByUnion } from 'src/utils/data';
import { ahvazNeighborhoods } from 'src/utils/ahvazGis';
import type { InspectorInfo, Mission, Unit } from 'src/types/asnaf';
import {
  X,
  Send,
  Building2,
  Clock,
  Compass,
  UserCheck,
  AlertTriangle,
  BadgeAlert,
  ClipboardList,
} from 'lucide-vue-next';

interface Props {
  readonly modelValue: boolean;
  readonly initialUnitId?: number | null | undefined;
}

const props = withDefaults(defineProps<Props>(), {
  initialUnitId: null,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'assigned', mission: Mission): void;
}>();

const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

const isUnionUser = computed(() => sessionStore.session?.role === 'union');
const currentUnionOrg = computed(() => sessionStore.session?.org ?? '');

// اتحادیه‌های در دسترس
const allUnions = [
  'اتحادیه خواربار و سوپرمارکت',
  'اتحادیه نانوایان',
  'اتحادیه لبنیات و بستنی',
  'اتحادیه مبل‌سازان',
  'اتحادیه اغذیه‌فروشان و رستوران',
  'اتحادیه تعمیرکاران خودرو',
  'اتحادیه قصابان',
];

const availableUnions = computed(() => {
  if (isUnionUser.value) {
    return allUnions.filter(
      (u) => u.includes(currentUnionOrg.value) || currentUnionOrg.value.includes(u)
    );
  }
  return allUnions;
});

const inspectionTypes = [
  'بازرسی نوبتی و تطبیق پروانه (ماده ۲۷)',
  'سرکشی ادواری و کنترل نرخ‌نامه',
  'پایش هوشمند قیمت‌ها و کالاهای اساسی',
  'گشت مشترک با اداره نظارت بر اماکن عمومی',
  'نظارت تخصصی بر سهمیه و ضوابط صنفی',
];

// واحدهای صنفی موجود جهت انتخاب سریع
const availableUnits = computed<Unit[]>(() => {
  if (isUnionUser.value) {
    return unitsStore.units.filter((u) =>
      u.union.includes(currentUnionOrg.value) || currentUnionOrg.value.includes(u.union)
    );
  }
  return unitsStore.units;
});

// فرم فیلدها
const selectedUnitId = ref<number | 'custom'>('custom');
const targetUnitName = ref<string>('');
const operatorName = ref<string>('');
const selectedUnion = ref<string>(availableUnions.value[0] ?? 'اتحادیه خواربار و سوپرمارکت');
const selectedNeighborhood = ref<string>('کیانپارس');
const customPlace = ref<string>('');
const selectedRegion = ref<string>('منطقه ۲');
const selectedType = ref<string>(inspectionTypes[0] ?? 'بازرسی نوبتی و تطبیق پروانه (ماده ۲۷)');
const selectedPriority = ref<'urgent' | 'high' | 'normal'>('normal');
const missionTime = ref<string>('10:00');
const missionNotes = ref<string>('');
const selectedInspector = ref<string>('');
const isSubmitting = ref<boolean>(false);

// همگام‌سازی واحد صنفی انتخاب‌شده
watch(
  () => [props.modelValue, props.initialUnitId],
  ([isOpen, unitId]) => {
    if (isOpen) {
      if (unitId) {
        const u = unitsStore.units.find((item) => item.id === unitId);
        if (u) {
          selectedUnitId.value = u.id;
          targetUnitName.value = u.name;
          operatorName.value = u.operator;
          selectedUnion.value = u.union;
          return;
        }
      }
      selectedUnitId.value = 'custom';
    }
  },
  { immediate: true }
);

watch(selectedUnitId, (val) => {
  if (val !== 'custom') {
    const u = unitsStore.units.find((item) => item.id === val);
    if (u) {
      targetUnitName.value = u.name;
      operatorName.value = u.operator;
      selectedUnion.value = u.union;
    }
  }
});

// با تغییر محله، منطقه به طور خودکار تعیین می‌شود
watch(selectedNeighborhood, (placeName) => {
  const n = ahvazNeighborhoods.find((item) => item.name === placeName);
  if (n) {
    selectedRegion.value = n.region;
  }
});

// بازرسان واجد شرایط strictly مطابق با اتحادیه صنف
const eligibleInspectors = computed<InspectorInfo[]>(() => {
  return getInspectorsByUnion(selectedUnion.value);
});

// انتخاب پیش‌فرض بازرس با تغییر اتحادیه
watch(
  eligibleInspectors,
  (list) => {
    if (list.length > 0) {
      selectedInspector.value = list[0]?.name ?? '';
    } else {
      selectedInspector.value = '';
    }
  },
  { immediate: true }
);

function close(): void {
  emit('update:modelValue', false);
}

function submit(): void {
  const finalUnit = targetUnitName.value.trim();
  if (!finalUnit) {
    $q.notify({ type: 'warning', message: 'نام واحد صنفی هدف الزامی است.', position: 'top' });
    return;
  }

  const finalPlace = customPlace.value.trim() || selectedNeighborhood.value;
  if (!finalPlace) {
    $q.notify({ type: 'warning', message: 'تعیین موقعیت یا محله الزامی است.', position: 'top' });
    return;
  }

  if (!selectedInspector.value) {
    $q.notify({
      type: 'negative',
      message: 'انتخاب بازرس هم‌صنف اتحادیه الزامی است.',
      position: 'top',
    });
    return;
  }

  isSubmitting.value = true;
  try {
    const user = sessionStore.session?.name ?? 'مدیریت نظارت اصناف';
    const mission = unitsStore.assignInspectionMission(
      {
        targetUnit: finalUnit,
        operatorName: operatorName.value.trim() || undefined,
        union: selectedUnion.value,
        place: finalPlace,
        region: selectedRegion.value,
        inspector: selectedInspector.value,
        type: selectedType.value,
        priority: selectedPriority.value,
        time: missionTime.value,
        notes: missionNotes.value,
      },
      user
    );

    $q.notify({
      type: 'positive',
      message: `مأموریت سرکشی و بازرسی واحد «${finalUnit}» به بازرس ${selectedInspector.value} تخصیص یافت.`,
      position: 'top',
    });

    emit('assigned', mission);
    close();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در ثبت ماموریت بازرسی';
    $q.notify({ type: 'negative', message: msg, position: 'top' });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="emit('update:modelValue', $event)">
    <div class="assign-dialog-card shadow-card" dir="rtl" data-testid="assign-inspection-dialog">
      <!-- هدر دیالوگ -->
      <div class="dialog-header">
        <div class="header-title-wrap">
          <div class="header-icon-box tone-inspection">
            <ClipboardList class="icon-md" />
          </div>
          <div>
            <h3 class="header-title">تخصیص بازرسی و سرکشی واحد صنفی</h3>
            <p class="header-subtitle">اعزام بازرس جهت پایش نوبتی، بررسی نرخ‌نامه و کنترل ماده ۲۷ قانون نظام صنفی</p>
          </div>
        </div>

        <button type="button" class="close-btn" @click="close" aria-label="بستن" data-testid="close-inspection-dialog-btn">
          <X class="icon-sm" />
        </button>
      </div>

      <!-- بدنه فرم -->
      <form class="dialog-form" @submit.prevent="submit">
        <!-- ۱. واحد صنفی و اتحادیه -->
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label required">
              <Building2 class="icon-xs" />
              <span>انتخاب یا ثبت واحد صنفی:</span>
            </label>
            <select v-model="selectedUnitId" class="form-select" data-testid="unit-select">
              <option value="custom">-- ثبت نام واحد به صورت دستی --</option>
              <option v-for="u in availableUnits" :key="u.id" :value="u.id">
                {{ u.name }} ({{ u.operator }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label required">
              <span>نام واحد صنفی هدف:</span>
            </label>
            <input
              v-model="targetUnitName"
              type="text"
              placeholder="مثال: سوپرمارکت رویان"
              class="form-input"
              required
              data-testid="unit-name-input"
            />
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label required">
              <span>اتحادیه صنف مربوطه:</span>
            </label>
            <select
              v-model="selectedUnion"
              class="form-select"
              required
              data-testid="union-select"
            >
              <option v-for="u in availableUnions" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">
              <span>نام متصدی واحد:</span>
            </label>
            <input
              v-model="operatorName"
              type="text"
              placeholder="نام و نام خانوادگی متصدی"
              class="form-input"
              data-testid="operator-name-input"
            />
          </div>
        </div>

        <!-- ۲. موقعیت مکانی و منطقه اهواز -->
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label required">
              <Compass class="icon-xs" />
              <span>محله اهواز:</span>
            </label>
            <select
              v-model="selectedNeighborhood"
              class="form-select"
              data-testid="neighborhood-select"
            >
              <option
                v-for="n in ahvazNeighborhoods"
                :key="n.id"
                :value="n.name"
              >
                {{ n.name }} ({{ n.region }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">
              <span>آدرس یا خیابان دقیق:</span>
            </label>
            <input
              v-model="customPlace"
              type="text"
              :placeholder="`مثال: خیابان وهابی، بین ۱۴ و ۱۵`"
              class="form-input"
              data-testid="address-input"
            />
          </div>
        </div>

        <!-- ۳. نوع بازرسی و بازرس هم‌صنف -->
        <div class="form-group">
          <label class="form-label required">
            <span>نوع بازرسی / مأموریت:</span>
          </label>
          <select
            v-model="selectedType"
            class="form-select"
            required
            data-testid="inspection-type-select"
          >
            <option v-for="t in inspectionTypes" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <div class="form-group">
          <div class="label-with-rule">
            <label class="form-label required">
              <UserCheck class="icon-xs" />
              <span>بازرس مأمور (عضو {{ selectedUnion }}):</span>
            </label>
            <span class="rule-hint-pill">قانون تطابق صنف</span>
          </div>

          <select
            v-if="eligibleInspectors.length > 0"
            v-model="selectedInspector"
            class="form-select inspector-select"
            required
            data-testid="inspector-select"
          >
            <option value="" disabled>انتخاب بازرس هم‌صنف...</option>
            <option
              v-for="ins in eligibleInspectors"
              :key="ins.id"
              :value="ins.name"
            >
              {{ ins.name }} · {{ ins.union }} ({{ ins.region }})
            </option>
          </select>

          <div v-else class="no-inspector-warning">
            <AlertTriangle class="icon-sm" />
            <span>هیچ بازرسی برای {{ selectedUnion }} تعریف نشده است.</span>
          </div>
        </div>

        <!-- ۴. اولویت و ساعت اعزام -->
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label required">
              <BadgeAlert class="icon-xs" />
              <span>اولویت:</span>
            </label>
            <select v-model="selectedPriority" class="form-select" data-testid="priority-select">
              <option value="normal">عادی و نوبتی</option>
              <option value="high">دارای اولویت</option>
              <option value="urgent">فوری و آنی</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label required">
              <Clock class="icon-xs" />
              <span>ساعت اعزام:</span>
            </label>
            <input
              v-model="missionTime"
              type="text"
              placeholder="مثال: ۱۰:۰۰"
              class="form-input"
              required
              data-testid="time-input"
            />
          </div>
        </div>

        <!-- ۵. دستور کار و توضیحات -->
        <div class="form-group">
          <label class="form-label">
            <span>دستور کار و شرح مأموریت:</span>
          </label>
          <textarea
            v-model="missionNotes"
            rows="2"
            placeholder="بررسی پروانه کسب، رعایت نرخ‌نامه مصوب، گران‌فروشی، نصب اتیکت و ضوابط صنفی..."
            class="form-textarea"
            data-testid="notes-input"
          />
        </div>

        <!-- دکمه‌های اکشن -->
        <div class="dialog-actions">
          <button
            type="button"
            class="btn-secondary"
            @click="close"
            :disabled="isSubmitting"
            data-testid="cancel-inspection-btn"
          >
            انصراف
          </button>
          <button
            type="submit"
            class="btn-primary"
            :disabled="isSubmitting || eligibleInspectors.length === 0"
            data-testid="submit-assign-inspection-btn"
          >
            <Send class="icon-xs" />
            <span>{{ isSubmitting ? 'در حال تخصیص...' : 'تخصیص بازرسی و صدور کارت' }}</span>
          </button>
        </div>
      </form>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.assign-dialog-card {
  width: 100%;
  max-width: 620px;
  background-color: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  padding-bottom: 1rem;
}

.header-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon-box {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.tone-inspection {
    background-color: oklch(from var(--primary) l c h / 12%);
    color: var(--primary);
  }
}

.header-title {
  font-size: 1.0625rem;
  font-weight: 700;
  margin: 0;
  color: var(--foreground);
}

.header-subtitle {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0.2rem 0 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  padding: 0.35rem;
  border-radius: var(--radius-md);
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--foreground);

  &.required::after {
    content: '*';
    color: var(--destructive);
    margin-inline-start: 0.2rem;
  }
}

.label-with-rule {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.rule-hint-pill {
  font-size: 0.625rem;
  font-weight: 700;
  color: #0284c7;
  background-color: rgba(2, 132, 199, 0.12);
  border: 1px solid rgba(2, 132, 199, 0.25);
  padding: 0.05rem 0.4rem;
  border-radius: 9999px;
}

.form-select,
.form-input {
  width: 100%;
  height: 2.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding-inline: 0.75rem;
  font-size: 0.8125rem;
  outline: none;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: var(--primary);
  }
}

.form-textarea {
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  font-family: inherit;
  outline: none;
  resize: vertical;
  line-height: 1.5;

  &:focus {
    border-color: var(--primary);
  }
}

.no-inspector-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: oklch(from var(--warning) l c h / 15%);
  color: var(--warning-foreground);
  border: 1px solid oklch(from var(--warning) l c h / 30%);
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 600;
}

.dialog-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}

.btn-secondary {
  height: 2.375rem;
  padding-inline: 1.125rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--muted);
  color: var(--foreground);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--card);
  }
}

.btn-primary {
  height: 2.375rem;
  padding-inline: 1.25rem;
  border-radius: var(--radius-md);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: opacity 0.15s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.icon-xs {
  width: 0.875rem;
  height: 0.875rem;
}
.icon-sm {
  width: 1.125rem;
  height: 1.125rem;
}
.icon-md {
  width: 1.375rem;
  height: 1.375rem;
}
</style>

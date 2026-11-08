<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useUnitsStore } from 'src/stores/units';
import { useUnionsStore } from 'src/stores/unions';
import { useSessionStore } from 'src/stores/session';
import { ahvazNeighborhoods, placeCenterMap, AHVAZ_CENTER } from 'src/utils/ahvazGis';
import AhvazLocationPickerMap from 'src/components/common/AhvazLocationPickerMap.vue';
import type { Unit } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import {
  ClipboardCheck,
  Building2,
  UserCheck,
  MapPin,
  Clock,
  AlertTriangle,
  X,
  Send,
  Compass,
  FileText,
  ShieldAlert,
} from 'lucide-vue-next';

interface Props {
  readonly modelValue: boolean;
  readonly initialUnion?: string | undefined;
}

const props = withDefaults(defineProps<Props>(), {
  initialUnion: undefined,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'registered', unit: Unit): void;
}>();

const $q = useQuasar();
const unitsStore = useUnitsStore();
const unionsStore = useUnionsStore();
const sessionStore = useSessionStore();

// ۵۲ اتحادیه اهواز برای سلکت
const unionOptions = computed(() => unionsStore.unions.map((u) => u.name));
const filteredUnionOptions = ref<string[]>([]);

function filterUnions(val: string, update: (callback: () => void) => void): void {
  update(() => {
    if (!val) {
      filteredUnionOptions.value = unionOptions.value;
      return;
    }
    const needle = val.trim().toLowerCase();
    filteredUnionOptions.value = unionOptions.value.filter((v) =>
      v.toLowerCase().includes(needle)
    );
  });
}

const regionsList = [
  'اهواز - منطقه ۱',
  'اهواز - منطقه ۲',
  'اهواز - منطقه ۳',
  'اهواز - منطقه ۴',
  'اهواز - منطقه ۵',
  'اهواز - منطقه ۶',
  'اهواز - منطقه ۷',
  'اهواز - منطقه ۸',
];

const neighborhoodOptions = ahvazNeighborhoods.map((n) => n.name);

const violationPresets = [
  'فاقد پروانه کسب (ماده ۲۷ قانون نظام صنفی)',
  'انقضای مدت اعتبار پروانه کسب و عدم تمدید',
  'فعالیت در رسته صنفی غیرمجاز و مغایر با مجوز',
  'عدم نصب نرخ‌نامه مصوب و عدم ارائه فاکتور رسمی',
  'عدم رعایت ضوابط انتظامی و ممانعت از بازرسی',
];

// Form fields
const name = ref('');
const noSign = ref(false);
const selectedUnion = ref(props.initialUnion || 'اتحادیه خواربار و سوپرمارکت');
const region = ref('اهواز - منطقه ۲');
const neighborhood = ref('کیانپارس');
const addressDetail = ref('');
const postalCode = ref('');
const selectedCoords = ref<[number, number]>([31.34437, 48.6866]);
const gisX = ref(48);
const gisY = ref(42);

// متصدی
const firstName = ref('');
const lastName = ref('');
const nationalId = ref('');
const mobile = ref('');
const birthDate = ref('۱۳۶۸/۰۵/۱۵');

// اخطار و بازرسی
const violation = ref('فاقد پروانه کسب (ماده ۲۷ قانون نظام صنفی)');
const customViolation = ref('');
const warningNo = ref('');
const nonCooperation = ref(false);
const inspectorName = ref('');
const notes = ref('');
const isSubmitting = ref(false);

function handleLocationPicked(info: { latLng: [number, number]; neighborhood?: string | undefined; region?: string | undefined; x: number; y: number }): void {
  selectedCoords.value = info.latLng;
  gisX.value = info.x;
  gisY.value = info.y;
  if (info.region) {
    region.value = info.region;
  }
  if (info.neighborhood) {
    neighborhood.value = info.neighborhood;
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      // مقداردهی پیش‌فرض
      const currentInspector = sessionStore.session?.name ?? 'آرین قانونی';
      inspectorName.value = currentInspector;
      const randNo = Math.floor(100 + Math.random() * 900);
      warningNo.value = `۱۴۰۵-ب-${randNo}`;
      if (props.initialUnion) {
        selectedUnion.value = props.initialUnion;
      }
      filteredUnionOptions.value = unionOptions.value;

      // همگام‌سازی مختصات با محله جاری
      const center = placeCenterMap[neighborhood.value] ?? AHVAZ_CENTER;
      selectedCoords.value = [center[0], center[1]];
    }
  },
  { immediate: true }
);

watch(noSign, (val) => {
  if (val && !name.value) {
    name.value = 'واحد صنفی فاقد تابلو';
  } else if (!val && name.value === 'واحد صنفی فاقد تابلو') {
    name.value = '';
  }
});

watch(neighborhood, (newVal) => {
  const found = ahvazNeighborhoods.find((n) => n.name === newVal);
  if (found) {
    region.value = found.region;
    selectedCoords.value = [found.center[0], found.center[1]];
    gisX.value = Math.round(Math.min(90, Math.max(10, ((found.center[1] - 48.6) / 0.18) * 100)));
    gisY.value = Math.round(Math.min(90, Math.max(10, ((found.center[0] - 31.25) / 0.14) * 100)));
  }
});

function validateForm(): boolean {
  if (!noSign.value && !name.value.trim()) {
    $q.notify({ type: 'warning', message: 'لطفاً نام تابلوی واحد صنفی را وارد نمایید.', position: 'top' });
    return false;
  }
  if (!selectedUnion.value) {
    $q.notify({ type: 'warning', message: 'انتخاب اتحادیه صنف الزامی است.', position: 'top' });
    return false;
  }
  if (!firstName.value.trim() || !lastName.value.trim()) {
    $q.notify({ type: 'warning', message: 'نام و نام خانوادگی متصدی الزامی است.', position: 'top' });
    return false;
  }
  const cleanNatId = nationalId.value.trim();
  if (!cleanNatId || cleanNatId.length !== 10 || !/^\d{10}$/.test(cleanNatId)) {
    $q.notify({ type: 'warning', message: 'کد ملی متصدی باید دقیقاً ۱۰ رقم عددی باشد.', position: 'top' });
    return false;
  }
  const cleanMobile = mobile.value.trim();
  if (!cleanMobile || !/^09\d{9}$/.test(cleanMobile)) {
    $q.notify({ type: 'warning', message: 'شماره تلفن همراه باید با ۰۹ شروع شده و ۱۱ رقم باشد.', position: 'top' });
    return false;
  }
  if (!addressDetail.value.trim()) {
    $q.notify({ type: 'warning', message: 'نشانی دقیق و پلاک واحد صنفی الزامی است.', position: 'top' });
    return false;
  }
  if (!warningNo.value.trim()) {
    $q.notify({ type: 'warning', message: 'شماره برگه اخطار بدوی الزامی است.', position: 'top' });
    return false;
  }
  return true;
}

function handleClose(): void {
  emit('update:modelValue', false);
}

function handleSubmit(): void {
  if (!validateForm()) return;
  isSubmitting.value = true;

  try {
    const finalViolation = violation.value === 'سایر'
      ? customViolation.value.trim() || 'تخلف صنفی'
      : violation.value;

    const fullOperator = `${firstName.value.trim()} ${lastName.value.trim()}`;
    const fullAddress = `${region.value}، ${neighborhood.value}، ${addressDetail.value.trim()}`;

    const newUnit = unitsStore.registerFieldInspection({
      name: name.value.trim() || 'واحد صنفی فاقد تابلو',
      hasSign: !noSign.value,
      operator: fullOperator,
      nationalId: nationalId.value.trim(),
      mobile: mobile.value.trim(),
      birthDate: birthDate.value.trim(),
      union: selectedUnion.value,
      region: region.value,
      address: fullAddress,
      postalCode: postalCode.value.trim() || undefined,
      violation: finalViolation,
      warningNo: warningNo.value.trim(),
      nonCooperation: nonCooperation.value,
      notes: notes.value.trim() || undefined,
      inspector: inspectorName.value.trim() || 'بازرس میدانی',
      x: gisX.value,
      y: gisY.value,
    });

    $q.notify({
      type: 'positive',
      message: `سرکشی میدانی و اخطار بدوی واحد «${newUnit.name}» با موفقیت ثبت شد.`,
      caption: `شماره اخطار ۷۲ ساعته: ${newUnit.warningNo} | کد رهگیری پرونده: ${fa(newUnit.id)}`,
      position: 'top',
      timeout: 4500,
    });

    emit('registered', newUnit);
    emit('update:modelValue', false);

    // ریست فرم
    name.value = '';
    noSign.value = false;
    firstName.value = '';
    lastName.value = '';
    nationalId.value = '';
    mobile.value = '';
    addressDetail.value = '';
    postalCode.value = '';
    notes.value = '';
    nonCooperation.value = false;
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <div class="field-inspection-dialog" dir="rtl">
      <!-- هدر رسمی دیالوگ -->
      <header class="dialog-header">
        <div class="header-main-content">
          <div class="header-icon-wrap">
            <ClipboardCheck class="icon-lg text-primary" />
          </div>
          <div>
            <h2 class="dialog-title">ثبت سرکشی میدانی بازرس و اخطار بدوی (مرحله ۱)</h2>
            <p class="dialog-desc">
              سامانه ثبت آنی واحدهای صنفی بازرسی‌شده در معابر اهواز، مشخصات هویتی متصدی و صدور اخطاریه ۷۲ ساعته ماده ۲۷ قانون نظام صنفی
            </p>
          </div>
        </div>

        <button type="button" class="btn-close-header" @click="handleClose" aria-label="بستن">
          <X class="icon-sm" />
        </button>
      </header>

      <!-- بدنه فرم -->
      <main class="dialog-scroll-body">
        <div class="form-grid-layout">
          <!-- کارت ۱: مشخصات واحد صنفی و موقعیت جغرافیایی -->
          <div class="form-card">
            <div class="card-title-bar">
              <Building2 class="icon-sm text-primary" />
              <h3>۱. مشخصات واحد صنفی و موقعیت مکانی (اهواز)</h3>
            </div>

            <div class="card-inputs-grid">
              <!-- نام واحد -->
              <div class="input-field col-span-2">
                <label class="field-lbl">نام واحد صنفی: <span class="required">*</span></label>
                <div class="input-row-with-toggle">
                  <q-input
                    v-model="name"
                    dense
                    outlined
                    :disable="noSign"
                    class="full-width"
                  />
                  <q-checkbox
                    v-model="noSign"
                    label="فاقد تابلو"
                    dense
                    color="negative"
                    class="no-sign-checkbox"
                  />
                </div>
              </div>

              <!-- اتحادیه صنف (از بین ۵۲ اتحادیه) -->
              <div class="input-field">
                <label class="field-lbl">اتحادیه صنف مربوطه (۵۲ اتحادیه اهواز): <span class="required">*</span></label>
                <q-select
                  v-model="selectedUnion"
                  :options="filteredUnionOptions"
                  dense
                  outlined
                  use-input
                  input-debounce="100"
                  @filter="filterUnions"
                  placeholder="جستجو و انتخاب اتحادیه..."
                >
                  <template #no-option>
                    <q-item>
                      <q-item-section class="text-muted">اتحادیه‌ای یافت نشد</q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <!-- منطقه شهرداری -->
              <div class="input-field">
                <label class="field-lbl">منطقه شهرداری اهواز: <span class="required">*</span></label>
                <q-select
                  v-model="region"
                  :options="regionsList"
                  dense
                  outlined
                />
              </div>

              <!-- محله / خیابان -->
              <div class="input-field">
                <label class="field-lbl">محله / محدوده شهری: <span class="required">*</span></label>
                <q-select
                  v-model="neighborhood"
                  :options="neighborhoodOptions"
                  dense
                  outlined
                />
              </div>

              <!-- کد پستی -->
              <div class="input-field">
                <label class="field-lbl">کد پستی ۱۰ رقمی (اختیاری):</label>
                <q-input
                  v-model="postalCode"
                  dense
                  outlined
                  maxlength="10"
                  dir="ltr"
                />
              </div>

              <!-- آدرس دقیق -->
              <div class="input-field col-span-2">
                <label class="field-lbl">نشانی دقیق، خیابان، کوچه و پلاک: <span class="required">*</span></label>
                <q-input
                  v-model="addressDetail"
                  dense
                  outlined
                />
              </div>

              <!-- انتخاب هوشمند موقعیت مکانی از روی نقشه اهواز (GIS) -->
              <div class="input-field col-span-2 gis-map-picker-box">
                <div class="gis-map-header">
                  <Compass class="icon-sm text-primary flex-shrink-0" />
                  <div class="gis-map-title">
                    <strong class="title-txt">موقعیت مکانی واحد صنفی روی نقشه: <span class="required">*</span></strong>
                  </div>
                </div>

                <AhvazLocationPickerMap
                  :lat-lng="selectedCoords"
                  :neighborhood="neighborhood"
                  height="310px"
                  @location-selected="handleLocationPicked"
                />
              </div>
            </div>
          </div>

          <!-- کارت ۲: هویت و اطلاعات متصدی -->
          <div class="form-card">
            <div class="card-title-bar">
              <UserCheck class="icon-sm text-primary" />
              <h3>۲. اطلاعات هویتی و ارتباطی متصدی واحد</h3>
            </div>

            <div class="card-inputs-grid">
              <!-- نام -->
              <div class="input-field">
                <label class="field-lbl">نام متصدی: <span class="required">*</span></label>
                <q-input
                  v-model="firstName"
                  dense
                  outlined
                />
              </div>

              <!-- نام خانوادگی -->
              <div class="input-field">
                <label class="field-lbl">نام خانوادگی متصدی: <span class="required">*</span></label>
                <q-input
                  v-model="lastName"
                  dense
                  outlined
                />
              </div>

              <!-- کد ملی -->
              <div class="input-field">
                <label class="field-lbl">کد ملی (۱۰ رقم بدون خط تیره): <span class="required">*</span></label>
                <q-input
                  v-model="nationalId"
                  dense
                  outlined
                  maxlength="10"
                  dir="ltr"
                />
              </div>

              <!-- شماره همراه -->
              <div class="input-field">
                <label class="field-lbl">شماره تلفن همراه (جهت پیامک اخطار): <span class="required">*</span></label>
                <q-input
                  v-model="mobile"
                  dense
                  outlined
                  maxlength="11"
                  dir="ltr"
                  placeholder="۰۹۱۶۱۲۳۴۵۶۷"
                />
              </div>

              <!-- تاریخ تولد -->
              <div class="input-field col-span-2">
                <label class="field-lbl">تاریخ تولد متصدی (شمسی):</label>
                <q-input
                  v-model="birthDate"
                  dense
                  outlined
                  dir="ltr"
                  placeholder="۱۳۶۸/۰۵/۱۵"
                />
              </div>
            </div>
          </div>

          <!-- کارت ۳: تخلف و اخطاریه بدوی ۷۲ ساعته -->
          <div class="form-card highlight-card">
            <div class="card-title-bar">
              <ShieldAlert class="icon-sm text-warning" />
              <h3>۳. گزارش بازرسی و اخطاریه بدوی ۷۲ ساعته (مرحله ۱)</h3>
            </div>

            <div class="card-inputs-grid">
              <!-- نوع تخلف -->
              <div class="input-field col-span-2">
                <label class="field-lbl">موضوع تخلف و وضعیت پروانه کسب: <span class="required">*</span></label>
                <q-select
                  v-model="violation"
                  :options="violationPresets"
                  dense
                  outlined
                />
              </div>

              <!-- شماره اخطار بدوی -->
              <div class="input-field">
                <label class="field-lbl">شماره برگه اخطار فیزیکی بازرس: <span class="required">*</span></label>
                <q-input
                  v-model="warningNo"
                  dense
                  outlined
                  placeholder="۱۴۰۵-ب-..."
                  dir="ltr"
                />
              </div>

              <!-- بازرس مأمور -->
              <div class="input-field">
                <label class="field-lbl">نام بازرس ثبت‌کننده: <span class="required">*</span></label>
                <q-input
                  v-model="inspectorName"
                  dense
                  outlined
                />
              </div>

              <!-- مهلت قانونی ۷۲ ساعت -->
              <div class="input-field col-span-2 grace-badge-row">
                <div class="grace-badge">
                  <Clock class="icon-xs text-primary" />
                  <span>مهلت قانونی طبق تبصره ۳ ماده ۲۷:</span>
                  <strong>۷۲ ساعت کاری (۳ روز)</strong>
                </div>
                <div class="non-coop-toggle">
                  <q-toggle
                    v-model="nonCooperation"
                    label="عدم همکاری یا ممانعت از بازرسی"
                    color="negative"
                    dense
                  />
                </div>
              </div>

              <!-- شرح مشاهدات -->
              <div class="input-field col-span-2">
                <label class="field-lbl">شرح مشاهدات و توضیحات بازرس در محل:</label>
                <q-input
                  v-model="notes"
                  type="textarea"
                  rows="3"
                  dense
                  outlined
                  placeholder="توضیحات تکمیلی پیرامون وضعیت واحد، نصب تابلو، فعالیت فاقد مجوز و اخطار شفاهی ابلاغ شده..."
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- فوتر دکمه‌های عملیات -->
      <footer class="dialog-footer">
        <div class="footer-info">
          <AlertTriangle class="icon-xs text-warning" />
          <span>با ثبت این فرم، پرونده واحد در مرحله ۱ (اخطار بدوی ۷۲ ساعته) قرار گرفته و پیامک ابلاغ به متصدی ارسال خواهد شد.</span>
        </div>

        <div class="footer-actions">
          <button type="button" class="btn-cancel" @click="handleClose">
            انصراف
          </button>

          <button
            type="button"
            class="btn-submit"
            :disabled="isSubmitting"
            @click="handleSubmit"
            data-testid="submit-field-inspection-btn"
          >
            <Send class="icon-xs" />
            <span>ثبت رسمی سرکشی و صدور اخطاریه ۷۲ ساعته</span>
          </button>
        </div>
      </footer>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.field-inspection-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--background);
  color: var(--foreground);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-block: 1rem;
  padding-inline: 1.5rem;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 20;

  .header-main-content {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .header-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: var(--radius-lg);
    background: oklch(from var(--primary) l c h / 12%);
  }

  .dialog-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--foreground);
  }

  .dialog-desc {
    margin: 0.25rem 0 0;
    font-size: 0.8125rem;
    color: var(--muted-foreground);
  }

  .btn-close-header {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--muted-foreground);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--muted);
      color: var(--foreground);
    }
  }
}

.dialog-scroll-body {
  flex: 1;
  overflow-y: auto;
  padding-block: 1.5rem;
  padding-inline: 1.5rem;
}

.form-grid-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1100px;
  margin-inline: auto;
}

.form-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &.highlight-card {
    border-color: oklch(from #f59e0b l c h / 35%);
    background: linear-gradient(to bottom, var(--card), oklch(from #f59e0b l c h / 3%));
  }
}

.card-title-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--border);

  h3 {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--foreground);
  }
}

.card-inputs-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.col-span-2 {
  grid-column: 1 / -1;
}

.input-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  .field-lbl {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--foreground);

    .required {
      color: var(--destructive);
    }
  }
}

.input-row-with-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.no-sign-checkbox {
  white-space: nowrap;
}

.gis-map-picker-box {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.85rem;
  background: oklch(from var(--primary) l c h / 3%);
  border: 1px solid oklch(from var(--primary) l c h / 18%);
  border-radius: var(--radius-lg);

  .gis-map-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .gis-map-title {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;

    .title-txt {
      font-size: 0.875rem;
      color: var(--foreground);
    }

    .sub-hint {
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }
  }
}

.grace-badge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.75rem;
  background: oklch(from var(--primary) l c h / 6%);
  border-radius: var(--radius-md);
  border: 1px solid oklch(from var(--primary) l c h / 20%);
}

.grace-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--foreground);

  strong {
    color: var(--primary);
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding-block: 1rem;
  padding-inline: 1.5rem;
  background: var(--card);
  border-top: 1px solid var(--border);
  position: sticky;
  bottom: 0;
  z-index: 20;

  .footer-info {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.8125rem;
    color: var(--muted-foreground);
    max-width: 600px;
  }

  .footer-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
}

.btn-cancel {
  padding-block: 0.55rem;
  padding-inline: 1.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--foreground);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--muted);
  }
}

.btn-submit {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding-block: 0.55rem;
  padding-inline: 1.25rem;
  border-radius: var(--radius-md);
  border: none;
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useUnitsStore } from 'src/stores/units';
import { useUnionsStore } from 'src/stores/unions';
import { useSessionStore } from 'src/stores/session';
import { ahvazNeighborhoods } from 'src/utils/ahvazGis';
import AhvazLocationPickerMap from 'src/components/common/AhvazLocationPickerMap.vue';
import { fa } from 'src/utils/fa';
import {
  Building2,
  User,
  MapPin,
  Send,
  ChevronDown,
  Search,
  Check,
} from 'lucide-vue-next';

const router = useRouter();
const $q = useQuasar();
const unitsStore = useUnitsStore();
const unionsStore = useUnionsStore();
const sessionStore = useSessionStore();

// انتخاب اتحادیه با دراپ‌داون مدرن اختصاصی
const unionOptions = computed(() => unionsStore.unions.map((u) => u.name));
const isUnionDropdownOpen = ref(false);
const unionSearch = ref('');
const unionDropdownRef = ref<HTMLDivElement | null>(null);

const filteredUnions = computed(() => {
  const query = unionSearch.value.trim().toLowerCase();
  if (!query) return unionOptions.value;
  return unionOptions.value.filter((name) =>
    name.toLowerCase().includes(query)
  );
});

function selectUnion(uName: string): void {
  selectedUnion.value = uName;
  isUnionDropdownOpen.value = false;
  unionSearch.value = '';
}

function handleClickOutside(event: MouseEvent): void {
  if (unionDropdownRef.value && !unionDropdownRef.value.contains(event.target as Node)) {
    isUnionDropdownOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  if (sessionStore.session?.role === 'union' && sessionStore.session?.org) {
    selectedUnion.value = sessionStore.session.org;
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

// علت بازرسی: گزینه‌های قانونی شامل ماده ۲۷، ماده ۲۸ و عدم همکاری متصدی
interface ViolationOption {
  readonly id: 'article_27' | 'article_28' | 'non_cooperation';
  readonly law: string;
  readonly title: string;
}

const violationOptions: ViolationOption[] = [
  {
    id: 'article_27',
    law: 'ماده ۲۷',
    title: 'ماده ۲۷ قانون نظام صنفی (محل دایر شده بدون پروانه کسب)',
  },
  {
    id: 'article_28',
    law: 'ماده ۲۸',
    title: 'ماده ۲۸ قانون نظام صنفی (تخلفات مقرراتی و صنفی واحد دارای پروانه)',
  },
  {
    id: 'non_cooperation',
    law: 'عدم همکاری',
    title: 'عدم همکاری متصدی با بازرس میدانی در ارائه مدارک صنفی',
  },
];

// Form fields
const name = ref('');
const selectedUnion = ref('اتحادیه خواربار و سوپرمارکت');
const selectedCoords = ref<[number, number]>([31.34437, 48.6866]);
const detectedNeighborhood = ref<string>('کیانپارس');
const detectedRegion = ref<string>('منطقه ۲');
const notes = ref('');

// مشخصات متصدی (طبق گام ۱ سند نیازمندی‌ها)
const firstName = ref('');
const lastName = ref('');
const nationalId = ref('');
const mobile = ref('');
const birthDate = ref('');
const violation = ref(
  violationOptions[0]?.title ?? 'ماده ۲۷ قانون نظام صنفی (محل دایر شده بدون پروانه کسب)'
);

const isSubmitting = ref(false);

function selectViolation(opt: ViolationOption): void {
  violation.value = opt.title;
}

// استخراج آدرس متنی دقیق و کامل از لوکیشن انتخاب‌شده روی نقشه
function computeFullAddress(neighName: string, reg: string): string {
  const nObj = ahvazNeighborhoods.find((n) => n.name === neighName);
  let streetDetail = '';
  if (nObj?.description) {
    const parts = nObj.description.split('،');
    streetDetail = parts[1]?.trim() || parts[0]?.trim() || '';
  }
  const streetStr = streetDetail ? `، ${streetDetail}` : '، خیابان اصلی';
  return `اهواز، ${reg}، ${neighName}${streetStr}`;
}

const fullGeneratedAddress = computed(() => {
  return computeFullAddress(detectedNeighborhood.value, detectedRegion.value);
});

function handleLocationSelected(info: {
  latLng: [number, number];
  neighborhood?: string | undefined;
  region?: string | undefined;
}): void {
  selectedCoords.value = info.latLng;
  if (info.neighborhood) {
    detectedNeighborhood.value = info.neighborhood;
  }
  if (info.region) {
    detectedRegion.value = info.region;
  }
}

function submitInspection(): void {
  const businessName = name.value.trim();
  if (!businessName) {
    $q.notify({
      type: 'warning',
      message: 'لطفاً نام واحد صنفی را وارد نمایید.',
      position: 'top',
    });
    return;
  }

  if (!firstName.value.trim() || !lastName.value.trim()) {
    $q.notify({
      type: 'warning',
      message: 'نام و نام خانوادگی متصدی الزامی است.',
      position: 'top',
    });
    return;
  }

  const cleanNationalId = nationalId.value.trim();
  if (!cleanNationalId || cleanNationalId.length !== 10 || !/^\d{10}$/.test(cleanNationalId)) {
    $q.notify({
      type: 'warning',
      message: 'کد ملی متصدی باید دقیقاً ۱۰ رقم عددی باشد.',
      position: 'top',
    });
    return;
  }

  if (!birthDate.value.trim()) {
    $q.notify({
      type: 'warning',
      message: 'تاریخ تولد متصدی الزامی است.',
      position: 'top',
    });
    return;
  }

  const cleanMobile = mobile.value.trim();
  if (!cleanMobile || cleanMobile.length !== 11 || !cleanMobile.startsWith('09') || !/^\d{11}$/.test(cleanMobile)) {
    $q.notify({
      type: 'warning',
      message: 'شماره تلفن همراه متصدی باید ۱۱ رقم با پیش‌شماره ۰۹ باشد.',
      position: 'top',
    });
    return;
  }

  isSubmitting.value = true;
  try {
    const inspectorName = sessionStore.session?.name || 'بازرس میدانی';

    const newUnit = unitsStore.registerFieldInspection({
      name: businessName,
      hasSign: true,
      operator: `${firstName.value.trim()} ${lastName.value.trim()}`,
      nationalId: cleanNationalId,
      mobile: cleanMobile,
      birthDate: birthDate.value.trim(),
      union: selectedUnion.value,
      region: `اهواز - ${detectedRegion.value}`,
      address: fullGeneratedAddress.value,
      violation: violation.value,
      warningNo: `WARN-${Date.now().toString().slice(-4)}`,
      nonCooperation: false,
      notes: notes.value.trim() || undefined,
      inspector: inspectorName,
      x: selectedCoords.value[0],
      y: selectedCoords.value[1],
    });

    $q.notify({
      type: 'positive',
      message: `سرکشی میدانی واحد «${newUnit.name}» با موفقیت ثبت شد و برگ اخطار بدوی ۷۲ ساعته صادر گردید.`,
      caption: `شناسه پرونده: ${fa(newUnit.id)} · شماره اخطار: ${newUnit.warningNo}`,
      position: 'top',
      timeout: 4000,
    });

    router.push('/missions/inspections/warnings');
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'خطا در ثبت سرکشی. لطفاً اطلاعات را مجدداً بررسی فرمایید.',
      position: 'top',
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="registration-page-container" data-testid="register-field-inspection-page">
    <!-- Header -->
    <div class="reg-header">
      <div class="title-wrap">
        <h1 class="reg-title">ثبت سرکشی و بازرسی میدانی جدید</h1>
      </div>
    </div>

    <!-- Registration Form Grid -->
    <form class="reg-form" @submit.prevent="submitInspection">
      <div class="form-columns-grid">
        <!-- Right Column: Business & Operator Info -->
        <div class="form-column">
          <!-- Section 1: Business Identity & Reason -->
          <div class="form-section-card">
            <h2 class="section-title">
              <Building2 class="icon-sm text-primary" />
              <span>مشخصات واحد صنفی و علت بازرسی</span>
            </h2>

            <div class="fields-group">
              <!-- علت بازرسی -->
              <div class="field-item">
                <label class="field-label required">
                  علت بازرسی
                </label>
                <div class="violation-choices-grid">
                  <div
                    v-for="opt in violationOptions"
                    :key="opt.id"
                    :class="['violation-choice-card', violation === opt.title ? 'is-selected' : '']"
                    @click="selectViolation(opt)"
                    data-testid="violation-choice-card"
                  >
                    <div class="choice-top">
                      <span class="custom-radio-dot" :class="{ 'is-checked': violation === opt.title }"></span>
                      <span
                        class="choice-law-pill"
                        :class="{
                          'pill-red': opt.id === 'article_27',
                          'pill-amber': opt.id === 'article_28',
                          'pill-rose': opt.id === 'non_cooperation',
                        }"
                      >
                        {{ opt.law }}
                      </span>
                    </div>
                    <div class="choice-content">
                      <h4 class="choice-heading">{{ opt.title }}</h4>
                    </div>
                  </div>
                </div>
              </div>

              <!-- انتخاب اتحادیه با دراپ‌داون مدرن سفارشی -->
              <div class="field-item">
                <label class="field-label required">رسته صنفی و اتحادیه مربوطه</label>
                <div ref="unionDropdownRef" class="custom-combobox-wrap" data-testid="reg-union-combobox">
                  <button
                    type="button"
                    class="combobox-trigger"
                    @click="isUnionDropdownOpen = !isUnionDropdownOpen"
                    :class="{ 'is-open': isUnionDropdownOpen }"
                    aria-haspopup="listbox"
                    :aria-expanded="isUnionDropdownOpen"
                  >
                    <div class="trigger-label-wrap">
                      <Building2 class="icon-xs text-muted" />
                      <span class="trigger-value">{{ selectedUnion }}</span>
                    </div>
                    <ChevronDown class="icon-xs text-muted trigger-chevron" :class="{ 'is-rotated': isUnionDropdownOpen }" />
                  </button>

                  <!-- Floating Dropdown Menu -->
                  <div v-if="isUnionDropdownOpen" class="combobox-dropdown" role="listbox">
                    <div class="dropdown-search-wrap">
                      <Search class="icon-xs text-muted" />
                      <input
                        v-model="unionSearch"
                        type="text"
                        placeholder="جستجوی اتحادیه صنفی..."
                        class="dropdown-search-input"
                        autofocus
                        @click.stop
                      />
                    </div>

                    <div class="dropdown-options-list">
                      <div
                        v-for="uName in filteredUnions"
                        :key="uName"
                        class="dropdown-option-item"
                        :class="{ 'is-selected': selectedUnion === uName }"
                        @click="selectUnion(uName)"
                        role="option"
                        :aria-selected="selectedUnion === uName"
                      >
                        <span class="option-name">{{ uName }}</span>
                        <Check v-if="selectedUnion === uName" class="icon-xs text-primary" />
                      </div>
                      <div v-if="filteredUnions.length === 0" class="dropdown-empty">
                        اتحادیه‌ای با این عنوان یافت نشد.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- نام واحد صنفی -->
              <div class="field-item">
                <label class="field-label required">نام واحد صنفی</label>
                <input
                  v-model="name"
                  type="text"
                  class="custom-input"
                  data-testid="reg-business-name-input"
                  required
                />
              </div>
            </div>
          </div>

          <!-- Section 2: Operator Identity -->
          <div class="form-section-card">
            <h2 class="section-title">
              <User class="icon-sm text-primary" />
              <span>مشخصات متصدی واحد صنفی</span>
            </h2>

            <div class="fields-group">
              <div class="grid-2-cols">
                <div class="field-item">
                  <label class="field-label required">نام متصدی</label>
                  <input
                    v-model="firstName"
                    type="text"
                    class="custom-input"
                    data-testid="reg-firstname-input"
                    required
                  />
                </div>
                <div class="field-item">
                  <label class="field-label required">نام خانوادگی متصدی</label>
                  <input
                    v-model="lastName"
                    type="text"
                    class="custom-input"
                    data-testid="reg-lastname-input"
                    required
                  />
                </div>
              </div>

              <div class="grid-2-cols">
                <div class="field-item">
                  <label class="field-label required">کد ملی (۱۰ رقم)</label>
                  <input
                    v-model="nationalId"
                    type="text"
                    dir="ltr"
                    maxlength="10"
                    class="custom-input text-left"
                    data-testid="reg-nationalid-input"
                    required
                  />
                </div>
                <div class="field-item">
                  <label class="field-label required">تاریخ تولد متصدی</label>
                  <input
                    v-model="birthDate"
                    type="text"
                    dir="ltr"
                    class="custom-input text-left"
                    data-testid="reg-birthdate-input"
                    required
                  />
                </div>
              </div>

              <div class="field-item">
                <label class="field-label required">
                  شماره تلفن همراه
                </label>
                <input
                  v-model="mobile"
                  type="text"
                  dir="ltr"
                  maxlength="11"
                  class="custom-input text-left"
                  data-testid="reg-mobile-input"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Left Column: Location & Ahvaz GIS Map -->
        <div class="form-column">
          <div class="form-section-card location-section">
            <h2 class="section-title">
              <MapPin class="icon-sm text-primary" />
              <span>موقعیت مکانی و آدرس واحد صنفی</span>
            </h2>

            <div class="fields-group">
              <!-- Interactive GIS Location Picker Map -->
              <div class="map-picker-wrap">
                <label class="field-label required">
                  تعیین موقعیت واحد صنفی
                </label>
                <AhvazLocationPickerMap
                  :lat-lng="selectedCoords"
                  @update:lat-lng="(coords) => selectedCoords = coords"
                  @location-selected="handleLocationSelected"
                />
              </div>

              <!-- آدرس متنی کامل استخراج‌شده از روی نقشه برای چک کردن -->
              <div class="detected-address-card" data-testid="detected-address-card">
                <div class="address-header">
                  <div class="header-main">
                    <MapPin class="icon-sm text-primary" />
                    <span class="address-title">آدرس متنی کامل واحد صنفی:</span>
                  </div>
                  <span class="region-badge">{{ detectedRegion }}</span>
                </div>
                <div class="address-body">
                  <div class="address-tags-row">
                    <span class="address-sub-tag">محله: <strong>{{ detectedNeighborhood }}</strong></span>
                    <span class="address-sub-tag">منطقه شهرداری: <strong>{{ detectedRegion }}</strong></span>
                  </div>
                  <p class="address-full-text">{{ fullGeneratedAddress }}</p>
                </div>
              </div>

              <!-- کادر اختصاصی توضیحات (کاملاً مجزا از نقشه در div اختصاصی) -->
              <div class="field-item notes-field-wrap" data-testid="reg-notes-wrap">
                <label class="field-label">توضیحات</label>
                <textarea
                  v-model="notes"
                  rows="3"
                  class="custom-textarea"
                  data-testid="reg-notes-input"
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="form-footer-actions">
        <button
          type="button"
          class="btn-cancel"
          @click="router.push('/missions/inspections')"
          data-testid="reg-cancel-btn"
        >
          انصراف
        </button>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="btn-submit"
          data-testid="reg-submit-btn"
        >
          <Send class="icon-sm" />
          <span>{{ isSubmitting ? 'در حال ثبت...' : 'ثبت اخطاریه' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped lang="scss">
.registration-page-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 80rem;
  margin: 0 auto;
  width: 100%;
}

.reg-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.title-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.reg-title {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--foreground);
  margin: 0;
}

.reg-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-columns-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.form-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  border-radius: 1.25rem;
  border: 1px solid var(--border);
  background: var(--card);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--foreground);
  margin: 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.fields-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--foreground);

  &.required::after {
    content: ' *';
    color: #ef4444;
  }
}

/* Violation Choices (ماده ۲۷ یا ۲۸) */
.violation-choices-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.65rem;
}

.violation-choice-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.85rem;
  border: 1.5px solid var(--border);
  background: var(--background);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--primary);
    background: rgba(37, 99, 235, 0.03);
  }

  &.is-selected {
    border-color: var(--primary);
    background: rgba(37, 99, 235, 0.06);
    box-shadow: 0 0 0 1px var(--primary);
  }

  .choice-top {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .custom-radio-dot {
    width: 1.1rem;
    height: 1.1rem;
    border-radius: 50%;
    border: 2px solid var(--border);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &.is-checked {
      border-color: var(--primary);

      &::after {
        content: '';
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 50%;
        background: var(--primary);
      }
    }
  }

  .choice-law-pill {
    font-size: 0.725rem;
    font-weight: 800;
    padding: 0.15rem 0.5rem;
    border-radius: 0.4rem;

    &.pill-red {
      background: rgba(239, 68, 68, 0.12);
      color: #dc2626;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }

    &.pill-amber {
      background: rgba(245, 158, 11, 0.12);
      color: #d97706;
      border: 1px solid rgba(245, 158, 11, 0.25);
    }

    &.pill-rose {
      background: rgba(225, 29, 72, 0.12);
      color: #e11d48;
      border: 1px solid rgba(225, 29, 72, 0.25);
    }
  }

  .choice-content {
    display: flex;
    align-items: center;
  }

  .choice-heading {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--foreground);
    margin: 0;
  }
}

/* Custom Combobox Dropdown */
.custom-combobox-wrap {
  position: relative;
  width: 100%;
}

.combobox-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 2.65rem;
  padding: 0 0.85rem;
  border-radius: 0.7rem;
  border: 1px solid var(--border);
  background: var(--background);
  color: var(--foreground);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  text-align: right;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--primary);
  }

  &.is-open {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  .trigger-label-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .trigger-value {
    color: var(--foreground);
  }

  .trigger-chevron {
    transition: transform 0.2s ease;
    flex-shrink: 0;

    &.is-rotated {
      transform: rotate(180deg);
    }
  }
}

.combobox-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 60;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0.85rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  .dropdown-search-wrap {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.65rem;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 0.5rem;

    .dropdown-search-input {
      border: none;
      background: transparent;
      color: var(--foreground);
      font-size: 0.8rem;
      width: 100%;
      outline: none;
    }
  }

  .dropdown-options-list {
    max-height: 220px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;

    /* Custom scrollbar */
    &::-webkit-scrollbar {
      width: 5px;
    }
    &::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 4px;
    }
  }

  .dropdown-option-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.55rem 0.65rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.825rem;
    font-weight: 500;
    color: var(--foreground);
    transition: background-color 0.15s ease;

    &:hover {
      background-color: var(--muted);
    }

    &.is-selected {
      background-color: rgba(37, 99, 235, 0.08);
      font-weight: 700;
      color: var(--primary);
    }
  }

  .dropdown-empty {
    padding: 0.75rem;
    text-align: center;
    color: var(--muted-foreground);
    font-size: 0.8rem;
  }
}

.custom-input {
  width: 100%;
  height: 2.65rem;
  border-radius: 0.7rem;
  border: 1px solid var(--border);
  background: var(--background);
  color: var(--foreground);
  padding: 0 0.85rem;
  font-size: 0.85rem;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
}

.custom-textarea {
  width: 100%;
  border-radius: 0.7rem;
  border: 1px solid var(--border);
  background: var(--background);
  color: var(--foreground);
  padding: 0.65rem 0.85rem;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  resize: vertical;
  min-height: 4.5rem;
  transition: all 0.2s ease;

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
}

.grid-2-cols {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 0.75rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.map-picker-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Detected Address Card Under Map */
.detected-address-card {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.95rem 1.15rem;
  border-radius: 1rem;
  background: var(--muted);
  border: 1.5px solid var(--border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);

  .address-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;

    .header-main {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .address-title {
      font-size: 0.825rem;
      font-weight: 700;
      color: var(--foreground);
    }

    .region-badge {
      font-size: 0.725rem;
      font-weight: 800;
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
      background: rgba(37, 99, 235, 0.1);
      color: var(--primary);
      border: 1px solid rgba(37, 99, 235, 0.2);
    }
  }

  .address-body {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .address-tags-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;

    .address-sub-tag {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      background: var(--card);
      padding: 0.15rem 0.5rem;
      border-radius: 0.4rem;
      border: 1px solid var(--border);

      strong {
        color: var(--foreground);
      }
    }
  }

  .address-full-text {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--foreground);
    line-height: 1.55;
    margin: 0;
    padding: 0.5rem 0.75rem;
    background: var(--card);
    border-radius: 0.6rem;
    border: 1px solid var(--border);
  }
}

.notes-field-wrap {
  margin-top: 0.25rem;
}

.form-footer-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 1.25rem;
  background: var(--card);
  border: 1px solid var(--border);

  button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 0.75rem;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }
}

.btn-cancel {
  background: var(--muted);
  border: 1px solid var(--border);
  color: var(--foreground);

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
}

.btn-submit {
  background: #2563eb;
  border: none;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);

  &:hover {
    background: #1d4ed8;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.icon-sm {
  width: 1.15rem;
  height: 1.15rem;
}

.icon-xs {
  width: 0.95rem;
  height: 0.95rem;
}

.text-muted {
  color: var(--muted-foreground);
}

.text-left {
  text-align: left;
}
</style>
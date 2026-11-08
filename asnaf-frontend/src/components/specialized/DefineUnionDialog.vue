<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useSpecializedStore } from 'src/stores/specialized';
import type { CreateUnionPayload } from 'src/types/specialized';
import {
  X,
  Plus,
  Layers,
  Sparkles,
  Building2,
  CheckCircle2,
  Gem,
  Shirt,
  Cake,
  Tv,
  Hammer,
  Store,
  Palette,
} from 'lucide-vue-next';

interface Props {
  readonly modelValue: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'created', slug: string): void;
}>();

const $q = useQuasar();
const specializedStore = useSpecializedStore();

// فرم فیلدها
const moduleName = ref('');
const unionName = ref('');
const slug = ref('');
const description = ref('');
const badgeText = ref('');
const categoriesInput = ref('');
const metric1Name = ref('');
const metric2Name = ref('');
const metricUnit = ref('واحد');
const estimatedUnits = ref<number>(350);
const selectedColor = ref('#0284c7');
const selectedIcon = ref('Store');

const isSubmitting = ref(false);

// پالت رنگی
const availableColors = [
  { label: 'آبی اقیانوسی', value: '#0284c7' },
  { label: 'سبز زمردی', value: '#059669' },
  { label: 'کهربایی / طلایی', value: '#d97706' },
  { label: 'زرشکی و قرمز', value: '#dc2626' },
  { label: 'بنفش سلطنتی', value: '#7c3aed' },
  { label: 'نیلی / سرمه‌ای', value: '#4f46e5' },
  { label: 'نارنجی تند', value: '#ea580c' },
];

// قالب‌های سریع پیشنهادی برای سرعت کاربر
const presets = [
  {
    name: 'ماژول طلا، جواهر و نقره',
    unionName: 'اتحادیه صنف فروشندگان و سازندگان طلا و جواهر اهواز',
    slug: 'jewelry',
    badge: 'طلا و مسکوکات',
    desc: 'پایش عیارسنجی طلا، بازرسی کد رهگیری T استاندارد و صدور فاکتور الکترونیک رسمی',
    categories: 'طلافروشی، کارگاه تراش و ساخت، نقره و بدلیجات، صرافی و سکه',
    m1: 'واحدهای دارای کد استاندارد',
    m2: 'شاخص صدور فاکتور برخط',
    unit: 'واحد',
    units: 480,
    color: '#d97706',
    icon: 'Gem',
  },
  {
    name: 'ماژول پوشاک و منسوجات',
    unionName: 'اتحادیه صنف خیاطان و فروشندگان پوشاک اهواز',
    slug: 'apparel',
    badge: 'پوشاک و البسه',
    desc: 'پایش درج برچسب قیمت مصوب، شناسنامه تولید داخل و نظارت بر البسه قاچاق',
    categories: 'پوشاک مردانه، پوشاک زنانه و مجلسی، مانتو و شلوار، لباس کودک، تولیدی تریکو',
    m1: 'شاخص رعایت نرخ‌نامه مصوب',
    m2: 'سهمیه پارچه و مواد اولیه',
    unit: 'درصد',
    units: 1620,
    color: '#7c3aed',
    icon: 'Shirt',
  },
  {
    name: 'ماژول قنادان و شیرینی‌پزان',
    unionName: 'اتحادیه صنف قنادان و بستنی‌سازان اهواز',
    slug: 'confectionery',
    badge: 'شیرینی و دسر',
    desc: 'پایش سهمیه شکر و روغن یارانه‌ای، رعایت قیمت مصوب زولبیا و بامیه و استانداردهای بهداشتی',
    categories: 'قنادی درجه ۱، کارگاه شیرینی سنتی، تولید حلوا و زولبیا، بستنی و آبمیوه',
    m1: 'سهمیه شکر تخصیصی (تن)',
    m2: 'سهمیه روغن قنادی (تن)',
    unit: 'تن',
    units: 390,
    color: '#ea580c',
    icon: 'Cake',
  },
  {
    name: 'ماژول لوازم خانگی و صوتی تصویری',
    unionName: 'اتحادیه صنف لوازم خانگی و الکترونیک اهواز',
    slug: 'appliances',
    badge: 'لوازم خانگی',
    desc: 'پایش شناسه کالا و کد رهگیری سامانه جامع تجارت، مبارزه با کالای قاچاق و گارانتی معتبر',
    categories: 'لوازم خانگی بزرگ، صوتی و تصویری، لوازم برقی کوچک، سرمایشی و کولر گازی',
    m1: 'کالاهای دارای شناسه معتبر',
    m2: 'شاخص ارائه ضمانت‌نامه رسمی',
    unit: 'درصد',
    units: 820,
    color: '#0284c7',
    icon: 'Tv',
  },
];

function applyPreset(p: typeof presets[0]): void {
  moduleName.value = p.name;
  unionName.value = p.unionName;
  slug.value = p.slug;
  badgeText.value = p.badge;
  description.value = p.desc;
  categoriesInput.value = p.categories;
  metric1Name.value = p.m1;
  metric2Name.value = p.m2;
  metricUnit.value = p.unit;
  estimatedUnits.value = p.units;
  selectedColor.value = p.color;
  selectedIcon.value = p.icon;
}

function handleAutoSlug(): void {
  if (!slug.value && moduleName.value) {
    const mapEn: Record<string, string> = {
      طلا: 'jewelry',
      پوشاک: 'apparel',
      شیرینی: 'confectionery',
      قنادی: 'confectionery',
      لوازم: 'appliances',
      آهن: 'steel',
      ساختمانی: 'construction',
    };
    for (const [k, v] of Object.entries(mapEn)) {
      if (moduleName.value.includes(k)) {
        slug.value = v;
        break;
      }
    }
  }
}

function closeDialog(): void {
  emit('update:modelValue', false);
}

function handleSubmit(): void {
  if (!moduleName.value.trim()) {
    $q.notify({ type: 'warning', message: 'لطفاً نام ماژول تخصصی را وارد نمایید.' });
    return;
  }
  if (!unionName.value.trim()) {
    $q.notify({ type: 'warning', message: 'لطفاً نام کامل اتحادیه را وارد نمایید.' });
    return;
  }
  if (!slug.value.trim()) {
    slug.value = `union_${Date.now()}`;
  }

  isSubmitting.value = true;
  try {
    const categories = categoriesInput.value
      ? categoriesInput.value.split(/[,،]/).map((c) => c.trim()).filter(Boolean)
      : ['رسته عمومی'];

    const payload: CreateUnionPayload = {
      name: moduleName.value,
      unionName: unionName.value,
      slug: slug.value,
      description: description.value || `پایش تخصصی و نظارت جامع بر اصناف تحت پوشش ${unionName.value}`,
      badgeText: badgeText.value || moduleName.value.replace('ماژول ', ''),
      iconName: selectedIcon.value,
      primaryColor: selectedColor.value,
      categories,
      metric1Name: metric1Name.value || 'شاخص انطباق ضوابط',
      metric2Name: metric2Name.value || 'پایش‌های میدانی مصوب',
      unit: metricUnit.value || 'واحد',
      estimatedUnits: estimatedUnits.value || 250,
    };

    const newSlug = specializedStore.createUnion(payload);

    $q.notify({
      type: 'positive',
      message: `اتحادیه تخصصی «${payload.name}» با موفقیت تعریف و راه‌اندازی شد.`,
      icon: 'check_circle',
    });

    emit('created', newSlug);
    closeDialog();
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'خطایی در ثبت اتحادیه رخ داد. لطفاً مجدداً تلاش کنید.',
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="define-union-dialog-card" dir="rtl" data-testid="define-union-dialog">
      <!-- Modal Header -->
      <div class="dialog-header">
        <div class="header-titles">
          <div class="header-tag">
            <Sparkles class="icon-xxs" />
            <span>سامانه پایش هوشمند اصناف اهواز</span>
          </div>
          <h2 class="dialog-title">معرفی و راه‌اندازی ماژول تخصصی اتحادیه جدید</h2>
          <p class="dialog-subtitle">
            پیکربندی اختصاصی صنف، شاخص‌های نظارتی، رسته‌ها و تولید لایه GIS اختصاصی در کلان‌شهر اهواز
          </p>
        </div>

        <button
          type="button"
          class="dialog-close-btn"
          @click="closeDialog"
          aria-label="بستن پنجره"
          data-testid="close-define-union-dialog"
        >
          <X class="icon-sm" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="dialog-body">
        <!-- ۱. الگوهای سریع و پیشنهادی -->
        <div class="presets-banner">
          <div class="presets-header">
            <Sparkles class="icon-xs text-warning" />
            <span class="presets-title">الگوهای سریع آماده (برای پر کردن خودکار فرم کلیک کنید):</span>
          </div>
          <div class="presets-grid">
            <button
              v-for="p in presets"
              :key="p.slug"
              type="button"
              class="preset-btn"
              @click="applyPreset(p)"
              :data-testid="`preset-${p.slug}`"
            >
              <span>{{ p.badge }}</span>
            </button>
          </div>
        </div>

        <!-- ۲. فرم اطلاعات اصلی صنف و اتحادیه -->
        <form @submit.prevent="handleSubmit" class="define-form">
          <div class="form-section-card">
            <h3 class="section-title">
              <Building2 class="icon-xs text-primary" />
              <span>مشخصات هویتی و اداری اتحادیه</span>
            </h3>

            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label required">نام ماژول تخصصی صنف:</label>
                <input
                  v-model="moduleName"
                  @blur="handleAutoSlug"
                  type="text"
                  placeholder="مثال: ماژول طلا، جواهر و نقره"
                  class="gov-input"
                  required
                  data-testid="input-module-name"
                />
              </div>

              <div class="form-group">
                <label class="form-label required">نام رسمی اتحادیه صنفی:</label>
                <input
                  v-model="unionName"
                  type="text"
                  placeholder="مثال: اتحادیه صنف فروشندگان و سازندگان طلا و جواهر اهواز"
                  class="gov-input"
                  required
                  data-testid="input-union-name"
                />
              </div>

              <div class="form-group">
                <label class="form-label required">شناسه سیستمی / اسلاگ انگلیسی (URL):</label>
                <input
                  v-model="slug"
                  type="text"
                  placeholder="مثال: jewelry"
                  class="gov-input"
                  dir="ltr"
                  required
                  data-testid="input-module-slug"
                />
                <span class="field-hint">مسیر دسترسی در آدرس‌بار: /specialized/{{ slug || '...' }}</span>
              </div>

              <div class="form-group">
                <label class="form-label">برچسب کوتاه (Badge):</label>
                <input
                  v-model="badgeText"
                  type="text"
                  placeholder="مثال: طلا و مسکوکات"
                  class="gov-input"
                  data-testid="input-module-badge"
                />
              </div>
            </div>

            <div class="form-group full-width">
              <label class="form-label">شرح و اهداف نظارتی ماژول در اهواز:</label>
              <textarea
                v-model="description"
                rows="2"
                placeholder="توضیح مأموریت پایش صنف، کنترل فاکتورها، نرخ‌نامه یا سهمیه‌ها..."
                class="gov-textarea"
                data-testid="input-module-desc"
              ></textarea>
            </div>

            <div class="form-group full-width">
              <label class="form-label">رسته‌های شغلی زیرمجموعه (با کاما یا ویرگول جدا کنید):</label>
              <input
                v-model="categoriesInput"
                type="text"
                placeholder="مثال: طلافروشی، کارگاه ساخت، نقره و بدلیجات، صرافی و سکه"
                class="gov-input"
                data-testid="input-module-categories"
              />
              <span class="field-hint">این رسته‌ها به صورت فیلتر در جدول و نقشه GIS قرار می‌گیرند.</span>
            </div>
          </div>

          <!-- ۳. شاخص‌های تخصصی، پایش و نمودارها -->
          <div class="form-section-card">
            <h3 class="section-title">
              <Layers class="icon-xs text-accent" />
              <span>شاخص‌های نظارتی و داده‌های آماری صنف</span>
            </h3>

            <div class="form-grid-3">
              <div class="form-group">
                <label class="form-label required">عنوان شاخص ۱ (محور پایش اول):</label>
                <input
                  v-model="metric1Name"
                  type="text"
                  placeholder="مثال: سهمیه تخصیصی / واحدهای دارای کد استاندارد"
                  class="gov-input"
                  required
                  data-testid="input-metric1-name"
                />
              </div>

              <div class="form-group">
                <label class="form-label required">عنوان شاخص ۲ (محور پایش دوم):</label>
                <input
                  v-model="metric2Name"
                  type="text"
                  placeholder="مثال: شاخص صدور فاکتور رسمی الکترونیک"
                  class="gov-input"
                  required
                  data-testid="input-metric2-name"
                />
              </div>

              <div class="form-group">
                <label class="form-label">واحد اندازه‌گیری شاخص‌ها:</label>
                <input
                  v-model="metricUnit"
                  type="text"
                  placeholder="مثال: واحد، تن، درصد، فقره"
                  class="gov-input"
                  data-testid="input-metric-unit"
                />
              </div>

              <div class="form-group">
                <label class="form-label">تعداد تقریبی واحدهای فعال در اهواز:</label>
                <input
                  v-model.number="estimatedUnits"
                  type="number"
                  min="10"
                  max="10000"
                  class="gov-input"
                  dir="ltr"
                  data-testid="input-estimated-units"
                />
              </div>

              <div class="form-group">
                <label class="form-label">رنگ اختصاصی ماژول:</label>
                <div class="color-palette">
                  <button
                    v-for="c in availableColors"
                    :key="c.value"
                    type="button"
                    :class="['color-circle-btn', { active: selectedColor === c.value }]"
                    :style="{ backgroundColor: c.value }"
                    :title="c.label"
                    @click="selectedColor = c.value"
                  >
                    <CheckCircle2 v-if="selectedColor === c.value" class="icon-xxs text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Modal Footer -->
      <div class="dialog-footer">
        <div class="footer-note">
          <span>با ثبت اتحادیه، لایه نقشه زنده اهواز و کارت‌های نظارتی به صورت خودکار فعال می‌شوند.</span>
        </div>

        <div class="footer-actions">
          <button
            type="button"
            class="btn-cancel"
            @click="closeDialog"
            :disabled="isSubmitting"
          >
            انصراف
          </button>

          <button
            type="button"
            class="btn-submit"
            @click="handleSubmit"
            :disabled="isSubmitting"
            data-testid="submit-define-union-btn"
          >
            <Plus class="icon-xs" />
            <span>{{ isSubmitting ? 'در حال ثبت...' : 'ثبت و راه‌اندازی ماژول اتحادیه' }}</span>
          </button>
        </div>
      </div>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.define-union-dialog-card {
  width: 100%;
  height: 100%;
  background-color: var(--background);
  color: var(--foreground);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.75rem;
  background-color: var(--card);
  border-bottom: 1px solid var(--border);
}

.header-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--primary);
  background-color: oklch(from var(--primary) l c h / 10%);
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  margin-bottom: 0.35rem;
}

.dialog-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--foreground);
}

.dialog-subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}

.dialog-close-btn {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.5rem;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: var(--foreground);
    background-color: var(--secondary);
  }
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.presets-banner {
  background-color: var(--secondary);
  border: 1px dashed var(--border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.presets-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--foreground);
}

.presets-grid {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.preset-btn {
  display: inline-flex;
  align-items: center;
  padding-block: 0.35rem;
  padding-inline: 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
    transform: translateY(-1px);
  }
}

.define-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-section-card {
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--foreground);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.form-grid-3 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  &.full-width {
    grid-column: 1 / -1;
  }
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--foreground);

  &.required::after {
    content: ' *';
    color: #ef4444;
  }
}

.field-hint {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.gov-input,
.gov-textarea {
  width: 100%;
  padding-block: 0.55rem;
  padding-inline: 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--secondary);
  color: var(--foreground);
  font-size: 0.8125rem;
  transition: border-color 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
}

.gov-textarea {
  resize: vertical;
}

.color-palette {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.25rem;
}

.color-circle-btn {
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease;

  &:hover {
    transform: scale(1.15);
  }

  &.active {
    border-color: var(--foreground);
    transform: scale(1.15);
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem 1.75rem;
  background-color: var(--card);
  border-top: 1px solid var(--border);
}

.footer-note {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.btn-cancel {
  padding-block: 0.55rem;
  padding-inline: 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--secondary);
  color: var(--foreground);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: oklch(from var(--foreground) l c h / 8%);
  }
}

.btn-submit {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding-block: 0.55rem;
  padding-inline: 1.25rem;
  border-radius: var(--radius-md);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.15s ease;

  &:hover {
    filter: brightness(1.1);
  }
}

.icon-sm {
  width: 1.125rem;
  height: 1.125rem;
}
.icon-xs {
  width: 0.875rem;
  height: 0.875rem;
}
.icon-xxs {
  width: 0.75rem;
  height: 0.75rem;
}
</style>

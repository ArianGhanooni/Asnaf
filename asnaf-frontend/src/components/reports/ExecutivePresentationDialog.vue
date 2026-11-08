<script setup lang="ts">
import { ref, computed } from 'vue';
import { fa } from 'src/utils/fa';
import emblem from 'src/assets/emblem.png';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Presentation,
  ShieldAlert,
  MapPin,
  FileCheck,
  MessageSquare,
  TrendingUp,
} from 'lucide-vue-next';

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const currentSlide = ref(0);

const slides = [
  {
    id: 1,
    title: 'ساماندهی اصناف و نظارت بر ماده ۲۷',
    subtitle: 'شناسایی و ساماندهی واحدهای صنفی فاقد پروانه در سطح استان خوزستان',
    icon: ShieldAlert,
    metrics: [
      { label: 'واحدهای پایش‌شده', value: '۱,۴۲۰', note: 'رشد ۱۸٪ نسبت به فصل قبل' },
      { label: 'اخطارهای ماده ۲۷ صادره', value: '۳۴۰', note: '۷۵٪ ورود به فرآیند امهال' },
      { label: 'تطبیق موفق و اخذ پروانه', value: '۲۶۰', note: 'کاهش فعالیت‌های غیرمجاز' },
      { label: 'اجرای احکام پلمپ قانونی', value: '۴۸', note: 'با هماهنگی اماکن عمومی' },
    ],
  },
  {
    id: 2,
    title: 'عملکرد مأموریت‌ها و گشت‌های میدانی',
    subtitle: 'پایش موقعیت‌محور (GIS) و سرعت عمل بازرسان در مناطق شهری',
    icon: MapPin,
    metrics: [
      { label: 'کل مأموریت‌های ثبت‌شده', value: '۱۹۷', note: 'میانگین ۳.۸ مأموریت به ازای بازرس' },
      { label: 'مأموریت‌های تکمیل‌شده', value: '۱۸۵', note: 'نرخ تکمیل ۹۴٪' },
      { label: 'مأموریت‌های فعال روی نقشه', value: '۱۲', note: 'رصد زنده از طریق GPS' },
      { label: 'میانگین زمان هر بازرسی', value: '۲۲ دقیقه', note: 'ارتقای کیفیت صورتمجلس' },
    ],
  },
  {
    id: 3,
    title: 'وضعیت صدور و تمدید پروانه‌های کسب',
    subtitle: 'آمار تجمیعی درگاه ملی مجوزها و سامانه نوین اصناف',
    icon: FileCheck,
    metrics: [
      { label: 'کل پروانه‌های بررسی‌شده', value: '۱,۱۵۵', note: 'مجموع ۵ اتحادیه منتخب' },
      { label: 'پروانه جدید صادرشده', value: '۶۴۰', note: '۵۵٪ از کل درخواست‌ها' },
      { label: 'تمدید پروانه‌های منقضی', value: '۳۱۰', note: '۲۷٪ از کل درخواست‌ها' },
      { label: 'در حال بررسی در اتحادیه', value: '۱۲۰', note: '۱۰٪ در مرحله استعلامات' },
    ],
  },
  {
    id: 4,
    title: 'رسیدگی به شکایات مردمی (سامانه سیمبا)',
    subtitle: 'یکپارچگی گزارشات شهروندی با پرونده‌های نظارتی اصناف',
    icon: MessageSquare,
    metrics: [
      { label: 'کل شکایات واصله', value: '۳۸۵', note: 'ثبت در درگاه سیمبا ۱۲۴' },
      { label: 'رسیدگی و تعیین تکلیف', value: '۳۴۲', note: '۸۹٪ نرخ رسیدگی موفق' },
      { label: 'مصالحه و بازگشت وجه', value: '۲۱۰', note: 'رضایت‌مندی شهروندان' },
      { label: 'میانگین زمان پاسخگویی', value: '۴۸ ساعت', note: 'استاندارد ملی: ۷۲ ساعت' },
    ],
  },
  {
    id: 5,
    title: 'پایش هوشمند بازار و تغییرات قیمت‌ها',
    subtitle: 'رصد نوسانات کالاهای اساسی و کشف خودکار گران‌فروشی',
    icon: TrendingUp,
    metrics: [
      { label: 'اقلام اساسی تحت رصد', value: '۴۵ قلم', note: 'سبد معیشتی خانوار' },
      { label: 'ثبات قیمتی نان سنتی', value: '۱۰۰٪', note: 'سهمیه‌بندی دقیق یارانه‌ای' },
      { label: 'انحرافات قیمتی شناسایی‌شده', value: '۱۴ مورد', note: 'صدور برگه تخلف تعزیرات' },
      { label: 'شاخص آرامش بازار', value: '۸۲ از ۱۰۰', note: 'وضعیت پایدار' },
    ],
  },
];

const activeSlide = computed(() => slides[currentSlide.value]!);

function nextSlide(): void {
  if (currentSlide.value < slides.length - 1) {
    currentSlide.value++;
  }
}

function prevSlide(): void {
  if (currentSlide.value > 0) {
    currentSlide.value--;
  }
}
</script>

<template>
  <q-dialog
    :model-value="modelValue"
    maximized
    transition-show="fade"
    transition-hide="fade"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="presentation-wrapper" dir="rtl" data-testid="presentation-dialog">
      <!-- Presentation Top Bar -->
      <div class="presentation-header">
        <div class="header-right">
          <img :src="emblem" alt="نشان اصناف" class="header-logo" />
          <div>
            <h2 class="header-title">ارائه اسلایدی گزارش مدیریتی عملکرد اصناف</h2>
            <p class="header-sub">جلسه کمیسیون نظارت و ساماندهی اقتصادی استان خوزستان</p>
          </div>
        </div>

        <div class="header-left">
          <span class="slide-indicator">
            اسلاید {{ fa(currentSlide + 1) }} از {{ fa(slides.length) }}
          </span>
          <button type="button" class="btn-close" @click="emit('update:modelValue', false)">
            <X class="icon-sm" />
          </button>
        </div>
      </div>

      <!-- Slide Main Stage -->
      <div class="presentation-stage">
        <div class="slide-card shadow-card">
          <div class="slide-badge">
            <component :is="activeSlide.icon" class="icon-md text-primary" />
            <span>بخش {{ fa(activeSlide.id) }}: {{ activeSlide.title }}</span>
          </div>

          <h1 class="slide-heading">{{ activeSlide.title }}</h1>
          <p class="slide-desc">{{ activeSlide.subtitle }}</p>

          <!-- 4 Big Metric Tiles -->
          <div class="metrics-grid">
            <div
              v-for="m in activeSlide.metrics"
              :key="m.label"
              class="metric-box"
            >
              <span class="metric-label">{{ m.label }}</span>
              <strong class="metric-value">{{ m.value }}</strong>
              <span class="metric-note">{{ m.note }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Presentation Bottom Controller Bar -->
      <div class="presentation-footer">
        <button
          type="button"
          class="nav-btn"
          :disabled="currentSlide === 0"
          @click="prevSlide"
        >
          <ChevronRight class="icon-sm" />
          <span>اسلاید قبلی</span>
        </button>

        <div class="slide-dots">
          <button
            v-for="(_, idx) in slides"
            :key="idx"
            type="button"
            :class="['dot-btn', { 'is-active': currentSlide === idx }]"
            @click="currentSlide = idx"
          />
        </div>

        <button
          type="button"
          class="nav-btn"
          :disabled="currentSlide === slides.length - 1"
          @click="nextSlide"
        >
          <span>اسلاید بعدی</span>
          <ChevronLeft class="icon-sm" />
        </button>
      </div>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.presentation-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
  color: #f8fafc;
  font-family: var(--font-sans);
}

.presentation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background-color: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-logo {
  width: 2.75rem;
  height: 2.75rem;
  background: white;
  border-radius: var(--radius-md);
  padding: 0.25rem;
}

.header-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}

.header-sub {
  font-size: 0.8125rem;
  color: #94a3b8;
  margin: 0.125rem 0 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.slide-indicator {
  font-size: 0.875rem;
  font-weight: 600;
  color: #cbd5e1;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}

.btn-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: #f8fafc;
  border-radius: var(--radius-md);
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 255, 255, 0.15);
  }
}

.presentation-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  overflow-y: auto;
}

.slide-card {
  width: 100%;
  max-width: 58rem;
  background-color: rgba(30, 41, 59, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-xl);
  padding: 2.5rem;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.slide-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  align-self: flex-start;
  background-color: rgba(37, 99, 235, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(37, 99, 235, 0.3);
  padding: 0.375rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 600;
}

.slide-heading {
  font-size: 2rem;
  font-weight: 800;
  margin: 0;
  color: #ffffff;
  line-height: 1.3;
}

.slide-desc {
  font-size: 1.0625rem;
  color: #94a3b8;
  margin: 0;
}

.metrics-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(1, 1fr);
  margin-top: 1rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.metric-box {
  background-color: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;

  .metric-label {
    font-size: 0.875rem;
    color: #94a3b8;
  }

  .metric-value {
    font-size: 2rem;
    font-weight: 800;
    color: #38bdf8;
    line-height: 1.2;
  }

  .metric-note {
    font-size: 0.75rem;
    color: #cbd5e1;
    margin-top: 0.25rem;
  }
}

.presentation-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background-color: rgba(15, 23, 42, 0.85);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0.5rem 1.25rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.2);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.slide-dots {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dot-btn {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 9999px;
  background-color: rgba(255, 255, 255, 0.25);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &.is-active {
    width: 2rem;
    background-color: #38bdf8;
  }
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.icon-md {
  width: 1.25rem;
  height: 1.25rem;
}
</style>

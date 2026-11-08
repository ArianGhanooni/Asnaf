<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from 'src/stores/session';
import { useSpecializedStore } from 'src/stores/specialized';
import { bakeries } from 'src/utils/data';
import { fa } from 'src/utils/fa';
import PageHeader from 'src/components/gov/PageHeader.vue';
import StatCard from 'src/components/gov/StatCard.vue';
import DefineUnionDialog from 'src/components/specialized/DefineUnionDialog.vue';
import {
  Layers,
  Wheat,
  ShoppingBag,
  Beef,
  UtensilsCrossed,
  Wrench,
  Store,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Package,
  Plus,
  Gem,
  Shirt,
  Cake,
  Tv,
  Sparkles,
} from 'lucide-vue-next';

const router = useRouter();
const sessionStore = useSessionStore();
const specializedStore = useSpecializedStore();

const showDefineUnionDialog = ref(false);

function getIconComponent(iconName: string) {
  switch (iconName) {
    case 'ShoppingBag':
      return ShoppingBag;
    case 'Beef':
      return Beef;
    case 'UtensilsCrossed':
      return UtensilsCrossed;
    case 'Wrench':
      return Wrench;
    case 'Gem':
      return Gem;
    case 'Shirt':
      return Shirt;
    case 'Cake':
      return Cake;
    case 'Tv':
      return Tv;
    default:
      return Store;
  }
}

// لیست ماژول‌های فعال شامل نان و آرد و کلیه ماژول‌های تعریف‌شده
const allModules = computed(() => {
  const list = [
    {
      slug: 'bread',
      route: '/bread',
      name: 'ماژول جامع نان و آرد',
      unionName: 'اتحادیه نانوایان اهواز',
      description: 'مدیریت سهمیه آرد یارانه‌ای، پایش نانوایی‌های اهواز، انحرافات مصرف و نقشه GIS خبازی‌ها',
      icon: Wheat,
      color: '#eab308',
      unitsCount: 1284,
      primaryKpi: 'سهمیه آرد: ۴,۶۲۰ تن',
      alertCount: bakeries.filter((b) => b.status === 'انحراف مشکوک').length,
    },
  ];

  specializedStore.allUnionsList.forEach((u) => {
    const unionUnits = specializedStore.getUnitsForUnion(u.slug);
    const alerts = unionUnits.filter((item) => item.status === 'alert').length;

    list.push({
      slug: u.slug,
      route: `/specialized/${u.slug}`,
      name: u.name,
      unionName: u.unionName,
      description: u.description,
      icon: getIconComponent(u.iconName),
      color: u.primaryColor,
      unitsCount: unionUnits.length > 0 ? unionUnits.length : 350,
      primaryKpi: `${u.kpis[1]?.label || 'شاخص کلیدی'}: ${u.kpis[1]?.value || '۸۵٪'}`,
      alertCount: alerts,
    });
  });

  return list;
});

// آمار تجمیعی هاب
const hubStats = computed(() => {
  const totalMods = allModules.value.length;
  const totalUnits = bakeries.length + specializedStore.units.length;
  const totalAlerts =
    bakeries.filter((b) => b.status === 'انحراف مشکوک').length +
    specializedStore.units.filter((u) => u.status === 'alert').length;

  return { totalMods, totalUnits, totalAlerts };
});

function openDefineUnionModal(): void {
  showDefineUnionDialog.value = true;
}

function handleUnionCreated(newSlug: string): void {
  router.push(`/specialized/${newSlug}`);
}
</script>

<template>
  <div class="specialized-hub-page" data-testid="specialized-hub-page">
    <PageHeader
      title="سامانه جامع ماژول‌های تخصصی اصناف اهواز"
      desc="پایش اختصاصی سهمیه‌ها، نرخ‌نامه‌های مصوب، رسته‌ها و نقشه‌های GIS اتحادیه‌ها"
    >
      <button
        v-if="sessionStore.session?.role !== 'inspector'"
        type="button"
        class="action-btn-primary"
        @click="openDefineUnionModal"
        data-testid="header-define-union-btn"
      >
        <Plus class="icon-sm" />
        <span>معرفی و تعریف اتحادیه جدید</span>
      </button>
    </PageHeader>

    <!-- KPI Summary Cards -->
    <div class="kpi-grid">
      <StatCard
        label="ماژول‌های تخصصی فعال"
        :value="hubStats.totalMods"
        :icon="Layers"
      />
      <StatCard
        label="کل واحدهای تحت پایش تخصصی"
        :value="fa(hubStats.totalUnits)"
        :icon="Store"
        tone="accent"
      />
      <StatCard
        label="هشدارهای نرخ و بهداشت"
        :value="hubStats.totalAlerts"
        :icon="AlertTriangle"
        tone="warning"
      />
      <StatCard
        label="پایش‌های میدانی ماه جاری"
        value="۱,۷۴۰"
        :icon="CheckCircle2"
        tone="success"
      />
    </div>

    <!-- Modules Grid -->
    <div class="modules-grid">
      <div
        v-for="mod in allModules"
        :key="mod.slug"
        class="module-card shadow-card"
        :data-testid="`hub-card-${mod.slug}`"
        @click="router.push(mod.route)"
      >
        <div class="module-card-header">
          <div
            class="icon-wrap"
            :style="{
              backgroundColor: `color-mix(in srgb, ${mod.color} 14%, transparent)`,
              color: mod.color,
            }"
          >
            <component :is="mod.icon" class="icon-md" />
          </div>

          <div class="header-titles">
            <h3 class="mod-title">{{ mod.name }}</h3>
            <span class="mod-union">{{ mod.unionName }}</span>
          </div>
        </div>

        <p class="mod-desc">{{ mod.description }}</p>

        <div class="mod-metrics-row">
          <div class="metric-pill">
            <Store class="icon-xxs" />
            <span>{{ fa(mod.unitsCount) }} واحد فعال</span>
          </div>
          <div class="metric-pill">
            <Package class="icon-xxs" />
            <span>{{ mod.primaryKpi }}</span>
          </div>
          <div v-if="mod.alertCount > 0" class="metric-pill alert">
            <AlertTriangle class="icon-xxs" />
            <span>{{ fa(mod.alertCount) }} تخلف / اخطار</span>
          </div>
        </div>

        <div class="module-card-footer">
          <span class="view-link">
            <span>ورود به ماژول و نقشه GIS</span>
            <ArrowLeft class="icon-xs" />
          </span>
        </div>
      </div>

      <!-- کارت تعاملی معرفی اتحادیه جدید -->
      <div
        v-if="sessionStore.session?.role !== 'inspector'"
        class="create-module-card shadow-card"
        @click="openDefineUnionModal"
        data-testid="hub-create-module-card"
      >
        <div class="create-icon-wrap">
          <Plus class="icon-md" />
        </div>
        <h3 class="create-title">معرفی و راه‌اندازی اتحادیه جدید</h3>
        <p class="create-desc">
          پیکربندی اختصاصی صنف با لایه نقشه GIS اهواز، شاخص‌های سهمیه‌ای و کنترل نرخ مصوب
        </p>
        <span class="create-action-btn">
          <Plus class="icon-xs" />
          <span>تعریف ماژول صنف</span>
        </span>
      </div>
    </div>

    <!-- دیالوگ تعریف اتحادیه جدید -->
    <DefineUnionDialog
      v-model="showDefineUnionDialog"
      @created="handleUnionCreated"
    />
  </div>
</template>

<style scoped lang="scss">
.specialized-hub-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.action-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--primary);
  color: var(--primary-foreground);
  border: none;
  border-radius: var(--radius-md);
  padding-block: 0.625rem;
  padding-inline: 1.125rem;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    filter: brightness(1.1);
  }
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.modules-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.module-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);

    .view-link {
      color: var(--primary);
      transform: translateX(-4px);
    }
  }
}

.module-card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
}

.icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.mod-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--foreground);
}

.mod-union {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  font-weight: 600;
}

.mod-desc {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mod-metrics-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.metric-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding-block: 0.2rem;
  padding-inline: 0.5rem;
  border-radius: var(--radius-md);
  background-color: var(--secondary);
  color: var(--foreground);
  font-size: 0.6875rem;
  font-weight: 600;

  &.alert {
    background-color: rgba(239, 68, 68, 0.12);
    color: #dc2626;
  }
}

.module-card-footer {
  border-top: 1px solid var(--border);
  padding-top: 0.75rem;
}

.view-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--foreground);
  transition: all 0.15s ease;
}

// کارت افزودن اتحادیه جدید
.create-module-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.75rem;
  padding: 1.75rem 1.25rem;
  background-color: oklch(from var(--primary) l c h / 3%);
  border: 2px dashed oklch(from var(--primary) l c h / 35%);
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: oklch(from var(--primary) l c h / 8%);
    border-color: var(--primary);
    transform: translateY(-2px);

    .create-icon-wrap {
      transform: scale(1.1);
    }
  }
}

.create-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  background-color: oklch(from var(--primary) l c h / 12%);
  color: var(--primary);
  transition: transform 0.15s ease;
}

.create-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--foreground);
}

.create-desc {
  margin: 0;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  line-height: 1.45;
  max-width: 280px;
}

.create-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.35rem;
  padding-block: 0.4rem;
  padding-inline: 0.875rem;
  border-radius: var(--radius-md);
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-size: 0.75rem;
  font-weight: 700;
}

.icon-md {
  width: 1.5rem;
  height: 1.5rem;
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

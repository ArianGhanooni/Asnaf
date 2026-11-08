<script setup lang="ts">
import { computed } from 'vue';
import { useSessionStore } from 'src/stores/session';
import { useUnitsStore } from 'src/stores/units';
import { useSpecializedStore } from 'src/stores/specialized';
import { can, type Section } from 'src/types/auth';
import { missions, missionStats, reportModules } from 'src/utils/data';
import { fa } from 'src/utils/fa';
import PanelCard from 'src/components/gov/PanelCard.vue';
import StatCard from 'src/components/gov/StatCard.vue';
import TrendAreaChart from 'src/components/gov/TrendAreaChart.vue';
import {
  Map,
  ShieldAlert,
  Wheat,
  Layers,
  BarChart3,
  CheckCircle2,
  Activity,
  Target,
  AlertTriangle,
  Trophy,
  ArrowLeft,
} from 'lucide-vue-next';

const sessionStore = useSessionStore();
const unitsStore = useUnitsStore();
const specializedStore = useSpecializedStore();

const quickCards = computed<{
  to: string;
  title: string;
  desc: string;
  icon: any;
  section: Section;
  badge: string;
  tag: string;
}[]>(() => [
  {
    to: '/missions',
    title: 'ماموریت‌های بازرسی',
    desc: 'مدیریت و مشاهده ماموریت‌های بازرسان و پایش زنده روی نقشه زون‌های شهری',
    icon: Map,
    section: 'missions',
    badge: `${fa(missionStats.total)} ماموریت کل`,
    tag: `${fa(missionStats.active)} فعال`,
  },
  {
    to: '/warnings',
    title: 'مدیریت اخطار و پلمپ',
    desc: 'مشاهده اخطارها، احکام پلمپ، تطبیق اخطارهای ماده ۲۷، امهال و صدور نامه',
    icon: ShieldAlert,
    section: 'warnings',
    badge: `${fa(unitsStore.units.length)} پرونده فعال`,
    tag: `${fa(unitsStore.article27Matches.length)} تطبیق ماده ۲۷`,
  },
  {
    to: '/specialized',
    title: 'ماژول‌های تخصصی اصناف',
    desc: 'پایش و مانیتورینگ تخصصی اتحادیه‌های صنفی (سوپرمارکت، پروتئینی، رستوران، خودرو و خبازی‌ها)',
    icon: Layers,
    section: 'specialized',
    badge: `${fa(specializedStore.allUnionsList.length)} اتحادیه تخصصی`,
    tag: `${fa(specializedStore.units.length)} واحد تحت پایش`,
  },
  {
    to: '/reports',
    title: 'مرکز گزارشات و تحلیل‌ها',
    desc: 'مشاهده و تحلیل داده‌ها، گزارش اخطارها با تقویم شمسی و لاگ پیامک‌ها',
    icon: BarChart3,
    section: 'reports',
    badge: `${fa(reportModules.length)} ماژول تحلیلی`,
    tag: 'ارائه مدیریتی',
  },
]);

const allowedQuickCards = computed(() => {
  if (!sessionStore.session) return [];
  return quickCards.value.filter((c) => can(sessionStore.session!.role, c.section));
});

const myMissions = computed(() => {
  return missions.filter(
    (m) =>
      m.inspector === 'آرین قانونی' ||
      m.inspector === 'نوراله چشم‌فر' ||
      m.inspector === sessionStore.session?.name
  );
});
</script>


<template>
  <div v-if="sessionStore.session" class="dashboard-page">
    <!-- Inspector View: Only 1 Strategic Card (Centered, No Tag, No Footer) -->
    <div v-if="sessionStore.session.role === 'inspector'" class="inspector-dashboard-view">
      <router-link
        to="/missions/inspections"
        class="quick-card shadow-card group inspector-hero-card"
        data-testid="inspector-single-missions-card"
      >
        <span class="quick-icon-wrap">
          <Map class="quick-icon" />
        </span>
        <h3 class="quick-title">ماموریت‌های بازرسی</h3>
        <p class="quick-desc">
          مدیریت و مشاهده ماموریت‌های بازرسان و پایش زنده روی نقشه زون‌های شهری
        </p>
      </router-link>
    </div>

    <!-- Standard Dashboard View for All Other Roles (Admin, General, Union) -->
    <template v-else>
      <div class="kpi-grid">
        <StatCard label="ماموریت کل" :value="missionStats.total" :icon="Target" />
        <StatCard label="تکمیل‌شده" :value="missionStats.done" :icon="CheckCircle2" tone="success" />
        <StatCard label="در حال انجام" :value="missionStats.active" :icon="Activity" tone="warning" />
        <StatCard label="فک پلمپ غیرمجاز" :value="unitsStore.units.filter((u) => u.status === 'unsealed').length" :icon="AlertTriangle" tone="destructive" />
      </div>

      <!-- 4 Modular Hub Cards (Hidden for Union and General / Chamber) -->
      <div
        v-if="sessionStore.session.role !== 'union' && sessionStore.session.role !== 'general'"
        class="quick-cards-grid"
      >
        <router-link
          v-for="card in allowedQuickCards"
          :key="card.to"
          :to="card.to"
          class="quick-card shadow-card group"
        >
          <div class="quick-card-top">
            <span class="quick-icon-wrap">
              <component :is="card.icon" class="quick-icon" />
            </span>
            <span class="quick-tag">{{ card.tag }}</span>
          </div>
          <h3 class="quick-title">{{ card.title }}</h3>
          <p class="quick-desc">{{ card.desc }}</p>
          <div class="quick-footer">
            <span class="quick-badge">{{ card.badge }}</span>
            <span class="quick-enter">
              <span>ورود به ماژول</span>
              <ArrowLeft class="arrow-icon" />
            </span>
          </div>
        </router-link>
      </div>

      <!-- Charts & High Risk Grid -->
      <div class="charts-grid">
        <PanelCard title="روند نظارتی اخطار و پلمپ">
          <TrendAreaChart />
        </PanelCard>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 80rem;
  margin: 0 auto;
  width: 100%;
}

.inspector-dashboard-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 44rem;
  width: 100%;
  margin: 2rem auto;

  .inspector-hero-card {
    container-type: inline-size;
    container-name: hero-card;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    width: 100%;
    padding: 3rem 1.5rem;
    border-radius: 1.5rem;
    background: var(--card);
    border: 1px solid var(--border);
    transition: all 0.25s ease;

    &:hover {
      transform: translateY(-2px);
      border-color: var(--primary);
      box-shadow: 0 16px 32px -8px rgba(37, 99, 235, 0.16);
    }

    .quick-icon-wrap {
      width: 3.5rem;
      height: 3.5rem;
      border-radius: var(--radius-xl);
      margin-bottom: 0.75rem;

      .quick-icon {
        width: 1.75rem;
        height: 1.75rem;
      }
    }

    .quick-title {
      font-size: 1.375rem;
      font-weight: 800;
      color: var(--foreground);
      margin: 0.5rem 0;
    }

    .quick-desc {
      width: 100%;
      max-width: 100%;
      font-size: clamp(0.55rem, 3.1cqw, 0.9375rem);
      line-height: 1.65;
      color: var(--muted-foreground);
      margin: 0;
      text-align: center;
      word-break: normal;
      overflow-wrap: break-word;
    }
  }
}

.kpi-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(1, 1fr);

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1280px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

.quick-cards-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(1, 1fr);

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1280px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

.quick-card {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  background-color: var(--card);
  padding: 1.25rem;
  text-decoration: none;
  color: var(--card-foreground);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: oklch(from var(--primary) l c h / 40%);

    .arrow-icon {
      transform: translateX(-4px);
    }
  }
}

.quick-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.quick-icon-wrap {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  border-radius: var(--radius-lg);
  background-color: oklch(from var(--primary) l c h / 12%);
  color: var(--primary);
  transition: all 0.2s ease;
}

.quick-tag {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  background-color: var(--muted);
  color: var(--muted-foreground);
}

.quick-card:hover .quick-icon-wrap {
  background-color: var(--primary);
  color: var(--primary-foreground);
}

.quick-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.quick-title {
  margin-top: 0.75rem;
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.quick-desc {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  margin-bottom: 0.875rem;
  flex: 1;
  line-height: 1.5;
}

.quick-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border);
  padding-top: 0.625rem;
  margin-top: auto;
}

.quick-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--foreground);
}

.quick-enter {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
}

.arrow-icon {
  width: 0.875rem;
  height: 0.875rem;
  transition: transform 0.2s ease;
}

.quick-card:hover .arrow-icon {
  transform: translateX(-4px);
}

.charts-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}
</style>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from 'src/stores/session';
import { useUnitsStore } from 'src/stores/units';
import type { Unit, UnsealLetter } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import PageHeader from 'src/components/gov/PageHeader.vue';
import WarningManagementView from 'src/components/warnings/WarningManagementView.vue';
import Article27MatchView from 'src/components/warnings/Article27MatchView.vue';
import GracePeriodView from 'src/components/warnings/GracePeriodView.vue';
import UnsealLetterDialog from 'src/components/warnings/UnsealLetterDialog.vue';
import {
  ShieldAlert,
  Scale,
  Hourglass,
  FileCheck,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const unitsStore = useUnitsStore();

const isGeneral = computed(() => sessionStore.session?.role === 'general');

type SubTab = 'management' | 'article27' | 'grace';
const activeTab = ref<SubTab>('management');

// Sync tab with URL query string
watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && ['management', 'article27', 'grace'].includes(newTab as string)) {
      activeTab.value = newTab as SubTab;
    }
  },
  { immediate: true }
);

function switchTab(tab: SubTab): void {
  activeTab.value = tab;
  router.replace({ query: { ...route.query, tab } });
}

// Unseal Letter Dialog State
const showUnsealDialog = ref(false);
const selectedUnitForUnseal = ref<Unit | null>(null);

function openUnsealForUnit(unit: Unit): void {
  selectedUnitForUnseal.value = unit;
  showUnsealDialog.value = true;
}

function openNewUnseal(): void {
  // اگر واحدی از قبل انتخاب نشده بود، اولین واحد پلمپ یا آماده پلمپ به عنوان نمونه انتخاب شود
  const defaultUnit =
    unitsStore.units.find((u) => u.status === 'sealed' || u.status === 'readySeal') ??
    unitsStore.units[0] ??
    null;
  selectedUnitForUnseal.value = defaultUnit;
  showUnsealDialog.value = true;
}

function handleLetterIssued(_letter: UnsealLetter): void {
  // Letter handled in store
}
</script>

<template>
  <div class="warnings-page" data-testid="warnings-page">
    <PageHeader
      title="مدیریت اخطار، پلمپ و تطبیق‌های قانونی"
      :desc="isGeneral ? 'دسترسی کامل نظارتی و قضایی' : 'دسترسی محدود به پرونده‌های اتحادیه'"
    >
      <button
        v-if="isGeneral"
        class="action-btn-primary"
        @click="openNewUnseal"
        data-testid="open-unseal-dialog-btn"
      >
        <FileCheck class="icon-sm" />
        <span>صدور منع پیگیری و فک پلمپ</span>
      </button>
    </PageHeader>

    <!-- Sub-module Navigation Tabs -->
    <div class="submodules-tabs-wrap" dir="rtl">
      <button
        type="button"
        :class="['submodule-tab-btn', { 'is-active': activeTab === 'management' }]"
        @click="switchTab('management')"
        data-testid="tab-warning-management"
      >
        <ShieldAlert class="tab-icon" />
        <span class="tab-title">سامانه مدیریت اخطارها</span>
        <span class="tab-counter">{{ fa(unitsStore.units.length) }}</span>
      </button>

      <button
        type="button"
        :class="['submodule-tab-btn', { 'is-active': activeTab === 'article27' }]"
        @click="switchTab('article27')"
        data-testid="tab-article27"
      >
        <Scale class="tab-icon" />
        <span class="tab-title">تطبیق اخطارهای ماده ۲۷</span>
        <span class="tab-counter">{{ fa(unitsStore.article27Matches.length) }}</span>
      </button>

      <button
        type="button"
        :class="['submodule-tab-btn', { 'is-active': activeTab === 'grace' }]"
        @click="switchTab('grace')"
        data-testid="tab-grace-period"
      >
        <Hourglass class="tab-icon" />
        <span class="tab-title">تطبیق هوشمند امهال</span>
        <span class="tab-counter">{{ fa(unitsStore.graceUnits.length) }}</span>
      </button>
    </div>

    <!-- Active Sub-Module View -->
    <div class="submodule-content">
      <WarningManagementView
        v-if="activeTab === 'management'"
        @issue-unseal="openUnsealForUnit"
      />

      <Article27MatchView v-else-if="activeTab === 'article27'" />

      <GracePeriodView v-else-if="activeTab === 'grace'" />
    </div>

    <!-- Unseal Letter Modal Dialog -->
    <UnsealLetterDialog
      v-model="showUnsealDialog"
      :unit="selectedUnitForUnseal"
      @issued="handleLetterIssued"
    />
  </div>
</template>

<style scoped lang="scss">
.warnings-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.action-btn-primary {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: var(--radius-md);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.9;
  }
}

.submodules-tabs-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  background-color: var(--muted);
  padding: 0.375rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.submodule-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-radius: var(--radius-md);
  border: none;
  background: none;
  color: var(--muted-foreground);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: var(--foreground);
    background-color: oklch(from var(--card) l c h / 50%);
  }

  &.is-active {
    background-color: var(--card);
    color: var(--foreground);
    font-weight: 700;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);

    .tab-icon {
      color: var(--primary);
    }

    .tab-counter {
      background-color: oklch(from var(--primary) l c h / 12%);
      color: var(--primary);
    }
  }
}

.tab-icon {
  width: 1.125rem;
  height: 1.125rem;
}

.tab-counter {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  background-color: oklch(from var(--muted-foreground) l c h / 20%);
  color: var(--muted-foreground);
  font-weight: 600;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.submodule-content {
  width: 100%;
}
</style>

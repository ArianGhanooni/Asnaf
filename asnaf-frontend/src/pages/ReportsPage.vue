<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSessionStore } from 'src/stores/session';
import { reportModules } from 'src/utils/data';
import { fa } from 'src/utils/fa';
import { useQuasar } from 'quasar';
import PageHeader from 'src/components/gov/PageHeader.vue';
import PanelCard from 'src/components/gov/PanelCard.vue';
import ReportBody from 'src/components/gov/ReportBody.vue';
import ExecutivePresentationDialog from 'src/components/reports/ExecutivePresentationDialog.vue';
import { Download, Presentation } from 'lucide-vue-next';

const $q = useQuasar();
const route = useRoute();
const sessionStore = useSessionStore();
const isUnion = computed(() => sessionStore.session?.role === 'union');
const unionAllowed = [0, 4, 5, 8, 11];

const showPresentation = ref(false);

const selected = computed(() => {
  const q = Number(route.query.id);
  if (isNaN(q) || q < 0 || q >= reportModules.length) return 0;
  if (isUnion.value && !unionAllowed.includes(q)) return 0;
  return q;
});

function exportExcel(): void {
  $q.notify({
    type: 'positive',
    message: `فایل اکسل ${reportModules[selected.value]} آماده شد`,
    position: 'top',
  });
}

function presentationMode(): void {
  showPresentation.value = true;
}
</script>

<template>
  <div class="reports-page" data-testid="reports-page">
    <PageHeader
      title="مرکز گزارشات و تحلیل‌ها"
      :desc="isUnion ? 'دسترسی محدود (گزارش اتحادیه)' : `ماژول فعال: ${reportModules[selected]}`"
    >
      <button class="action-btn-outline" @click="exportExcel" data-testid="export-excel-btn">
        <Download class="icon-sm" />
        <span>خروجی Excel</span>
      </button>
      <button v-if="!isUnion" class="action-btn-primary" @click="presentationMode" data-testid="presentation-mode-btn">
        <Presentation class="icon-sm" />
        <span>ارائه مدیریتی</span>
      </button>
    </PageHeader>

    <ExecutivePresentationDialog v-model="showPresentation" />

    <!-- Full Width Active Report View -->
    <div class="report-content-area">
      <PanelCard :title="reportModules[selected] ?? ''">
        <ReportBody :selected-index="selected" />
      </PanelCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
.reports-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.action-btn-outline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--muted);
    border-color: var(--primary);
  }
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
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.9;
  }
}

.report-content-area {
  width: 100%;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}
</style>

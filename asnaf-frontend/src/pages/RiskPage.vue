<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUnitsStore } from 'src/stores/units';
import type { RiskInput } from 'src/types/asnaf';
import { evaluateRisk } from 'src/utils/risk';
import { fa } from 'src/utils/fa';
import PageHeader from 'src/components/gov/PageHeader.vue';
import PanelCard from 'src/components/gov/PanelCard.vue';
import RiskPill from 'src/components/gov/RiskPill.vue';
import StatusPill from 'src/components/gov/StatusPill.vue';

const unitsStore = useUnitsStore();

const flags: { k: keyof RiskInput; label: string }[] = [
  { k: 'noLicense', label: 'x₁ · فاقد پروانه کسب' },
  { k: 'nonCooperation', label: 'x₃ · عدم همکاری در بازرسی' },
  { k: 'noSign', label: 'x₄ · نداشتن تابلو / شناسه' },
  { k: 'warningExpired', label: 'x₅ · انقضای مهلت و عدم اقدام' },
];

const riskInput = ref<RiskInput>({
  noLicense: true,
  complaints: 1,
  nonCooperation: false,
  noSign: false,
  warningExpired: false,
});

const evaluation = computed(() => evaluateRisk(riskInput.value));

const rankedUnits = computed(() => {
  return unitsStore.units
    .map((u) => ({ u, r: evaluateRisk(u.risk) }))
    .sort((a, b) => b.r.score - a.r.score);
});

const barColorClass = computed(() => {
  const level = evaluation.value.level;
  if (level === 'low') return 'bg-success';
  if (level === 'medium') return 'bg-accent';
  if (level === 'high') return 'bg-warning';
  return 'bg-destructive';
});
</script>

<template>
  <div class="risk-page">
    <PageHeader
      title="موتور رتبه‌بندی فازی ریسک اصناف"
      desc="متغیرهای زبانی و قواعد اگر–آنگاه برای تعیین اولویت سرکشی"
    />

    <div class="risk-grid">
      <!-- Risk Simulator -->
      <PanelCard title="شبیه‌ساز ریسک">
        <div class="simulator-body">
          <div
            v-for="f in flags"
            :key="f.k"
            class="flag-row"
          >
            <label :for="f.k" class="flag-label">{{ f.label }}</label>
            <q-toggle
              :id="f.k"
              v-model="riskInput[f.k]"
              color="primary"
              dense
            />
          </div>

          <div class="complaints-section">
            <div class="complaints-header">
              <label class="flag-label">x₂ · تعداد شکایات سیمبا</label>
              <span class="complaints-val">{{ fa(riskInput.complaints) }}</span>
            </div>
            <q-slider
              v-model="riskInput.complaints"
              :min="0"
              :max="10"
              :step="1"
              color="primary"
              label
              reverse
            />
          </div>

          <div class="meter-box">
            <div class="meter-header">
              <span class="meter-label">شاخص ریسک خروجی (R)</span>
              <RiskPill :level="evaluation.level" />
            </div>

            <p class="meter-score">
              {{ fa(evaluation.score) }}
              <span class="meter-max"> / ۱۰۰</span>
            </p>

            <div class="meter-track">
              <div
                :class="['meter-bar', barColorClass]"
                :style="{ width: `${evaluation.score}%` }"
              />
            </div>

            <p class="meter-action">
              اقدام پیشنهادی: <b>{{ evaluation.action }}</b>
            </p>
          </div>
        </div>
      </PanelCard>

      <!-- Ranked Units Table -->
      <PanelCard title="اولویت سرکشی واحدها">
        <!-- Desktop Table -->
        <div class="desktop-table-wrapper">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>رتبه</th>
                  <th>واحد</th>
                  <th>شکایات</th>
                  <th>ریسک</th>
                  <th>اقدام</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="({ u, r }, i) in rankedUnits" :key="u.id">
                  <td class="font-bold">{{ fa(i + 1) }}</td>
                  <td>
                    <p class="unit-name">{{ u.name }}</p>
                    <p class="unit-id">{{ fa(u.id) }}</p>
                  </td>
                  <td>{{ fa(u.risk.complaints) }}</td>
                  <td>
                    <RiskPill :level="r.level" :score="r.score" />
                  </td>
                  <td class="action-text">{{ r.action }}</td>
                  <td>
                    <StatusPill :status="u.status" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Mobile Cards -->
        <div class="mobile-risk-cards" dir="rtl">
          <div
            v-for="({ u, r }, i) in rankedUnits"
            :key="u.id"
            class="mobile-risk-card"
            :data-testid="`risk-card-${u.id}`"
          >
            <div class="card-head-row">
              <div class="rank-unit-group">
                <span class="rank-tag">{{ fa(i + 1) }}</span>
                <div class="unit-text">
                  <span class="unit-title">{{ u.name }}</span>
                  <span class="unit-code">{{ fa(u.id) }}</span>
                </div>
              </div>
              <StatusPill :status="u.status" />
            </div>

            <div class="card-middle-row">
              <div class="risk-pill-box">
                <span class="box-label">سطح ریسک:</span>
                <RiskPill :level="r.level" :score="r.score" />
              </div>
              <div class="complaints-count-box">
                <span class="box-label">شکایات:</span>
                <strong class="count-num">{{ fa(u.risk.complaints) }} مورد</strong>
              </div>
            </div>

            <div class="card-action-box">
              <span class="action-label">اقدام پیشنهادی:</span>
              <span class="action-desc">{{ r.action }}</span>
            </div>
          </div>
        </div>
      </PanelCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
.risk-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.risk-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  max-width: 100%;

  @media (min-width: 1280px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  }
}

.simulator-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.flag-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flag-label {
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.complaints-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.complaints-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.complaints-val {
  font-weight: 700;
}

.meter-box {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background-color: oklch(from var(--muted) l c h / 50%);
  padding: 1rem;
}

.meter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.meter-label {
  font-size: 0.875rem;
  color: var(--muted-foreground);
}

.meter-score {
  margin-top: 0.5rem;
  font-size: 2.25rem;
  font-weight: 800;
  margin-bottom: 0;
}

.meter-max {
  font-size: 1rem;
  font-weight: 400;
  color: var(--muted-foreground);
}

.meter-track {
  margin-top: 0.75rem;
  height: 0.5rem;
  border-radius: 9999px;
  background-color: var(--secondary);
  overflow: hidden;
}

.meter-bar {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.3s ease;

  &.bg-success {
    background-color: var(--success);
  }
  &.bg-accent {
    background-color: var(--chart-2);
  }
  &.bg-warning {
    background-color: var(--warning);
  }
  &.bg-destructive {
    background-color: var(--destructive);
  }
}

.meter-action {
  margin-top: 0.75rem;
  font-size: 0.875rem;
  margin-bottom: 0;
}

.desktop-table-wrapper {
  display: block;
  width: 100%;

  @media (max-width: 768px) {
    display: none !important;
  }
}

.mobile-risk-cards {
  display: none !important;
  flex-direction: column;
  gap: 0.875rem;

  @media (max-width: 768px) {
    display: flex !important;
  }
}

.mobile-risk-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0.875rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .card-head-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .rank-unit-group {
    display: flex;
    align-items: center;
    gap: 0.625rem;

    .rank-tag {
      background: var(--primary);
      color: var(--primary-foreground);
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .unit-text {
      display: flex;
      flex-direction: column;

      .unit-title {
        font-weight: 700;
        font-size: 0.9375rem;
        color: var(--foreground);
      }
      .unit-code {
        font-size: 0.75rem;
        color: var(--muted-foreground);
        font-family: monospace;
      }
    }
  }

  .card-middle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.5rem;
    border-top: 1px dashed var(--border);
    font-size: 0.8125rem;

    .box-label {
      color: var(--muted-foreground);
      margin-inline-end: 0.375rem;
    }

    .risk-pill-box,
    .complaints-count-box {
      display: flex;
      align-items: center;
    }

    .count-num {
      color: var(--foreground);
    }
  }

  .card-action-box {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    background: var(--muted);
    padding: 0.375rem 0.625rem;
    border-radius: var(--radius-sm);

    .action-label {
      color: var(--muted-foreground);
      font-weight: 600;
      flex-shrink: 0;
    }

    .action-desc {
      color: var(--foreground);
      font-weight: 500;
    }
  }
}

.table-responsive {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.data-table {
  width: 100%;
  min-width: 38rem;
  border-collapse: collapse;
  font-size: 0.875rem;
  text-align: right;

  th {
    padding: 0.75rem 0.75rem;
    font-weight: 600;
    color: var(--muted-foreground);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  td {
    padding: 0.75rem 0.75rem;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
    white-space: nowrap;
  }
}

.font-bold {
  font-weight: 700;
  white-space: nowrap;
}

.unit-name {
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
}

.unit-id {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0.125rem 0 0;
  white-space: nowrap;
}

.action-text {
  font-size: 0.875rem;
  white-space: nowrap;
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import type { GracePeriodUnit, GraceStatus } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import { useQuasar } from 'quasar';
import PanelCard from 'src/components/gov/PanelCard.vue';
import {
  Hourglass,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  PlusCircle,
  ShieldAlert,
  Search,
  User,
  Phone,
  Calendar,
  Building2,
} from 'lucide-vue-next';

const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

const q = ref('');
const statusFilter = ref<string>('all');

const totalGrace = computed(() => unitsStore.graceUnits.length);
const inGraceCount = computed(
  () => unitsStore.graceUnits.filter((g) => g.status === 'in_grace').length
);
const nearExpiryCount = computed(
  () => unitsStore.graceUnits.filter((g) => g.status === 'near_expiry').length
);
const expiredCount = computed(
  () => unitsStore.graceUnits.filter((g) => g.status === 'expired').length
);

const statusLabels: Record<GraceStatus, { label: string; class: string }> = {
  in_grace: { label: 'در مهلت قانونی', class: 'tone-success' },
  near_expiry: { label: 'در آستانه انقضا', class: 'tone-warning' },
  expired: { label: 'مهلت پایان‌یافته', class: 'tone-destructive' },
  extended: { label: 'تمدید شده', class: 'tone-accent' },
};

const filteredGraceUnits = computed(() => {
  return unitsStore.graceUnits.filter((item) => {
    if (statusFilter.value !== 'all' && item.status !== statusFilter.value) {
      return false;
    }
    const query = q.value.trim().toLowerCase();
    if (query) {
      const match = [
        String(item.unitId),
        item.unitName,
        item.operator,
        item.mobile,
        item.union,
      ].some((v) => v.toLowerCase().includes(query));
      if (!match) return false;
    }
    return true;
  });
});

function handleSendSms(item: GracePeriodUnit): void {
  const userName = sessionStore.session?.name ?? 'سیستم';
  unitsStore.sendGraceSms(item.id, userName);
  $q.notify({
    type: 'positive',
    message: `پیامک تذکر امهال برای متصدی ${item.operator} (${fa(item.mobile)}) ارسال شد.`,
    position: 'top',
  });
}

function handleExtendGrace(item: GracePeriodUnit): void {
  const userName = sessionStore.session?.name ?? 'سیستم';
  unitsStore.extendGrace(item.id, 7, userName);
  $q.notify({
    type: 'info',
    message: `مهلت امهال واحد ${item.unitName} به مدت ۷ روز دیگر تمدید شد.`,
    position: 'top',
  });
}

function handleReferToSeal(item: GracePeriodUnit): void {
  const userName = sessionStore.session?.name ?? 'سیستم';
  unitsStore.referToSeal(item.id, userName);
  $q.notify({
    type: 'negative',
    message: `واحد ${item.unitName} به علت انقضای مهلت به صف آماده پلمپ منتقل شد.`,
    position: 'top',
  });
}
</script>

<template>
  <div class="grace-period-view" data-testid="grace-period-view">
    <!-- KPI Header Cards -->
    <div class="kpi-grid">
      <div class="kpi-card tone-total">
        <Hourglass class="kpi-icon text-muted-foreground" />
        <div class="kpi-info">
          <span class="kpi-label">کل واحدهای دارای امهال</span>
          <strong class="kpi-value">{{ fa(totalGrace) }} واحد</strong>
        </div>
      </div>

      <div class="kpi-card tone-active">
        <Clock class="kpi-icon text-success" />
        <div class="kpi-info">
          <span class="kpi-label">در حال سپری شدن مهلت</span>
          <strong class="kpi-value">{{ fa(inGraceCount) }} واحد</strong>
        </div>
      </div>

      <div class="kpi-card tone-near">
        <AlertTriangle class="kpi-icon text-warning" />
        <div class="kpi-info">
          <span class="kpi-label">هشدار انقضا (زیر ۳ روز)</span>
          <strong class="kpi-value">{{ fa(nearExpiryCount) }} واحد</strong>
        </div>
      </div>

      <div class="kpi-card tone-expired">
        <ShieldAlert class="kpi-icon text-destructive" />
        <div class="kpi-info">
          <span class="kpi-label">منقضی‌شده (ارجاع به پلمپ)</span>
          <strong class="kpi-value">{{ fa(expiredCount) }} واحد</strong>
        </div>
      </div>
    </div>

    <!-- Filter Card -->
    <PanelCard>
      <div class="filter-row">
        <div class="search-input-wrap">
          <Search class="search-icon" />
          <input
            v-model="q"
            type="text"
            placeholder="جستجو بر اساس شناسه واحد، نام متصدی، نام کسب‌وکار یا شماره موبایل..."
            class="filter-input pr-9"
          />
        </div>

        <select v-model="statusFilter" class="filter-select">
          <option value="all">همه وضعیت‌ها</option>
          <option value="in_grace">در مهلت قانونی</option>
          <option value="near_expiry">در آستانه انقضا</option>
          <option value="expired">مهلت پایان‌یافته</option>
          <option value="extended">تمدید شده</option>
        </select>
      </div>
    </PanelCard>

    <!-- Grace Period Units Table -->
    <PanelCard title="تطبیق و نظارت هوشمند بر امهال‌های قانونی اصناف">
      <!-- Desktop Table View -->
      <div class="desktop-table-wrapper">
        <div class="table-responsive">
          <table class="data-table">
          <thead>
            <tr>
              <th>شناسه</th>
              <th>واحد صنفی / اتحادیه</th>
              <th>متصدی و شماره تماس</th>
              <th>تاریخ شروع امهال</th>
              <th>کل مهلت</th>
              <th>روزهای باقیمانده</th>
              <th>وضعیت مهلت</th>
              <th>پیامک اطلاع‌رسانی</th>
              <th>عملیات هوشمند</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredGraceUnits" :key="item.id">
              <td class="font-bold">{{ fa(item.unitId) }}</td>
              <td>
                <p class="unit-name">{{ item.unitName }}</p>
                <p class="unit-union">{{ item.union }}</p>
              </td>
              <td>
                <p class="operator-name">{{ item.operator }}</p>
                <p class="operator-mobile">{{ fa(item.mobile) }}</p>
              </td>
              <td class="date-cell">{{ item.graceStartDate }}</td>
              <td>{{ fa(item.graceDays) }} روز</td>
              <td>
                <div class="countdown-wrap">
                  <div class="countdown-bar-bg">
                    <div
                      class="countdown-bar-fill"
                      :class="[
                        item.daysRemaining > 5
                          ? 'fill-success'
                          : item.daysRemaining > 0
                          ? 'fill-warning'
                          : 'fill-danger',
                      ]"
                      :style="{
                        width: `${Math.min(100, Math.max(0, (item.daysRemaining / item.graceDays) * 100))}%`,
                      }"
                    />
                  </div>
                  <span
                    :class="[
                      'days-text',
                      item.daysRemaining === 0 ? 'text-destructive font-bold' : '',
                    ]"
                  >
                    {{ item.daysRemaining === 0 ? 'پایان مهلت' : `${fa(item.daysRemaining)} روز` }}
                  </span>
                </div>
              </td>
              <td>
                <span :class="['status-pill', statusLabels[item.status].class]">
                  {{ statusLabels[item.status].label }}
                </span>
              </td>
              <td>
                <span v-if="item.smsNotified" class="sms-badge sent">
                  <CheckCircle2 class="icon-xs" />
                  <span>ارسال شده</span>
                </span>
                <span v-else class="sms-badge not-sent">
                  <span>ارسال نشده</span>
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <!-- تذکر پیامکی -->
                  <button
                    type="button"
                    class="btn-icon-action"
                    title="ارسال مجدد پیامک تذکر امهال"
                    @click="handleSendSms(item)"
                  >
                    <Send class="icon-sm" />
                  </button>
                  <!-- تمدید مهلت -->
                  <button
                    type="button"
                    class="btn-icon-action text-accent"
                    title="تمدید مهلت قانونی (+۷ روز)"
                    @click="handleExtendGrace(item)"
                  >
                    <PlusCircle class="icon-sm" />
                  </button>
                  <!-- ارجاع به پلمپ -->
                  <button
                    type="button"
                    class="btn-icon-action text-destructive"
                    title="انقضا و ارجاع فوری به پلمپ"
                    @click="handleReferToSeal(item)"
                  >
                    <ShieldAlert class="icon-sm" />
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="filteredGraceUnits.length === 0">
              <td colspan="9" class="empty-state">
                هیچ واحدی در فهرست امهال با معیارهای جستجو یافت نشد.
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <!-- Mobile Cards View for Screens <= 768px -->
      <div class="mobile-cards-wrapper" dir="rtl">
        <div
          v-for="item in filteredGraceUnits"
          :key="`mobile-${item.id}`"
          class="mobile-grace-card"
          data-testid="grace-mobile-card"
        >
          <!-- Card Header -->
          <div class="card-head">
            <div class="card-head-top">
              <div class="card-id-badge">
                <span class="id-label">شناسه پرونده:</span>
                <span class="id-val font-bold">{{ fa(item.unitId) }}</span>
              </div>
              <span :class="['status-pill', statusLabels[item.status].class]">
                {{ statusLabels[item.status].label }}
              </span>
            </div>
            <h4 class="card-unit-title">{{ item.unitName }}</h4>
            <p class="card-union-sub">{{ item.union }}</p>
          </div>

          <!-- Countdown Progress Section -->
          <div class="card-countdown-box">
            <div class="countdown-head">
              <span class="countdown-label">مهلت قانونی امهال:</span>
              <span
                :class="[
                  'days-badge',
                  item.daysRemaining > 5 ? 'tone-success' : item.daysRemaining > 0 ? 'tone-warning' : 'tone-danger',
                ]"
              >
                {{ item.daysRemaining === 0 ? 'پایان مهلت' : `${fa(item.daysRemaining)} روز باقیمانده` }}
              </span>
            </div>
            <div class="countdown-bar-bg">
              <div
                class="countdown-bar-fill"
                :class="[
                  item.daysRemaining > 5
                    ? 'fill-success'
                    : item.daysRemaining > 0
                    ? 'fill-warning'
                    : 'fill-danger',
                ]"
                :style="{
                  width: `${Math.min(100, Math.max(0, (item.daysRemaining / item.graceDays) * 100))}%`,
                }"
              />
            </div>
            <div class="countdown-meta-row">
              <span>شروع: {{ item.graceStartDate }}</span>
              <span>کل مهلت: {{ fa(item.graceDays) }} روز</span>
            </div>
          </div>

          <!-- Card Body Details -->
          <div class="card-body-details">
            <div class="card-info-item">
              <User class="icon-xxs text-muted" />
              <span class="info-label">متصدی:</span>
              <span class="info-val font-medium">{{ item.operator }}</span>
            </div>

            <div class="card-info-item">
              <Phone class="icon-xxs text-muted" />
              <span class="info-label">تماس:</span>
              <span class="info-val" dir="ltr">{{ fa(item.mobile) }}</span>
            </div>

            <div class="card-info-item">
              <span class="info-label">پیامک اطلاع‌رسانی:</span>
              <span v-if="item.smsNotified" class="sms-badge sent">
                <CheckCircle2 class="icon-xs" />
                <span>ارسال شده</span>
              </span>
              <span v-else class="sms-badge not-sent">
                <span>ارسال نشده</span>
              </span>
            </div>
          </div>

          <!-- Card Actions -->
          <div class="card-actions-bar">
            <button
              type="button"
              class="mobile-action-btn"
              title="ارسال مجدد پیامک تذکر امهال"
              @click="handleSendSms(item)"
            >
              <Send class="icon-xs" />
              <span>ارسال پیامک</span>
            </button>

            <button
              type="button"
              class="mobile-action-btn accent-btn"
              title="تمدید مهلت قانونی (+۷ روز)"
              @click="handleExtendGrace(item)"
            >
              <PlusCircle class="icon-xs" />
              <span>تمدید مهلت</span>
            </button>

            <button
              type="button"
              class="mobile-action-btn danger-btn"
              title="انقضا و ارجاع فوری به پلمپ"
              @click="handleReferToSeal(item)"
            >
              <ShieldAlert class="icon-xs" />
              <span>ارجاع به پلمپ</span>
            </button>
          </div>
        </div>

        <div v-if="filteredGraceUnits.length === 0" class="empty-state shadow-card">
          هیچ واحدی در فهرست امهال با معیارهای جستجو یافت نشد.
        </div>
      </div>
    </PanelCard>
  </div>
</template>

<style scoped lang="scss">
.grace-period-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.kpi-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(1, 1fr);

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background-color: var(--card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .kpi-icon {
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
  }

  .kpi-info {
    display: flex;
    flex-direction: column;
  }

  .kpi-label {
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }

  .kpi-value {
    font-size: 1.125rem;
    font-weight: 700;
  }
}

.filter-row {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: 3fr 1fr;
  }
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  right: 0.75rem;
  width: 1rem;
  height: 1rem;
  color: var(--muted-foreground);
  pointer-events: none;
}

.filter-input {
  width: 100%;
  height: 2.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding: 0 0.75rem;
  font-size: 0.8125rem;
  outline: none;

  &.pr-9 {
    padding-inline-end: 2.25rem;
  }

  &:focus {
    border-color: var(--primary);
  }
}

.filter-select {
  height: 2.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding: 0 0.75rem;
  font-size: 0.8125rem;
  outline: none;
}

.data-table {
  width: 100%;
  min-width: 58rem;
  border-collapse: collapse;
  font-size: 0.8125rem;
  text-align: right;

  th {
    padding: 0.75rem;
    font-weight: 600;
    color: var(--muted-foreground);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
    background-color: oklch(from var(--muted) l c h / 30%);
  }

  td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }
}

.unit-name {
  font-weight: 600;
  margin: 0;
}

.unit-union {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  margin: 0.125rem 0 0;
}

.operator-name {
  font-weight: 600;
  margin: 0;
}

.operator-mobile {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  direction: ltr;
  text-align: right;
  margin: 0.125rem 0 0;
}

.countdown-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 6rem;
}

.countdown-bar-bg {
  width: 100%;
  height: 0.375rem;
  border-radius: 9999px;
  background-color: var(--muted);
  overflow: hidden;
}

.countdown-bar-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.3s ease;

  &.fill-success {
    background-color: var(--success);
  }
  &.fill-warning {
    background-color: var(--warning);
  }
  &.fill-danger {
    background-color: var(--destructive);
  }
}

.days-text {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.status-pill {
  display: inline-block;
  padding: 0.1875rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;

  &.tone-success {
    background-color: oklch(from var(--success) l c h / 15%);
    color: var(--success);
  }
  &.tone-warning {
    background-color: oklch(from var(--warning) l c h / 20%);
    color: var(--warning-foreground);
  }
  &.tone-destructive {
    background-color: oklch(from var(--destructive) l c h / 12%);
    color: var(--destructive);
  }
  &.tone-accent {
    background-color: var(--accent);
    color: var(--accent-foreground);
  }
}

.sms-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);

  &.sent {
    background-color: oklch(from var(--success) l c h / 12%);
    color: var(--success);
  }
  &.not-sent {
    background-color: var(--muted);
    color: var(--muted-foreground);
  }
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-icon-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: none;
  color: var(--muted-foreground);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }

  &.text-accent {
    color: var(--primary);
    &:hover {
      background-color: oklch(from var(--primary) l c h / 12%);
    }
  }

  &.text-destructive {
    color: var(--destructive);
    &:hover {
      background-color: oklch(from var(--destructive) l c h / 10%);
    }
  }
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.icon-xs {
  width: 0.8125rem;
  height: 0.8125rem;
}

.desktop-table-wrapper {
  display: block;

  @media (max-width: 768px) {
    display: none !important;
  }
}

.mobile-cards-wrapper {
  display: none !important;

  @media (max-width: 768px) {
    display: flex !important;
    flex-direction: column;
    gap: 0.875rem;
  }
}

.mobile-grace-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background-color: var(--card);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
}

.card-head {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.card-head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.card-id-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;

  .id-label {
    color: var(--muted-foreground);
  }

  .id-val {
    color: var(--foreground);
  }
}

.card-unit-title {
  font-size: 0.9375rem;
  font-weight: 700;
  margin: 0.25rem 0 0;
  color: var(--foreground);
}

.card-union-sub {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0;
}

.card-countdown-box {
  background-color: var(--muted);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.countdown-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;

  .countdown-label {
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }
}

.days-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full, 9999px);

  &.tone-success {
    background-color: oklch(from var(--success) l c h / 15%);
    color: var(--success);
  }
  &.tone-warning {
    background-color: oklch(from var(--warning) l c h / 15%);
    color: var(--warning);
  }
  &.tone-danger {
    background-color: oklch(from var(--destructive) l c h / 12%);
    color: var(--destructive);
  }
}

.countdown-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.card-body-details {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.75rem;
  padding: 0 0.25rem;
}

.card-info-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;

  .info-label {
    color: var(--muted-foreground);
  }

  .info-val {
    color: var(--foreground);
  }
}

.card-actions-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-top: 0.25rem;
  border-top: 1px dashed var(--border);
}

.mobile-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.45rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--muted);
  }

  &.accent-btn {
    color: var(--primary);
    border-color: rgba(59, 130, 246, 0.3);
    background-color: rgba(59, 130, 246, 0.05);

    &:hover {
      background-color: rgba(59, 130, 246, 0.15);
    }
  }

  &.danger-btn {
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.3);
    background-color: rgba(239, 68, 68, 0.05);

    &:hover {
      background-color: rgba(239, 68, 68, 0.15);
    }
  }
}

.icon-xxs {
  width: 0.8125rem;
  height: 0.8125rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 0;
  color: var(--muted-foreground);
}
</style>

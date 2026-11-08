<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUnitsStore } from 'src/stores/units';
import type { SmsLogEntry } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Smartphone,
  User,
  Calendar,
  Building2,
} from 'lucide-vue-next';

const unitsStore = useUnitsStore();

const q = ref('');
const statusFilter = ref<string>('all');
const gatewayFilter = ref<string>('all');

const templateLabels: Record<string, string> = {
  warning: 'اخطار اماکن',
  grace_notice: 'تذکر امهال',
  summons: 'احضاریه قانونی',
  unseal: 'دستور فک پلمپ',
};

const deliveryLabels: Record<string, { label: string; class: string }> = {
  delivered: { label: 'تحویل به گیرنده', class: 'tone-success' },
  sent: { label: 'ارسال شده به اپراتور', class: 'tone-accent' },
  failed: { label: 'ناموفق در ارسال', class: 'tone-destructive' },
  blacklisted: { label: 'بلک‌لیست تبلیغاتی', class: 'tone-warning' },
};

const totalSms = computed(() => unitsStore.smsLogs.length);
const deliveredCount = computed(
  () => unitsStore.smsLogs.filter((s) => s.deliveryStatus === 'delivered').length
);
const failedCount = computed(
  () => unitsStore.smsLogs.filter((s) => s.deliveryStatus === 'failed' || s.deliveryStatus === 'blacklisted').length
);

const filteredLogs = computed(() => {
  return unitsStore.smsLogs.filter((item) => {
    if (statusFilter.value !== 'all' && item.deliveryStatus !== statusFilter.value) {
      return false;
    }
    if (gatewayFilter.value !== 'all' && item.gateway !== gatewayFilter.value) {
      return false;
    }
    const query = q.value.trim().toLowerCase();
    if (query) {
      const match = [
        item.id,
        item.recipientMobile,
        item.recipientName,
        item.unitName,
        item.messageSnippet,
      ].some((val) => val.toLowerCase().includes(query));
      if (!match) return false;
    }
    return true;
  });
});
</script>

<template>
  <div class="sms-status-report-wrap" data-testid="sms-status-report">
    <!-- Top Mini Stats -->
    <div class="kpi-mini-grid">
      <div class="kpi-box">
        <MessageSquare class="icon-md text-muted-foreground" />
        <div>
          <span class="box-label">کل پیامک‌های ارسالی</span>
          <strong class="box-val">{{ fa(totalSms) }} پیامک</strong>
        </div>
      </div>

      <div class="kpi-box">
        <CheckCircle2 class="icon-md text-success" />
        <div>
          <span class="box-label">تحویل قطعی به متصدی</span>
          <strong class="box-val">{{ fa(deliveredCount) }} مورد ({{ fa(Math.round((deliveredCount / (totalSms || 1)) * 100)) }}٪)</strong>
        </div>
      </div>

      <div class="kpi-box">
        <AlertCircle class="icon-md text-destructive" />
        <div>
          <span class="box-label">خطای تحویل / بلک‌لیست</span>
          <strong class="box-val">{{ fa(failedCount) }} مورد</strong>
        </div>
      </div>
    </div>

    <!-- Filters Row -->
    <div class="filter-row">
      <div class="search-wrap">
        <Search class="search-icon" />
        <input
          v-model="q"
          type="text"
          placeholder="جستجو با شماره موبایل، نام متصدی، واحد یا متن پیامک..."
          class="filter-input pr-9"
        />
      </div>

      <select v-model="statusFilter" class="filter-select">
        <option value="all">همه وضعیت‌های تحویل</option>
        <option value="delivered">تحویل شده</option>
        <option value="sent">ارسال شده</option>
        <option value="failed">ناموفق</option>
        <option value="blacklisted">بلک‌لیست</option>
      </select>

      <select v-model="gatewayFilter" class="filter-select">
        <option value="all">همه درگاه‌ها (گیت‌وی)</option>
        <option value="Magfa">مگفا (Magfa)</option>
        <option value="Kavenegar">کاوه‌نگار (Kavenegar)</option>
      </select>
    </div>

    <!-- Desktop Table View -->
    <div class="desktop-table-wrapper">
      <div class="table-responsive">
        <table class="report-table">
        <thead>
          <tr>
            <th>شناسه پیام</th>
            <th>گیرنده و موبایل</th>
            <th>واحد صنفی مربوطه</th>
            <th>نوع رویداد</th>
            <th>متن پیامک</th>
            <th>تاریخ و زمان ارسال</th>
            <th>درگاه</th>
            <th>وضعیت تحویل</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in filteredLogs" :key="log.id">
            <td class="font-bold text-muted">{{ log.id }}</td>
            <td>
              <p class="recipient-name">{{ log.recipientName }}</p>
              <p class="recipient-mobile">{{ fa(log.recipientMobile) }}</p>
            </td>
            <td>{{ log.unitName }}</td>
            <td>
              <span class="template-tag">{{ templateLabels[log.templateType] ?? log.templateType }}</span>
            </td>
            <td>
              <p class="snippet-text" :title="log.messageSnippet">{{ log.messageSnippet }}</p>
            </td>
            <td class="date-cell">{{ log.sendTime }}</td>
            <td>
              <span class="gateway-tag">{{ log.gateway }}</span>
            </td>
            <td>
              <span :class="['delivery-pill', deliveryLabels[log.deliveryStatus]?.class ?? '']">
                {{ deliveryLabels[log.deliveryStatus]?.label ?? log.deliveryStatus }}
              </span>
            </td>
          </tr>

          <tr v-if="filteredLogs.length === 0">
            <td colspan="8" class="empty-state">
              هیچ پیامکی منطبق با فیلترهای انتخابی یافت نشد.
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <!-- Mobile Cards View for Screens <= 768px -->
    <div class="mobile-cards-wrapper" dir="rtl">
      <div
        v-for="log in filteredLogs"
        :key="`mobile-${log.id}`"
        class="mobile-sms-card"
        data-testid="sms-log-mobile-card"
      >
        <div class="card-head">
          <div class="card-head-top">
            <div class="recipient-meta">
              <User class="icon-xxs text-muted" />
              <strong class="recipient-name">{{ log.recipientName }}</strong>
              <span class="recipient-mobile" dir="ltr">{{ fa(log.recipientMobile) }}</span>
            </div>
            <span :class="['delivery-pill', deliveryLabels[log.deliveryStatus]?.class ?? '']">
              {{ deliveryLabels[log.deliveryStatus]?.label ?? log.deliveryStatus }}
            </span>
          </div>
          <div class="card-sub-info">
            <span class="unit-name font-semibold">{{ log.unitName }}</span>
            <span class="template-tag">{{ templateLabels[log.templateType] ?? log.templateType }}</span>
          </div>
        </div>

        <div class="sms-content-box">
          <p class="sms-text">{{ log.messageSnippet }}</p>
        </div>

        <div class="card-footer-meta">
          <div class="date-info">
            <Calendar class="icon-xxs text-muted" />
            <span>{{ log.sendTime }}</span>
          </div>
          <span class="gateway-tag">درگاه: {{ log.gateway }}</span>
        </div>
      </div>

      <div v-if="filteredLogs.length === 0" class="empty-state shadow-card">
        هیچ پیامکی منطبق با فیلترهای انتخابی یافت نشد.
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sms-status-report-wrap {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.kpi-mini-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(1, 1fr);

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.kpi-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--card);

  .box-label {
    display: block;
    font-size: 0.6875rem;
    color: var(--muted-foreground);
  }

  .box-val {
    font-size: 0.9375rem;
    font-weight: 700;
  }
}

.filter-row {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: 2fr 1fr 1fr;
  }
}

.search-wrap {
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
  height: 2.375rem;
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
  height: 2.375rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding: 0 0.75rem;
  font-size: 0.8125rem;
  outline: none;
}

.report-table {
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

.recipient-name {
  font-weight: 600;
  margin: 0;
}

.recipient-mobile {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  direction: ltr;
  text-align: right;
  margin: 0.125rem 0 0;
}

.template-tag {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
  background-color: oklch(from var(--primary) l c h / 10%);
  color: var(--primary);
  font-size: 0.6875rem;
  font-weight: 600;
}

.snippet-text {
  max-width: 18rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
  font-size: 0.75rem;
}

.date-cell {
  white-space: nowrap;
  font-size: 0.75rem;
}

.gateway-tag {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.delivery-pill {
  display: inline-block;
  padding: 0.1875rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;

  &.tone-success {
    background-color: oklch(from var(--success) l c h / 15%);
    color: var(--success);
  }
  &.tone-accent {
    background-color: oklch(from var(--accent) l c h / 60%);
    color: var(--accent-foreground);
  }
  &.tone-destructive {
    background-color: oklch(from var(--destructive) l c h / 12%);
    color: var(--destructive);
  }
  &.tone-warning {
    background-color: oklch(from var(--warning) l c h / 20%);
    color: var(--warning-foreground);
  }
}

.icon-md {
  width: 1.5rem;
  height: 1.5rem;
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

.mobile-sms-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background-color: var(--card);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
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

.recipient-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
}

.card-sub-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.sms-content-box {
  background-color: var(--muted);
  border-radius: var(--radius-md);
  padding: 0.625rem 0.75rem;
  font-size: 0.75rem;
  color: var(--foreground);
  line-height: 1.5;

  .sms-text {
    margin: 0;
  }
}

.card-footer-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  padding-top: 0.25rem;
  border-top: 1px dashed var(--border);

  .date-info {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
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

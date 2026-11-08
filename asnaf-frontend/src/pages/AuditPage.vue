<script setup lang="ts">
import { useUnitsStore } from 'src/stores/units';
import { fa } from 'src/utils/fa';
import PageHeader from 'src/components/gov/PageHeader.vue';
import PanelCard from 'src/components/gov/PanelCard.vue';
import { Lock } from 'lucide-vue-next';

const unitsStore = useUnitsStore();

function getActionTone(action: string): 'destructive' | 'warning' | 'primary' {
  if (action.includes('پلمپ')) return 'destructive';
  if (action.includes('اخطار')) return 'warning';
  return 'primary';
}
</script>

<template>
  <div class="audit-page">
    <PageHeader
      title="تاریخچه غیرقابل انکار (Audit Trail)"
      desc="رکوردهای امنیتی و ممیزی سامانه غیرقابل ویرایش یا حذف"
    />

    <PanelCard title="آخرین رویدادها">
      <template #action>
        <span class="chain-badge">
          <Lock class="icon-xs ml-1" />
          <span>امضای زنجیره‌ای فعال</span>
        </span>
      </template>

      <!-- Desktop Table -->
      <div class="desktop-table-wrapper">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>زمان</th>
                <th>کاربر</th>
                <th>اقدام</th>
                <th>موضوع</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(a, i) in unitsStore.auditLog" :key="i">
                <td class="nowrap">{{ a.t }}</td>
                <td>{{ a.user }}</td>
                <td>
                  <span :class="['action-pill', `tone-${getActionTone(a.action)}`]">
                    {{ a.action }}
                  </span>
                </td>
                <td>{{ fa(a.target) }}</td>
                <td class="ip-col" dir="ltr">{{ a.ip }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Cards -->
      <div class="mobile-audit-cards" dir="rtl">
        <div
          v-for="(a, i) in unitsStore.auditLog"
          :key="i"
          class="mobile-audit-card"
        >
          <div class="audit-card-top">
            <span :class="['action-pill', `tone-${getActionTone(a.action)}`]">
              {{ a.action }}
            </span>
            <span class="audit-time">{{ a.t }}</span>
          </div>

          <div class="audit-card-body">
            <div class="audit-field">
              <span class="field-label">موضوع / هدف:</span>
              <strong class="field-val">{{ fa(a.target) }}</strong>
            </div>
            <div class="audit-field">
              <span class="field-label">کاربر اقدام‌کننده:</span>
              <span class="field-val">{{ a.user }}</span>
            </div>
          </div>

          <div class="audit-card-footer">
            <span class="ip-label">نشانی IP:</span>
            <span class="ip-val" dir="ltr">{{ a.ip }}</span>
          </div>
        </div>
      </div>
    </PanelCard>
  </div>
</template>

<style scoped lang="scss">
.audit-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.chain-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 9999px;
  background-color: oklch(from var(--success) l c h / 15%);
  color: var(--success);
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.desktop-table-wrapper {
  display: block;
  width: 100%;

  @media (max-width: 768px) {
    display: none !important;
  }
}

.mobile-audit-cards {
  display: none !important;
  flex-direction: column;
  gap: 0.75rem;

  @media (max-width: 768px) {
    display: flex !important;
  }
}

.mobile-audit-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0.875rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .audit-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;

    .audit-time {
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }
  }

  .audit-card-body {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding-top: 0.375rem;
    border-top: 1px dashed var(--border);

    .audit-field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8125rem;

      .field-label {
        color: var(--muted-foreground);
      }
      .field-val {
        color: var(--foreground);
      }
    }
  }

  .audit-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.75rem;
    padding-top: 0.375rem;
    border-top: 1px dashed var(--border);

    .ip-label {
      color: var(--muted-foreground);
    }
    .ip-val {
      font-family: monospace;
      color: var(--foreground);
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
  min-width: 40rem;
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
    white-space: nowrap;
  }
}

.nowrap {
  white-space: nowrap;
}

.action-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 0.125rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;

  &.tone-destructive {
    background-color: oklch(from var(--destructive) l c h / 12%);
    color: var(--destructive);
  }
  &.tone-warning {
    background-color: oklch(from var(--warning) l c h / 25%);
    color: var(--warning-foreground);
  }
  &.tone-primary {
    background-color: oklch(from var(--primary) l c h / 10%);
    color: var(--primary);
  }
}

.ip-col {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.icon-xs {
  width: 0.75rem;
  height: 0.75rem;
}

.ml-1 {
  margin-left: 0.25rem;
}
</style>

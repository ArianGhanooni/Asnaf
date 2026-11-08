<script setup lang="ts">
import type { Unit } from 'src/types/asnaf';
import { statusLabels } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import {
  Building2,
  User,
  MapPin,
  Calendar,
  AlertTriangle,
  Send,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Eye,
} from 'lucide-vue-next';

interface Props {
  readonly unit: Unit;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'assign-inspection', unit: Unit): void;
  (e: 'view-history', unit: Unit): void;
}>();

function getStatusTone(status: Unit['status']): string {
  switch (status) {
    case 'warning':
      return 'status-warning';
    case 'readySeal':
      return 'status-ready-seal';
    case 'sealed':
      return 'status-sealed';
    case 'licensed':
      return 'status-licensed';
    case 'collect':
      return 'status-collect';
    case 'unsealed':
      return 'status-unsealed';
    default:
      return 'status-default';
  }
}
</script>

<template>
  <article
    class="inspection-card shadow-card"
    :data-testid="`inspection-card-${unit.id}`"
  >
    <!-- ۱. هدر کارت: شناسه واحد، صنف و وضعیت اخطار/پروانه -->
    <div class="card-header-row">
      <div class="id-and-union">
        <span class="unit-id-tag">کد {{ fa(unit.id) }}</span>
        <span class="union-badge">{{ unit.union }}</span>
      </div>

      <span :class="['status-pill', getStatusTone(unit.status)]">
        <CheckCircle2 v-if="unit.status === 'licensed'" class="icon-xxs" />
        <ShieldAlert v-else-if="unit.status === 'readySeal' || unit.status === 'sealed'" class="icon-xxs" />
        <Clock v-else class="icon-xxs" />
        <span>{{ statusLabels[unit.status] || unit.status }}</span>
      </span>
    </div>

    <!-- ۲. نام واحد صنفی و مشخصات متصدی -->
    <div class="card-unit-row">
      <div class="unit-title-group">
        <Building2 class="icon-sm text-primary flex-shrink-0" />
        <div>
          <h3 class="unit-name">{{ unit.name }}</h3>
          <p class="operator-meta">
            متصدی: <strong>{{ unit.operator }}</strong>
            <span v-if="unit.mobile" class="ltr-text">({{ unit.mobile }})</span>
          </p>
        </div>
      </div>
    </div>

    <!-- ۳. آخرین تخلف یا علت سرکشی -->
    <div class="violation-box">
      <div class="violation-head">
        <AlertTriangle class="icon-xs text-warning flex-shrink-0" />
        <strong class="violation-title">وضعیت نظارتی: {{ unit.violation || 'سرکشی دوره‌ای و ماده ۲۷' }}</strong>
      </div>
      <div v-if="unit.warningNo" class="warning-meta">
        <span>شماره اخطار: <strong>{{ unit.warningNo }}</strong></span>
        <span>تاریخ صدور: <strong>{{ fa(unit.date) }}</strong></span>
      </div>
    </div>

    <!-- ۴. نشانی و منطقه شهرداری اهواز -->
    <div class="card-location-row">
      <MapPin class="icon-xs text-danger flex-shrink-0" />
      <span class="location-text">{{ unit.region }} · {{ unit.address }}</span>
    </div>

    <!-- ۵. دکمه‌های عملیات: تخصیص ماموریت و مشاهده سوابق -->
    <div class="card-actions-row">
      <button
        type="button"
        class="action-btn-assign"
        @click="emit('assign-inspection', unit)"
        :data-testid="`assign-unit-inspection-btn-${unit.id}`"
      >
        <Send class="icon-xs" />
        <span>تخصیص بازرس سرکشی</span>
      </button>

      <button
        type="button"
        class="action-btn-history"
        @click="emit('view-history', unit)"
        :data-testid="`view-unit-history-btn-${unit.id}`"
      >
        <Eye class="icon-xs" />
        <span>سوابق نظارتی</span>
      </button>
    </div>
  </article>
</template>

<style scoped lang="scss">
.inspection-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  box-sizing: border-box;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding-block: 1rem;
  padding-inline: 1rem;
  transition: all 0.2s ease;
  overflow: hidden;

  &:hover {
    border-color: var(--primary);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
  }
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border);
  padding-block-end: 0.625rem;
}

.id-and-union {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.unit-id-tag {
  font-family: monospace;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--primary);
  background-color: oklch(from var(--primary) l c h / 12%);
  border: 1px solid oklch(from var(--primary) l c h / 25%);
  padding-block: 0.15rem;
  padding-inline: 0.5rem;
  border-radius: var(--radius-sm);
}

.union-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background-color: var(--secondary);
  border-radius: var(--radius-sm);
  padding-block: 0.15rem;
  padding-inline: 0.4rem;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 9999px;
  padding-block: 0.2rem;
  padding-inline: 0.625rem;
  font-size: 0.6875rem;
  font-weight: 700;

  &.status-warning {
    background-color: rgba(245, 158, 11, 0.18);
    color: #d97706;
  }
  &.status-ready-seal {
    background-color: rgba(239, 68, 68, 0.18);
    color: #dc2626;
  }
  &.status-sealed {
    background-color: rgba(185, 28, 28, 0.2);
    color: #b91c1c;
  }
  &.status-licensed {
    background-color: rgba(34, 197, 94, 0.18);
    color: #16a34a;
  }
  &.status-collect {
    background-color: rgba(168, 85, 247, 0.18);
    color: #9333ea;
  }
  &.status-unsealed {
    background-color: rgba(234, 88, 12, 0.18);
    color: #ea580c;
  }
  &.status-default {
    background-color: var(--secondary);
    color: var(--muted-foreground);
  }
}

.card-unit-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.unit-title-group {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.unit-name {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--foreground);
}

.operator-meta {
  margin: 0.15rem 0 0 0;
  font-size: 0.75rem;
  color: var(--muted-foreground);

  strong {
    color: var(--foreground);
  }
}

.ltr-text {
  direction: ltr;
  display: inline-block;
  margin-inline-start: 0.25rem;
  font-family: monospace;
}

.violation-box {
  background-color: var(--secondary);
  border-radius: var(--radius-md);
  padding: 0.625rem 0.75rem;
  border-inline-start: 3px solid var(--warning);
}

.violation-head {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.violation-title {
  font-size: 0.8125rem;
  color: var(--foreground);
}

.warning-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-block-start: 0.35rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);

  strong {
    color: var(--foreground);
  }
}

.card-location-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.location-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-block-top: 0.25rem;
}

.action-btn-assign,
.action-btn-history {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding-block: 0.45rem;
  padding-inline: 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.action-btn-assign {
  flex: 1;
  background-color: var(--primary);
  color: var(--primary-foreground);

  &:hover {
    filter: brightness(1.1);
  }
}

.action-btn-history {
  background-color: var(--card);
  color: var(--muted-foreground);
  border-color: var(--border);

  &:hover {
    color: var(--foreground);
    border-color: var(--primary);
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

<script setup lang="ts">
import type { SpecializedUnitItem, SpecializedUnionConfig } from 'src/types/specialized';
import { fa } from 'src/utils/fa';
import {
  Building2,
  User,
  MapPin,
  Calendar,
  Send,
  Navigation,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-vue-next';

interface Props {
  readonly unit: SpecializedUnitItem;
  readonly unionConfig: SpecializedUnionConfig;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'view-on-map', unit: SpecializedUnitItem): void;
  (e: 'assign-inspection', unit: SpecializedUnitItem): void;
}>();
</script>

<template>
  <article
    class="specialized-card shadow-card"
    :data-testid="`specialized-card-${unit.id}`"
  >
    <!-- ۱. هدر کارت: کد واحد، رسته و وضعیت انطباق -->
    <div class="card-header-row">
      <div class="id-and-category">
        <span class="unit-id-tag">کد {{ fa(unit.id) }}</span>
        <span class="category-badge">{{ unit.category }}</span>
      </div>

      <span :class="['status-pill', `status-${unit.status}`]">
        <CheckCircle2 v-if="unit.status === 'normal'" class="icon-xxs" />
        <Clock v-else-if="unit.status === 'warning'" class="icon-xxs" />
        <ShieldAlert v-else class="icon-xxs" />
        <span>{{ unit.statusLabel }}</span>
      </span>
    </div>

    <!-- ۲. نام واحد صنفی و متصدی -->
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

    <!-- ۳. شاخص‌های تخصصی صنف -->
    <div class="metrics-box">
      <div class="metric-row">
        <span class="metric-title">{{ unit.metric1Label }}:</span>
        <strong class="metric-value">{{ fa(unit.metric1Value) }}</strong>
      </div>
      <div class="metric-row">
        <span class="metric-title">{{ unit.metric2Label }}:</span>
        <strong class="metric-value">{{ fa(unit.metric2Value) }}</strong>
      </div>
    </div>

    <!-- ۴. نشانی و منطقه -->
    <div class="card-location-row">
      <MapPin class="icon-xs text-danger flex-shrink-0" />
      <span class="location-text">{{ unit.neighborhood }} · {{ unit.address }}</span>
    </div>

    <!-- ۵. آخرین بازرسی -->
    <div class="card-inspection-row">
      <div class="inspection-date">
        <Calendar class="icon-xxs text-muted" />
        <span>آخرین بازرسی: {{ fa(unit.lastInspectionDate) }}</span>
      </div>
      <div v-if="unit.inspectorName" class="inspector-name">
        بازرس: {{ unit.inspectorName }}
      </div>
    </div>

    <!-- ۶. دکمه‌های عملیات -->
    <div class="card-actions-row">
      <button
        type="button"
        class="action-btn-map"
        @click="emit('view-on-map', unit)"
        :data-testid="`card-map-btn-${unit.id}`"
      >
        <Navigation class="icon-xs" />
        <span>نقشه GIS اهواز</span>
      </button>

      <button
        type="button"
        class="action-btn-assign"
        @click="emit('assign-inspection', unit)"
        :data-testid="`card-assign-btn-${unit.id}`"
      >
        <Send class="icon-xs" />
        <span>تخصیص بازرسی</span>
      </button>
    </div>
  </article>
</template>

<style scoped lang="scss">
.specialized-card {
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

.id-and-category {
  display: flex;
  align-items: center;
  gap: 0.375rem;
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

.category-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background-color: var(--secondary);
  border-radius: var(--radius-sm);
  padding-block: 0.15rem;
  padding-inline: 0.45rem;
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

  &.status-normal {
    background-color: rgba(16, 185, 129, 0.15);
    color: #059669;
  }
  &.status-warning {
    background-color: rgba(245, 158, 11, 0.18);
    color: #d97706;
  }
  &.status-alert {
    background-color: rgba(239, 68, 68, 0.18);
    color: #dc2626;
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

.metrics-box {
  background-color: var(--secondary);
  border-radius: var(--radius-md);
  padding: 0.625rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-inline-start: 3px solid var(--primary);
}

.metric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
}

.metric-title {
  color: var(--muted-foreground);
}

.metric-value {
  color: var(--foreground);
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

.card-inspection-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.inspection-date {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.card-actions-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-block-top: 0.25rem;
}

.action-btn-map,
.action-btn-assign {
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

.action-btn-map {
  flex: 1;
  background-color: var(--primary);
  color: var(--primary-foreground);

  &:hover {
    filter: brightness(1.1);
  }
}

.action-btn-assign {
  background-color: var(--secondary);
  color: var(--foreground);
  border-color: var(--border);

  &:hover {
    background-color: oklch(from var(--foreground) l c h / 8%);
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

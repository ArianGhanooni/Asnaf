<script setup lang="ts">
import type { Complaint } from 'src/types/asnaf';
import { complaintStageLabels } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import {
  FileText,
  User,
  Building2,
  MapPin,
  Calendar,
  AlertTriangle,
  UserCheck,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-vue-next';

interface Props {
  readonly complaint: Complaint;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'assign-mission', complaint: Complaint): void;
  (e: 'view-detail', complaint: Complaint): void;
}>();

function getStageTone(stage: Complaint['stage']): string {
  switch (stage) {
    case 'registered':
      return 'stage-blue';
    case 'referred_to_inspection':
      return 'stage-cyan';
    case 'field_mission':
      return 'stage-amber';
    case 'warning_issued':
      return 'stage-orange';
    case 'summons_issued':
      return 'stage-purple';
    case 'sealed':
      return 'stage-red';
    case 'resolved':
    case 'closed':
      return 'stage-green';
    default:
      return 'stage-gray';
  }
}
</script>

<template>
  <article
    class="complaint-card shadow-card"
    :data-testid="`complaint-card-${complaint.id}`"
  >
    <!-- ۱. هدر کارت: کد پیگیری سیمبا و وضعیت چرخه -->
    <div class="card-header-row">
      <div class="tracking-badge-group">
        <span class="simba-tag">سیمبا: {{ complaint.trackingCode }}</span>
        <span class="union-chip">{{ complaint.unionName }}</span>
      </div>

      <span :class="['stage-pill', getStageTone(complaint.stage)]">
        <CheckCircle2 v-if="complaint.stage === 'resolved' || complaint.stage === 'closed'" class="icon-xxs" />
        <ShieldAlert v-else-if="complaint.stage === 'sealed' || complaint.stage === 'warning_issued'" class="icon-xxs" />
        <Clock v-else class="icon-xxs" />
        <span>{{ complaintStageLabels[complaint.stage] || complaint.stage }}</span>
      </span>
    </div>

    <!-- ۲. واحد هدف و متصدی -->
    <div class="card-unit-row">
      <div class="unit-title-group">
        <Building2 class="icon-sm text-primary flex-shrink-0" />
        <div>
          <h3 class="unit-name">{{ complaint.unitName }}</h3>
          <p class="operator-meta">
            متصدی: <strong>{{ complaint.operatorName }}</strong>
            <span v-if="complaint.operatorMobile" class="ltr-text">({{ complaint.operatorMobile }})</span>
          </p>
        </div>
      </div>
    </div>

    <!-- ۳. شاکی و تاریخ ثبت -->
    <div class="card-meta-row">
      <div class="meta-item">
        <User class="icon-xs text-muted" />
        <span class="meta-label">شاکی:</span>
        <span class="meta-val">{{ complaint.complainantName }}</span>
      </div>

      <div class="meta-item" dir="ltr">
        <Calendar class="icon-xxs text-muted" />
        <span class="meta-val">{{ fa(complaint.registrationDate) }}</span>
      </div>
    </div>

    <!-- ۴. موضوع تخلف و شرح شکایت -->
    <div class="violation-box">
      <div class="violation-head">
        <AlertTriangle class="icon-xs text-warning flex-shrink-0" />
        <strong class="violation-subject">{{ complaint.violationSubject }}</strong>
      </div>
      <p class="violation-desc">{{ complaint.description }}</p>
    </div>

    <!-- ۵. نشانی و منطقه -->
    <div class="card-location-row">
      <MapPin class="icon-xs text-danger flex-shrink-0" />
      <span class="location-text">{{ complaint.region }} · {{ complaint.address }}</span>
    </div>

    <!-- ۶. بازرس مأمور (در صورت تخصیص) -->
    <div class="card-inspector-row">
      <div class="inspector-info">
        <UserCheck class="icon-xs text-primary" />
        <span class="meta-label">بازرس مأمور:</span>
        <strong v-if="complaint.assignedInspector" class="inspector-assigned">
          {{ complaint.assignedInspector }}
        </strong>
        <span v-else class="inspector-unassigned">هنوز تخصیص داده نشده</span>
      </div>

      <div v-if="complaint.warningNo" class="warning-chip">
        اخطار: {{ complaint.warningNo }}
      </div>
    </div>

    <!-- ۷. دکمه‌های عملیات -->
    <div class="card-actions-row">
      <button
        v-if="!complaint.assignedInspector || complaint.stage === 'referred_to_inspection' || complaint.stage === 'registered'"
        type="button"
        class="action-btn-assign"
        @click="emit('assign-mission', complaint)"
        :data-testid="`assign-complaint-btn-${complaint.id}`"
      >
        <Send class="icon-xs" />
        <span>تخصیص ماموریت میدانی</span>
      </button>

      <button
        v-else
        type="button"
        class="action-btn-reassign"
        @click="emit('assign-mission', complaint)"
        :data-testid="`reassign-complaint-btn-${complaint.id}`"
      >
        <UserCheck class="icon-xs" />
        <span>تغییر بازرس / تجدید ماموریت</span>
      </button>

      <button
        type="button"
        class="action-btn-view"
        @click="emit('view-detail', complaint)"
        :data-testid="`view-complaint-detail-btn-${complaint.id}`"
      >
        <Eye class="icon-xs" />
        <span>چرخه و جزئیات</span>
      </button>
    </div>
  </article>
</template>

<style scoped lang="scss">
.complaint-card {
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

.tracking-badge-group {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.simba-tag {
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

.union-chip {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background-color: var(--secondary);
  border-radius: var(--radius-sm);
  padding-block: 0.15rem;
  padding-inline: 0.4rem;
}

.stage-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 9999px;
  padding-block: 0.2rem;
  padding-inline: 0.625rem;
  font-size: 0.6875rem;
  font-weight: 700;

  &.stage-blue {
    background-color: rgba(59, 130, 246, 0.15);
    color: #2563eb;
  }
  &.stage-cyan {
    background-color: rgba(6, 182, 212, 0.15);
    color: #0891b2;
  }
  &.stage-amber {
    background-color: rgba(245, 158, 11, 0.18);
    color: #d97706;
  }
  &.stage-orange {
    background-color: rgba(249, 115, 22, 0.18);
    color: #ea580c;
  }
  &.stage-purple {
    background-color: rgba(168, 85, 247, 0.18);
    color: #9333ea;
  }
  &.stage-red {
    background-color: rgba(239, 68, 68, 0.18);
    color: #dc2626;
  }
  &.stage-green {
    background-color: rgba(34, 197, 94, 0.18);
    color: #16a34a;
  }
  &.stage-gray {
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

.card-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.meta-label {
  color: var(--muted-foreground);
}

.meta-val {
  color: var(--foreground);
  font-weight: 600;
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
  margin-block-end: 0.25rem;
}

.violation-subject {
  font-size: 0.8125rem;
  color: var(--foreground);
}

.violation-desc {
  margin: 0;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

.card-inspector-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-block: 0.35rem;
  background-color: oklch(from var(--foreground) l c h / 3%);
  border-radius: var(--radius-md);
  padding-inline: 0.5rem;
}

.inspector-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
}

.inspector-assigned {
  color: var(--foreground);
}

.inspector-unassigned {
  color: var(--warning-foreground);
  font-style: italic;
  font-weight: 600;
}

.warning-chip {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #ea580c;
  background-color: rgba(249, 115, 22, 0.12);
  padding-block: 0.125rem;
  padding-inline: 0.4rem;
  border-radius: var(--radius-sm);
}

.card-actions-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-block-top: 0.25rem;
}

.action-btn-assign,
.action-btn-reassign,
.action-btn-view {
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

.action-btn-reassign {
  flex: 1;
  background-color: var(--secondary);
  color: var(--foreground);
  border-color: var(--border);

  &:hover {
    background-color: oklch(from var(--foreground) l c h / 8%);
  }
}

.action-btn-view {
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

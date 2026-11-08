<script setup lang="ts">
import type { Mission } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import {
  MapPin,
  Clock,
  UserCheck,
  Building2,
  CheckCircle2,
  Target,
  FileText,
  Eye,
  Compass,
  FileCheck,
  Navigation,
  ShieldCheck,
  RotateCcw,
} from 'lucide-vue-next';

import { useQuasar } from 'quasar';
import { getMissionLatLng, navigateToLocation } from 'src/utils/ahvazGis';

interface Props {
  readonly mission: Mission;
}

const props = defineProps<Props>();
const $q = useQuasar();

const emit = defineEmits<{
  (e: 'toggle-status', id: number): void;
  (e: 'open-detail', mission: Mission): void;
  (e: 'open-sheet', mission: Mission): void;
  (e: 'view-on-map', mission: Mission): void;
}>();

function handleNavigate(): void {
  const [destLat, destLng] = getMissionLatLng(props.mission);
  navigateToLocation(destLat, destLng, (msg) => {
    $q.notify({
      type: 'info',
      message: `${msg} به سمت «${props.mission.targetUnit || props.mission.place}»`,
      timeout: 2500,
      position: 'top',
    });
  });
}
</script>

<template>
  <article
    class="mission-mobile-card shadow-card"
    :data-testid="`mission-card-${mission.id}`"
  >
    <!-- ۱. هدر کارت: کد مأموریت، کد سیمبا و وضعیت -->
    <div class="card-header-row">
      <div class="id-and-badges">
        <span class="mission-id-tag">
          کد {{ fa(mission.id) }}
        </span>

        <span v-if="mission.simbaCode" class="simba-code-tag">
          سیمبا: {{ mission.simbaCode }}
        </span>
        <span v-else class="routine-badge">
          سرکشی نوبتی (-)
        </span>

        <span
          v-if="mission.priority"
          :class="['priority-badge', `priority-${mission.priority}`]"
        >
          {{ mission.priority === 'urgent' ? 'فوری' : mission.priority === 'high' ? 'مهم' : 'عادی' }}
        </span>
      </div>

      <!-- ۳ وضعیت: فعال / در انتظار تأیید اتحادیه / تکمیل‌شده -->
      <span
        :class="[
          'status-badge-pill',
          mission.status === 'done'
            ? 'is-done'
            : mission.status === 'pending_approval'
              ? 'is-pending'
              : 'is-active',
        ]"
      >
        <CheckCircle2 v-if="mission.status === 'done'" class="icon-xxs" />
        <FileCheck v-else-if="mission.status === 'pending_approval'" class="icon-xxs" />
        <Clock v-else class="icon-xxs" />
        <span>
          {{
            mission.status === 'done'
              ? 'تکمیل‌شده'
              : mission.status === 'pending_approval'
                ? 'در انتظار تأیید اتحادیه'
                : 'در حال انجام'
          }}
        </span>
      </span>
    </div>

    <!-- ۲. اتحادیه و بازرس مسئول -->
    <div class="card-meta-row">
      <div class="meta-item">
        <UserCheck class="icon-xs text-primary" />
        <span class="meta-label">بازرس:</span>
        <strong class="inspector-title">{{ mission.inspector }}</strong>
      </div>

      <div class="union-badge-box">
        <span class="union-name-chip">{{ mission.union }}</span>
      </div>
    </div>

    <!-- ۳. واحد هدف و متصدی -->
    <div class="card-target-row">
      <Building2 class="icon-xs text-primary flex-shrink-0" />
      <div class="target-info">
        <span class="target-name">{{ mission.targetUnit || 'واحدهای صنفی محدوده' }}</span>
        <span v-if="mission.operatorName" class="operator-name">
          (متصدی: {{ mission.operatorName }})
        </span>
      </div>
    </div>

    <!-- ۴. عنوان نوع مأموریت و ساعت -->
    <div class="card-type-row">
      <div class="type-item">
        <Target class="icon-xs text-warning" />
        <span class="type-name">{{ mission.type || 'بازرسی نوبتی و ادواری' }}</span>
      </div>

      <div class="time-item" dir="ltr">
        <Clock class="icon-xxs text-muted" />
        <span>{{ fa(mission.time) }}</span>
      </div>
    </div>

    <!-- ۵. نشانی، منطقه شهرداری و مختصات مکانی GIS -->
    <div class="card-location-row">
      <div class="location-item">
        <MapPin class="icon-xs text-danger" />
        <span class="location-text">{{ mission.place }} · {{ fa(mission.region) }}</span>
      </div>
      <div class="gis-item" dir="ltr">
        <Compass class="icon-xxs text-muted" />
        <span>GIS: {{ fa(mission.x) }}, {{ fa(mission.y) }}</span>
      </div>
    </div>

    <!-- ۶. کادر شرح مأموریت و دستور کار -->
    <div class="card-notes-box">
      <div class="notes-header">
        <FileText class="icon-xxs text-primary" />
        <span>دستور کار و شرح بازرسی:</span>
      </div>
      <p class="notes-body">
        {{ mission.notes || 'بررسی پروانه کسب، رعایت نرخ‌نامه مصوب و پایش ضوابط انتظامی و صنفی.' }}
      </p>
    </div>

    <!-- ۷. دکمه‌های عملیات روی کارت -->
    <div class="card-actions-row">
      <button
        type="button"
        class="quick-nav-btn"
        @click="handleNavigate"
        :data-testid="`nav-mission-${mission.id}`"
        title="مسیریابی از لوکیشن فعلی تا واحد هدف در اپ نقشه"
      >
        <MapPin class="icon-xs" />
        <span>مسیریابی</span>
      </button>

      <button
        type="button"
        class="quick-map-btn"
        @click="emit('view-on-map', mission)"
        :data-testid="`view-map-mission-${mission.id}`"
        title="هایلایت و نمایش روی نقشه GIS اهواز"
      >
        <Navigation class="icon-xs" />
        <span>نقشه GIS</span>
      </button>

      <button
        type="button"
        class="quick-sheet-btn"
        @click="emit('open-sheet', mission)"
        :data-testid="`open-sheet-mission-${mission.id}`"
        title="مشاهده و چاپ صورتجلسه رسمی A4"
      >
        <FileCheck class="icon-xs" />
        <span>گزارش A4</span>
      </button>

      <button
        type="button"
        class="quick-detail-btn"
        @click="emit('open-detail', mission)"
        :data-testid="`open-detail-btn-${mission.id}`"
        title="مشاهده شناسنامه کامل و سوابق"
      >
        <Eye class="icon-xs" />
        <span>شناسنامه</span>
      </button>
    </div>
  </article>
</template>

<style scoped lang="scss">
.mission-mobile-card {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  width: 100%;
  box-sizing: border-box;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding-block: 1rem;
  padding-inline: 1rem;
  transition: all 0.15s ease;
  overflow: hidden;

  &:hover {
    border-color: var(--primary);
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

.id-and-badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.mission-id-tag {
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

.simba-code-tag {
  font-family: monospace;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #0284c7;
  background-color: rgba(2, 132, 199, 0.12);
  border: 1px solid rgba(2, 132, 199, 0.25);
  padding-block: 0.125rem;
  padding-inline: 0.45rem;
  border-radius: var(--radius-sm);
}

.routine-badge {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  background-color: var(--secondary);
  padding-block: 0.125rem;
  padding-inline: 0.45rem;
  border-radius: var(--radius-sm);
}

.priority-badge {
  font-size: 0.625rem;
  font-weight: 700;
  padding-block: 0.125rem;
  padding-inline: 0.45rem;
  border-radius: var(--radius-sm);

  &.priority-urgent {
    background-color: rgba(239, 68, 68, 0.18);
    color: #dc2626;
  }
  &.priority-high {
    background-color: rgba(245, 158, 11, 0.18);
    color: #d97706;
  }
  &.priority-normal {
    background-color: rgba(59, 130, 246, 0.12);
    color: #2563eb;
  }
}

.status-badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 9999px;
  padding-block: 0.2rem;
  padding-inline: 0.625rem;
  font-size: 0.6875rem;
  font-weight: 700;

  &.is-done {
    background-color: oklch(from var(--success) l c h / 15%);
    color: var(--success);
  }

  &.is-pending {
    background-color: rgba(168, 85, 247, 0.18);
    color: #9333ea;
  }

  &.is-active {
    background-color: oklch(from var(--warning) l c h / 25%);
    color: var(--warning-foreground);
  }
}

.card-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.8125rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.meta-label {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.inspector-title {
  color: var(--foreground);
  font-weight: 700;
}

.union-name-chip {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--primary);
  background-color: oklch(from var(--primary) l c h / 8%);
  padding-block: 0.15rem;
  padding-inline: 0.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid oklch(from var(--primary) l c h / 15%);
}

.card-target-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
}

.target-info {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.target-name {
  font-weight: 700;
  color: var(--foreground);
}

.operator-name {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.card-type-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.type-name {
  color: var(--foreground);
}

.time-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.card-location-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.location-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--muted-foreground);
}

.location-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gis-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--muted-foreground);
  font-size: 0.6875rem;
}

.card-notes-box {
  background-color: var(--secondary);
  border-radius: var(--radius-md);
  padding: 0.625rem 0.75rem;
  border-inline-start: 3px solid var(--primary);
}

.notes-header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--foreground);
  margin-block-end: 0.25rem;
}

.notes-body {
  margin: 0;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  line-height: 1.45;
}

.card-actions-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-block-top: 0.25rem;
}

.quick-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding-block: 0.45rem;
  padding-inline: 0.625rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  background-color: #f0f9ff;
  color: #0369a1;
  border: 1px solid #7dd3fc;

  &:hover {
    background-color: #e0f2fe;
    border-color: #38bdf8;
  }
}

.quick-map-btn,
.quick-sheet-btn,
.quick-detail-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding-block: 0.45rem;
  padding-inline: 0.625rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid var(--border);
}

.quick-map-btn {
  flex: 1;
  background-color: var(--primary);
  color: var(--primary-foreground);
  border-color: transparent;

  &:hover {
    filter: brightness(1.1);
  }
}

.quick-sheet-btn {
  background-color: var(--secondary);
  color: var(--foreground);

  &:hover {
    background-color: oklch(from var(--foreground) l c h / 8%);
  }
}

.quick-detail-btn {
  background-color: var(--card);
  color: var(--muted-foreground);

  &:hover {
    color: var(--foreground);
    border-color: var(--primary);
  }
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

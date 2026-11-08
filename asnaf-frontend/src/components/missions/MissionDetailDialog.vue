<script setup lang="ts">
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import type { Mission } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import { useQuasar } from 'quasar';
import {
  MapPin,
  Clock,
  UserCheck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  Target,
} from 'lucide-vue-next';

interface Props {
  readonly modelValue: boolean;
  readonly mission: Mission | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'status-changed', mission: Mission): void;
}>();

const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

function toggleStatus(): void {
  if (!props.mission) return;
  const user = sessionStore.session?.name ?? 'مدیر بازرسی';
  unitsStore.toggleMissionStatus(props.mission.id, user);

  $q.notify({
    type: 'positive',
    message: `وضعیت مأموریت کد ${fa(props.mission.id)} به‌روز شد.`,
    position: 'top',
  });

  emit('status-changed', props.mission);
  emit('update:modelValue', false);
}
</script>

<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    transition-show="scale"
    transition-hide="scale"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="mission" class="mission-detail-card" dir="rtl" data-testid="mission-detail-dialog">
      <div class="dialog-header">
        <div>
          <div class="header-tag">کارت شناسنامه مأموریت نظارتی</div>
          <h3 class="dialog-title">مأموریت کد {{ fa(mission.id) }} · {{ mission.place }}</h3>
        </div>
        <button
          type="button"
          class="close-btn"
          @click="emit('update:modelValue', false)"
          data-testid="close-detail-dialog-btn"
          aria-label="بستن"
        >
          <X class="icon-sm" />
        </button>
      </div>

      <div class="dialog-body">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">بازرس مجری:</span>
            <span class="detail-val font-bold">
              <UserCheck class="icon-xxs inline-icon text-primary" />
              <span>{{ mission.inspector }}</span>
            </span>
          </div>

          <div class="detail-item">
            <span class="detail-label">منطقه و حوزه نظارتی:</span>
            <span class="detail-val">
              <MapPin class="icon-xxs inline-icon text-muted" />
              <span>{{ mission.region }} ({{ mission.place }})</span>
            </span>
          </div>

          <div class="detail-item">
            <span class="detail-label">وضعیت مأموریت:</span>
            <span :class="['status-badge', mission.status === 'done' ? 'is-done' : 'is-active']">
              {{ mission.status === 'done' ? 'تکمیل‌شده' : 'در حال انجام' }}
            </span>
          </div>

          <div class="detail-item">
            <span class="detail-label">ساعت اعزام / ثبت:</span>
            <span class="detail-val" dir="ltr">
              <Clock class="icon-xxs inline-icon text-muted" />
              <span>{{ fa(mission.time) }}</span>
            </span>
          </div>

          <div v-if="mission.type" class="detail-item col-span-2">
            <span class="detail-label">نوع مأموریت:</span>
            <span class="detail-val">{{ mission.type }}</span>
          </div>

          <div v-if="mission.targetUnit" class="detail-item col-span-2">
            <span class="detail-label">واحد صنفی هدف:</span>
            <span class="detail-val font-bold text-primary">
              <Building2 class="icon-xxs inline-icon" />
              <span>{{ mission.targetUnit }}</span>
            </span>
          </div>
        </div>

        <div v-if="mission.notes" class="notes-box">
          <span class="notes-title">دستور کار و نکات بازرسی:</span>
          <p class="notes-text">{{ mission.notes }}</p>
        </div>

        <div class="dialog-footer">
          <button
            type="button"
            :class="['toggle-status-btn', mission.status === 'done' ? 'btn-reactivate' : 'btn-complete']"
            @click="toggleStatus"
            data-testid="toggle-mission-status-btn"
          >
            <CheckCircle2 v-if="mission.status !== 'done'" class="icon-xs" />
            <Clock v-else class="icon-xs" />
            <span>{{ mission.status === 'done' ? 'تغییر به در حال انجام' : 'تکمیل و ثبت خاتمه مأموریت' }}</span>
          </button>
          <button
            type="button"
            class="close-action-btn"
            @click="emit('update:modelValue', false)"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.mission-detail-card {
  width: 100%;
  max-width: 32rem;
  background-color: var(--card);
  color: var(--foreground);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.25rem 1.5rem;
  background-color: var(--muted);
  border-bottom: 1px solid var(--border);
}

.header-tag {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--primary);
  background-color: oklch(from var(--primary) l c h / 12%);
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  display: inline-block;
  margin-bottom: 0.25rem;
}

.dialog-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
}

.dialog-body {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.col-span-2 {
  grid-column: span 2;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  font-weight: 600;
}

.detail-val {
  font-size: 0.8125rem;
}

.font-bold {
  font-weight: 700;
}

.status-badge {
  display: inline-flex;
  width: fit-content;
  border-radius: 9999px;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;

  &.is-done {
    background-color: rgba(16, 185, 129, 0.15);
    color: #059669;
  }
  &.is-active {
    background-color: rgba(245, 158, 11, 0.18);
    color: #d97706;
  }
}

.notes-box {
  background-color: oklch(from var(--primary) l c h / 8%);
  border: 1px solid oklch(from var(--primary) l c h / 20%);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
}

.notes-title {
  display: block;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.25rem;
}

.notes-text {
  font-size: 0.75rem;
  line-height: 1.6;
  margin: 0;
}

.dialog-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toggle-status-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  height: 2.5rem;
  border-radius: var(--radius-md);
  border: none;
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &.btn-complete {
    background-color: var(--success);
    color: #ffffff;
  }

  &.btn-reactivate {
    background-color: var(--warning);
    color: #ffffff;
  }
}

.close-action-btn {
  height: 2.5rem;
  padding: 0 1.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: none;
  color: var(--foreground);
  cursor: pointer;
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

.inline-icon {
  display: inline-block;
  margin-inline-end: 0.2rem;
}

.text-primary {
  color: var(--primary);
}

.text-muted {
  color: var(--muted-foreground);
}
</style>

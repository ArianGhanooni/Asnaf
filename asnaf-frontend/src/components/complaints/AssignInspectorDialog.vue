<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import type { Complaint } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import { UserCheck, X, Send, Smartphone } from 'lucide-vue-next';

interface Props {
  readonly modelValue: boolean;
  readonly complaint: Complaint | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'assigned', inspector: string): void;
}>();

const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

const inspectorsList = [
  { name: 'آرین قانونی', region: 'منطقه ۲ و ۴', activeMissions: 3, code: '۴۰۱۲' },
  { name: 'رضا موسوی', region: 'منطقه ۳', activeMissions: 2, code: '۴۰۱۸' },
  { name: 'فاطمه نیسی', region: 'منطقه ۱', activeMissions: 4, code: '۴۰۲۵' },
  { name: 'علی سواری', region: 'منطقه ۶', activeMissions: 1, code: '۴۰۳۰' },
  { name: 'مریم کریمی', region: 'منطقه ۵ و ۸', activeMissions: 2, code: '۴۰۴۲' },
];

const selectedInspector = ref(inspectorsList[0]?.name ?? '');
const selectedRegion = ref(props.complaint?.region ?? 'منطقه ۲ (اهواز - کیانپارس)');

function submit(): void {
  if (!props.complaint) return;
  if (!selectedInspector.value) {
    $q.notify({ type: 'negative', message: 'انتخاب بازرس الزامی است', position: 'top' });
    return;
  }

  const currentUser = sessionStore.session?.name ?? 'مدیر بازرسی اصناف';
  unitsStore.referComplaintToInspection(
    props.complaint.id,
    selectedInspector.value,
    selectedRegion.value,
    currentUser
  );

  $q.notify({
    type: 'positive',
    message: `پرونده به بازرس «${selectedInspector.value}» ارجاع شد.`,
    caption: 'کارت مأموریت در اپلیکیشن میدانی (/adr) بارگذاری گردید.',
    position: 'top',
  });

  emit('assigned', selectedInspector.value);
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
    <div v-if="complaint" class="assign-dialog-card" dir="rtl" data-testid="assign-inspector-dialog">
      <div class="dialog-header">
        <div>
          <div class="bazras-badge">سامانه bazras360 · ارجاع میدانی</div>
          <h3 class="dialog-title">ارجاع پرونده به بازرس میدانی (/adr)</h3>
          <p class="dialog-sub">تخصیص شکایت شماره {{ fa(complaint.trackingCode) }} به بازرس منطقه</p>
        </div>
        <button
          type="button"
          class="close-btn"
          @click="emit('update:modelValue', false)"
          data-testid="close-assign-dialog-btn"
          aria-label="بستن"
        >
          <X class="icon-sm" />
        </button>
      </div>

      <div class="complaint-summary-card">
        <p class="summary-line"><b>واحد صنفی:</b> {{ complaint.unitName }}</p>
        <p class="summary-line"><b>صنف و اتحادیه:</b> {{ complaint.unionName }}</p>
        <p class="summary-line"><b>نشانی:</b> {{ complaint.address }}</p>
        <p class="summary-line text-warning"><b>تخلف گزارش‌شده:</b> {{ complaint.violationSubject }}</p>
      </div>

      <form class="dialog-form" @submit.prevent="submit">
        <div class="field-item">
          <label class="field-label">انتخاب بازرس مسئول منطقه *</label>
          <div class="inspectors-grid">
            <div
              v-for="ins in inspectorsList"
              :key="ins.name"
              :class="['inspector-choice-card', { 'is-selected': selectedInspector === ins.name }]"
              @click="selectedInspector = ins.name"
              :data-testid="`inspector-choice-${ins.name}`"
            >
              <div class="choice-top">
                <span class="ins-name">{{ ins.name }}</span>
                <span class="ins-code">کد: {{ fa(ins.code) }}</span>
              </div>
              <div class="choice-bottom">
                <span>{{ ins.region }}</span>
                <span class="ins-active-missions">{{ fa(ins.activeMissions) }} مأموریت فعال</span>
              </div>
            </div>
          </div>
        </div>

        <div class="app-dispatch-notice">
          <Smartphone class="icon-sm text-primary" />
          <span>
            پس از تایید، شکایت تحت عنوان <b>«ارجاع از شکایات (سیمبا)»</b> به صورت خودکار بر روی تبلت بازرس در تب اخطارها (/adr) فعال خواهد شد.
          </span>
        </div>

        <div class="dialog-footer">
          <button type="submit" class="submit-btn" data-testid="confirm-assign-btn">
            <Send class="icon-xs" />
            <span>تایید و ارسال کارت مأموریت به بازرس</span>
          </button>
          <button
            type="button"
            class="cancel-btn"
            @click="emit('update:modelValue', false)"
          >
            انصراف
          </button>
        </div>
      </form>
    </div>
  </q-dialog>
</template>

<style scoped lang="scss">
.assign-dialog-card {
  width: 100%;
  max-width: 36rem;
  background-color: var(--card);
  color: var(--foreground);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
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

.bazras-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #3b82f6;
  background-color: rgba(59, 130, 246, 0.12);
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

.dialog-sub {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0.25rem 0 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
}

.complaint-summary-card {
  margin: 1.25rem 1.5rem 0;
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0.875rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.summary-line {
  font-size: 0.8125rem;
  margin: 0;
}

.dialog-form {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-size: 0.8125rem;
  font-weight: 600;
}

.inspectors-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inspector-choice-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  background-color: var(--card);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--primary);
  }

  &.is-selected {
    border-color: var(--primary);
    background-color: oklch(from var(--primary) l c h / 8%);
    box-shadow: 0 0 0 1px var(--primary);
  }
}

.choice-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ins-name {
  font-size: 0.875rem;
  font-weight: 700;
}

.ins-code {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.choice-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-top: 0.25rem;
}

.ins-active-missions {
  background-color: var(--muted);
  padding: 0.1rem 0.375rem;
  border-radius: var(--radius-sm);
}

.app-dispatch-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: oklch(from var(--primary) l c h / 10%);
  border: 1px solid oklch(from var(--primary) l c h / 25%);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  font-size: 0.75rem;
  line-height: 1.6;
}

.dialog-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.submit-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  height: 2.75rem;
  border-radius: var(--radius-md);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
}

.cancel-btn {
  height: 2.75rem;
  padding: 0 1.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: none;
  color: var(--foreground);
  cursor: pointer;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.icon-xs {
  width: 0.875rem;
  height: 0.875rem;
}

.text-primary {
  color: var(--primary);
}

.text-warning {
  color: var(--warning);
}
</style>

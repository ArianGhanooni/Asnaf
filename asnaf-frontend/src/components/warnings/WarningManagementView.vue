<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSessionStore } from 'src/stores/session';
import { useUnitsStore } from 'src/stores/units';
import type { Unit, CaseStatus } from 'src/types/asnaf';
import { statusLabels } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import { useQuasar } from 'quasar';
import PanelCard from 'src/components/gov/PanelCard.vue';
import StatusPill from 'src/components/gov/StatusPill.vue';
import JalaliDateRangeFilter, { type DateRange } from 'src/components/common/JalaliDateRangeFilter.vue';
import {
  FileText,
  Gavel,
  Mail,
  Search,
  Send,
  FileCheck,
  Building2,
  User,
  MapPin,
  Phone,
  Calendar,
  AlertTriangle,
} from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'issue-unseal', unit: Unit): void;
}>();

const $q = useQuasar();
const sessionStore = useSessionStore();
const unitsStore = useUnitsStore();

const isGeneral = computed(() => sessionStore.session?.role === 'general');
const q = ref('');
const statusFilter = ref<string>('all');
const unionFilter = ref<string>('all');
const dateRange = ref<DateRange>({ from: '', to: '' });

const unions = [
  'همه اتحادیه‌ها',
  'اتحادیه نانوایان',
  'اتحادیه لبنیات و بستنی',
  'اتحادیه خواربار و سوپرمارکت',
  'اتحادیه مبل‌سازان',
  'اتحادیه صنف تعمیرکاران خودرو',
  'اتحادیه اغذیه‌فروشان و رستوران',
  'اتحادیه قصابان',
];

const filteredUnits = computed(() => {
  return unitsStore.units.filter((u) => {
    // محدودیت دسترسی اتحادیه
    if (!isGeneral.value && u.union !== 'اتحادیه نانوایان') {
      return false;
    }
    // فیلتر اتحادیه
    if (unionFilter.value !== 'all' && unionFilter.value !== 'همه اتحادیه‌ها' && u.union !== unionFilter.value) {
      return false;
    }
    // فیلتر وضعیت
    if (statusFilter.value !== 'all' && u.status !== statusFilter.value) {
      return false;
    }
    // فیلتر جستجوی چندسطحی
    const query = q.value.trim().toLowerCase();
    if (query) {
      const match = [
        String(u.id),
        u.name,
        u.operator,
        u.nationalId,
        u.mobile,
        u.region,
        u.address,
        u.violation,
      ].some((val) => val.toLowerCase().includes(query));
      if (!match) return false;
    }
    // فیلتر تاریخ شمسی
    if (dateRange.value.from && u.date < dateRange.value.from) {
      return false;
    }
    if (dateRange.value.to && u.date > dateRange.value.to) {
      return false;
    }
    return true;
  });
});

function notifyAction(msg: string): void {
  $q.notify({
    type: 'positive',
    message: msg,
    caption: 'در تاریخچه ممیزی ثبت شد.',
    position: 'top',
  });
}

function viewCase(u: Unit): void {
  $q.dialog({
    title: u.name,
    message: `شناسه پرونده: ${fa(u.id)}\nمتصدی: ${u.operator} (${fa(u.mobile)})\nکد ملی: ${fa(u.nationalId)}\nاتحادیه: ${u.union}\nمنطقه: ${u.region}\nآدرس: ${u.address}\nنوع تخلف: ${u.violation}\nتاریخ ثبت: ${u.date}`,
    ok: { label: 'بستن', color: 'primary' },
  });
}

function sendInvite(u: Unit): void {
  notifyAction(`دعوت‌نامه رسمی برای متصدی ${u.operator} صادر و پیامک شد.`);
  unitsStore.addAudit(sessionStore.session?.name ?? 'سیستم', 'صدور دعوت‌نامه', `واحد ${u.id} (${u.name})`);
}

function judicialReferral(u: Unit): void {
  notifyAction(`پرونده واحد ${u.name} به مراجع قضایی و اماکن ارجاع شد.`);
  unitsStore.addAudit(sessionStore.session?.name ?? 'سیستم', 'ارجاع قضایی فک پلمپ', `واحد ${u.id} (${u.name})`);
}
</script>

<template>
  <div class="warning-management-view" data-testid="warning-management-view">
    <!-- Filter Bar Card -->
    <PanelCard>
      <div class="filter-grid">
        <div class="search-input-wrap">
          <Search class="search-icon" />
          <input
            v-model="q"
            type="text"
            placeholder="جستجو با کد ملی، موبایل، شناسه واحد، نام متصدی، منطقه یا تخلف..."
            class="filter-input pr-9"
            data-testid="warnings-search-input"
          />
        </div>

        <select v-model="statusFilter" class="filter-select" data-testid="warnings-status-filter">
          <option value="all">همه وضعیت‌ها</option>
          <option v-for="(lbl, key) in statusLabels" :key="key" :value="key">
            {{ lbl }}
          </option>
        </select>

        <select v-if="isGeneral" v-model="unionFilter" class="filter-select">
          <option v-for="u in unions" :key="u" :value="u">
            {{ u }}
          </option>
        </select>

        <JalaliDateRangeFilter v-model="dateRange" />
      </div>
    </PanelCard>

    <!-- Warnings Table Card -->
    <PanelCard :title="`سامانه مدیریت اخطارها (${fa(filteredUnits.length)} پرونده)`">
      <!-- Desktop Table View -->
      <div class="desktop-table-wrapper">
        <div class="table-responsive">
          <table class="data-table">
          <thead>
            <tr>
              <th>شناسه</th>
              <th>واحد صنفی</th>
              <th>متصدی</th>
              <th>آدرس / موبایل</th>
              <th>نوع تخلف / توضیحات</th>
              <th>وضعیت</th>
              <th>تاریخ</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in filteredUnits" :key="u.id" data-testid="warning-row">
              <!-- ۱. شناسه -->
              <td class="font-bold">{{ fa(u.id) }}</td>

              <!-- ۲. واحد صنفی -->
              <td>
                <p class="unit-name">{{ u.name }}</p>
                <p class="unit-union">{{ u.union }} · {{ fa(u.region) }}</p>
                <span v-if="u.simba" class="simba-tag">سیمبا {{ fa(u.simba) }}</span>
              </td>

              <!-- ۳. متصدی -->
              <td>
                <p class="operator-name">{{ u.operator }}</p>
                <p class="operator-sub">کد ملی: {{ fa(u.nationalId) }}</p>
              </td>

              <!-- ۴. آدرس / موبایل -->
              <td>
                <p class="cell-address" :title="u.address">{{ u.address }}</p>
                <p class="cell-mobile">{{ fa(u.mobile) }}</p>
              </td>

              <!-- ۵. نوع تخلف / توضیحات -->
              <td>
                <p class="violation-text">{{ u.violation }}</p>
                <p v-if="u.warningNo" class="warning-no-sub">شماره اخطار: {{ u.warningNo }}</p>
              </td>

              <!-- ۶. وضعیت -->
              <td>
                <StatusPill :status="u.status" />
              </td>

              <!-- ۷. تاریخ -->
              <td class="date-cell">{{ u.date }}</td>

              <!-- ۸. عملیات -->
              <td>
                <div class="action-buttons">
                  <button
                    class="icon-action-btn"
                    title="مشاهده جزئیات پرونده"
                    @click="viewCase(u)"
                  >
                    <FileText class="icon-sm" />
                  </button>
                  <button
                    v-if="isGeneral"
                    class="icon-action-btn"
                    title="صدور دعوت‌نامه"
                    @click="sendInvite(u)"
                  >
                    <Send class="icon-sm" />
                  </button>
                  <button
                    v-if="isGeneral && (u.status === 'sealed' || u.status === 'readySeal')"
                    class="icon-action-btn text-success"
                    title="صدور نامه فک پلمپ و منع تعقیب"
                    @click="emit('issue-unseal', u)"
                  >
                    <FileCheck class="icon-sm" />
                  </button>
                  <button
                    v-if="isGeneral && u.status === 'unsealed'"
                    class="icon-action-btn text-destructive"
                    title="ارجاع فوری قضایی و اماکن"
                    @click="judicialReferral(u)"
                  >
                    <Gavel class="icon-sm" />
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="filteredUnits.length === 0">
              <td colspan="8" class="empty-state">
                پرونده‌ای با معیارهای جستجو یافت نشد.
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <!-- Mobile Cards View for Screens <= 768px -->
      <div class="mobile-cards-wrapper" dir="rtl">
        <div
          v-for="u in filteredUnits"
          :key="`mobile-${u.id}`"
          class="mobile-warning-card"
          data-testid="warning-mobile-card"
        >
          <!-- Card Header -->
          <div class="card-head">
            <div class="card-head-top">
              <div class="card-id-badge">
                <span class="id-label">شناسه پرونده:</span>
                <span class="id-val font-bold">{{ fa(u.id) }}</span>
              </div>
              <StatusPill :status="u.status" />
            </div>
            <h4 class="card-unit-title">{{ u.name }}</h4>
            <p class="card-union-sub">{{ u.union }} · منطقه {{ fa(u.region) }}</p>
          </div>

          <!-- Card Body Details -->
          <div class="card-body-details">
            <div class="card-info-item">
              <User class="icon-xxs text-muted" />
              <span class="info-label">متصدی:</span>
              <span class="info-val font-medium">{{ u.operator }}</span>
              <span class="info-sub">({{ fa(u.nationalId) }})</span>
            </div>

            <div class="card-info-item">
              <Phone class="icon-xxs text-muted" />
              <span class="info-label">شماره همراه:</span>
              <span class="info-val" dir="ltr">{{ fa(u.mobile) }}</span>
            </div>

            <div class="card-info-item">
              <MapPin class="icon-xxs text-muted" />
              <span class="info-label">آدرس:</span>
              <span class="info-val text-wrap">{{ u.address }}</span>
            </div>

            <div class="card-violation-box">
              <div class="violation-head">
                <AlertTriangle class="icon-xxs text-destructive" />
                <span class="violation-title">موضوع تخلف انتسابی:</span>
              </div>
              <p class="violation-body">{{ u.violation }}</p>
              <span v-if="u.warningNo" class="warning-no-sub">شماره اخطار: {{ u.warningNo }}</span>
            </div>

            <div class="card-footer-meta">
              <div class="date-tag">
                <Calendar class="icon-xxs text-muted" />
                <span>{{ u.date }}</span>
              </div>
              <span v-if="u.simba" class="simba-tag">سیمبا {{ fa(u.simba) }}</span>
            </div>
          </div>

          <!-- Card Actions -->
          <div class="card-actions-bar">
            <button
              type="button"
              class="mobile-action-btn"
              title="مشاهده جزئیات پرونده"
              @click="viewCase(u)"
            >
              <FileText class="icon-xs" />
              <span>مشاهده جزئیات</span>
            </button>

            <button
              v-if="isGeneral"
              type="button"
              class="mobile-action-btn"
              title="صدور دعوت‌نامه"
              @click="sendInvite(u)"
            >
              <Send class="icon-xs" />
              <span>دعوت‌نامه</span>
            </button>

            <button
              v-if="isGeneral && (u.status === 'sealed' || u.status === 'readySeal')"
              type="button"
              class="mobile-action-btn success-btn"
              title="صدور نامه فک پلمپ و منع تعقیب"
              @click="emit('issue-unseal', u)"
            >
              <FileCheck class="icon-xs" />
              <span>فک پلمپ</span>
            </button>

            <button
              v-if="isGeneral && u.status === 'unsealed'"
              type="button"
              class="mobile-action-btn danger-btn"
              title="ارجاع فوری قضایی و اماکن"
              @click="judicialReferral(u)"
            >
              <Gavel class="icon-xs" />
              <span>ارجاع قضایی</span>
            </button>
          </div>
        </div>

        <div v-if="filteredUnits.length === 0" class="empty-state shadow-card">
          پرونده‌ای با معیارهای جستجو یافت نشد.
        </div>
      </div>
    </PanelCard>
  </div>
</template>

<style scoped lang="scss">
.warning-management-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.filter-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: 2fr 1fr 1fr auto;
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

  &:focus {
    border-color: var(--primary);
  }
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

.font-bold {
  font-weight: 700;
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

.operator-sub {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  margin: 0.125rem 0 0;
}

.cell-address {
  max-width: 14rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.cell-mobile {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin: 0.125rem 0 0;
  direction: ltr;
  text-align: right;
}

.violation-text {
  margin: 0;
  font-weight: 500;
}

.warning-no-sub {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  margin: 0.125rem 0 0;
}

.date-cell {
  white-space: nowrap;
  font-size: 0.75rem;
}

.simba-tag {
  display: inline-block;
  margin-top: 0.25rem;
  border-radius: var(--radius-sm);
  background-color: oklch(from var(--destructive) l c h / 12%);
  color: var(--destructive);
  padding: 0.125rem 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.icon-action-btn {
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

  &.text-success {
    color: var(--success);
    &:hover {
      background-color: oklch(from var(--success) l c h / 15%);
    }
  }

  &.text-destructive {
    color: var(--destructive);
    &:hover {
      background-color: oklch(from var(--destructive) l c h / 10%);
    }
  }
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

.mobile-warning-card {
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

.card-body-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background-color: var(--muted);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  font-size: 0.75rem;
}

.card-info-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;

  .info-label {
    color: var(--muted-foreground);
    font-size: 0.75rem;
  }

  .info-val {
    color: var(--foreground);
  }

  .info-sub {
    color: var(--muted-foreground);
    font-size: 0.6875rem;
  }

  .text-wrap {
    word-break: break-word;
  }
}

.card-violation-box {
  background-color: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.18);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.625rem;
  margin-top: 0.25rem;

  .violation-head {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--destructive);
    font-size: 0.6875rem;
    font-weight: 600;
  }

  .violation-body {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: var(--foreground);
  }
}

.card-footer-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.25rem;
  padding-top: 0.375rem;
  border-top: 1px dashed var(--border);

  .date-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--muted-foreground);
    font-size: 0.75rem;
  }
}

.card-actions-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-top: 0.25rem;
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

  &.success-btn {
    color: #10b981;
    border-color: rgba(16, 185, 129, 0.3);
    background-color: rgba(16, 185, 129, 0.05);

    &:hover {
      background-color: rgba(16, 185, 129, 0.15);
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

.icon-xs {
  width: 0.9375rem;
  height: 0.9375rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 0;
  color: var(--muted-foreground);
}
</style>

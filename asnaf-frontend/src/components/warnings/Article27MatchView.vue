<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import type { Article27Match, Article27Status } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import { useQuasar } from 'quasar';
import PanelCard from 'src/components/gov/PanelCard.vue';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  Search,
  Scale,
  FileCheck,
  Building2,
  User,
  CreditCard,
} from 'lucide-vue-next';

const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

const q = ref('');
const statusFilter = ref<string>('all');
const expandedId = ref<number | null>(1); // باز بودن پیش‌فرض ردیف اول جهت راهنمایی کاربر

const statusLabelsMap: Record<Article27Status, { label: string; class: string }> = {
  pending: { label: 'در انتظار بررسی', class: 'status-pending' },
  verified: { label: 'تطبیق تایید شده', class: 'status-verified' },
  investigate: { label: 'نیازمند بررسی میدانی', class: 'status-investigate' },
  rejected: { label: 'عدم تطبیق / رد شده', class: 'status-rejected' },
};

const totalMatches = computed(() => unitsStore.article27Matches.length);
const verifiedCount = computed(
  () => unitsStore.article27Matches.filter((m) => m.status === 'verified').length
);
const investigateCount = computed(
  () => unitsStore.article27Matches.filter((m) => m.status === 'investigate').length
);
const rejectedCount = computed(
  () => unitsStore.article27Matches.filter((m) => m.status === 'rejected').length
);

const filteredMatches = computed(() => {
  return unitsStore.article27Matches.filter((item) => {
    if (statusFilter.value !== 'all' && item.status !== statusFilter.value) {
      return false;
    }
    const query = q.value.trim().toLowerCase();
    if (query) {
      const match = [
        String(item.warningId),
        item.unitName,
        item.operatorName,
        item.nationalId,
        item.unionName,
        item.guildCategory,
        item.licenseInfo.holderName,
        item.licenseInfo.licenseNumber,
      ].some((v) => v.toLowerCase().includes(query));
      if (!match) return false;
    }
    return true;
  });
});

function toggleExpand(id: number): void {
  expandedId.value = expandedId.value === id ? null : id;
}

function handleStatusChange(item: Article27Match, newStatus: Article27Status): void {
  const userName = sessionStore.session?.name ?? 'کارشناس نظارت';
  unitsStore.updateArticle27Status(item.id, newStatus, userName);

  const statusTitle =
    newStatus === 'verified'
      ? 'تطبیق اخطار با پروانه تأیید شد'
      : newStatus === 'investigate'
      ? 'پرونده جهت بررسی میدانی ارجاع گردید'
      : 'تطبیق رد شد و پرونده به صف آماده پلمپ منتقل گردید';

  $q.notify({
    type: newStatus === 'verified' ? 'positive' : newStatus === 'investigate' ? 'warning' : 'negative',
    message: statusTitle,
    caption: `واحد ${item.unitName} (شناسه ${fa(item.warningId)})`,
    position: 'top',
  });
}
</script>

<template>
  <div class="article27-match-view" data-testid="article-27-match-view">
    <!-- KPI Header Cards -->
    <div class="kpi-grid">
      <div class="kpi-card tone-total">
        <Scale class="kpi-icon" />
        <div class="kpi-info">
          <span class="kpi-label">کل پرونده‌های ماده ۲۷</span>
          <strong class="kpi-value">{{ fa(totalMatches) }} فقره</strong>
        </div>
      </div>

      <div class="kpi-card tone-verified">
        <CheckCircle2 class="kpi-icon text-success" />
        <div class="kpi-info">
          <span class="kpi-label">تأیید تطبیق (دارای پروانه)</span>
          <strong class="kpi-value">{{ fa(verifiedCount) }} فقره</strong>
        </div>
      </div>

      <div class="kpi-card tone-investigate">
        <HelpCircle class="kpi-icon text-warning" />
        <div class="kpi-info">
          <span class="kpi-label">نیازمند بازرسی و بررسی</span>
          <strong class="kpi-value">{{ fa(investigateCount) }} فقره</strong>
        </div>
      </div>

      <div class="kpi-card tone-rejected">
        <XCircle class="kpi-icon text-destructive" />
        <div class="kpi-info">
          <span class="kpi-label">عدم تطبیق / رد شده</span>
          <strong class="kpi-value">{{ fa(rejectedCount) }} فقره</strong>
        </div>
      </div>
    </div>

    <!-- Search & Filter Card -->
    <PanelCard>
      <div class="filter-row">
        <div class="search-input-wrap">
          <Search class="search-icon" />
          <input
            v-model="q"
            type="text"
            placeholder="جستجو با شماره اخطار، پروانه، نام واحد، کد ملی یا صنف..."
            class="filter-input pr-9"
            data-testid="article27-search-input"
          />
        </div>

        <select v-model="statusFilter" class="filter-select" data-testid="article27-status-filter">
          <option value="all">همه وضعیت‌های تطبیق</option>
          <option value="pending">در انتظار بررسی</option>
          <option value="verified">تطبیق تایید شده</option>
          <option value="investigate">نیازمند بررسی میدانی</option>
          <option value="rejected">رد شده / آماده پلمپ</option>
        </select>
      </div>
    </PanelCard>

    <!-- Expandable Match Table -->
    <PanelCard title="تطبیق اخطارهای ماده ۲۷ با اطلاعات پروانه کسب (کشویی)">
      <template #action>
        <span class="guide-tag">
          روی ردیف کلیک کنید تا مشخصات پروانه متناظر باز شود
        </span>
      </template>

      <!-- Desktop Table View -->
      <div class="desktop-table-wrapper">
        <div class="table-responsive">
          <table class="data-table">
          <thead>
            <tr>
              <th>شناسه اخطار</th>
              <th>نام واحد صنفی</th>
              <th>نام شخص (متصدی)</th>
              <th>کد ملی</th>
              <th>نوع تخلف</th>
              <th>نام اتحادیه</th>
              <th>رسته شغلی</th>
              <th>وضعیت تطبیق</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="item in filteredMatches" :key="item.id">
              <!-- Main Clickable Row -->
              <tr
                :class="['expandable-row', { 'is-expanded': expandedId === item.id }]"
                @click="toggleExpand(item.id)"
                data-testid="article-27-row"
              >
                <td class="font-bold">
                  <div class="id-wrapper">
                    <ChevronDown
                      class="icon-sm chevron"
                      :class="{ 'rotate-180': expandedId === item.id }"
                    />
                    <span>{{ fa(item.warningId) }}</span>
                  </div>
                </td>
                <td class="font-semibold">{{ item.unitName }}</td>
                <td>{{ item.operatorName }}</td>
                <td>{{ fa(item.nationalId) }}</td>
                <td>
                  <span class="violation-pill">{{ item.violationType }}</span>
                </td>
                <td class="text-muted">{{ item.unionName }}</td>
                <td class="text-muted">{{ item.guildCategory }}</td>
                <td>
                  <span :class="['match-pill', statusLabelsMap[item.status].class]">
                    {{ statusLabelsMap[item.status].label }}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    class="btn-toggle-row"
                    :title="expandedId === item.id ? 'بستن' : 'بررسی تطبیق'"
                  >
                    <span>{{ expandedId === item.id ? 'بستن' : 'تطبیق پروانه' }}</span>
                  </button>
                </td>
              </tr>

              <!-- Expanded Comparison Drawer (Nested Row) -->
              <tr v-if="expandedId === item.id" class="expanded-detail-row">
                <td colspan="9" class="expanded-cell">
                  <div class="comparison-container" dir="rtl">
                    <div class="comparison-grid">
                      <!-- Box 1: Warning Details -->
                      <div class="compare-card warning-box">
                        <div class="box-header">
                          <Building2 class="icon-sm text-warning" />
                          <h4 class="box-title">مشخصات اخطار ثبت‌شده (بازرسی میدانی)</h4>
                        </div>
                        <ul class="fields-list">
                          <li>
                            <span class="field-title">شناسه اخطار:</span>
                            <span class="field-value font-bold">{{ fa(item.warningId) }}</span>
                          </li>
                          <li>
                            <span class="field-title">نام واحد صنفی:</span>
                            <span class="field-value font-semibold">{{ item.unitName }}</span>
                          </li>
                          <li>
                            <span class="field-title">نام شخص متصدی:</span>
                            <span class="field-value">{{ item.operatorName }}</span>
                          </li>
                          <li>
                            <span class="field-title">کد ملی:</span>
                            <span class="field-value">{{ fa(item.nationalId) }}</span>
                          </li>
                          <li>
                            <span class="field-title">نوع تخلف:</span>
                            <span class="field-value text-destructive">{{ item.violationType }}</span>
                          </li>
                          <li>
                            <span class="field-title">نام اتحادیه مربوطه:</span>
                            <span class="field-value">{{ item.unionName }}</span>
                          </li>
                          <li>
                            <span class="field-title">رسته شغلی:</span>
                            <span class="field-value">{{ item.guildCategory }}</span>
                          </li>
                          <li>
                            <span class="field-title">آدرس ثبت‌شده:</span>
                            <span class="field-value">{{ item.address }}</span>
                          </li>
                        </ul>
                      </div>

                      <!-- Box 2: License Match Details -->
                      <div class="compare-card license-box">
                        <div class="box-header">
                          <FileCheck class="icon-sm text-primary" />
                          <h4 class="box-title">اطلاعات پروانه متناظر (پایگاه نوین اصناف)</h4>
                          <span
                            :class="[
                              'license-validity-badge',
                              item.licenseInfo.isValid ? 'is-valid' : 'is-invalid',
                            ]"
                          >
                            {{ item.licenseInfo.isValid ? 'پروانه معتبر' : 'فاقد پروانه / منقضی' }}
                          </span>
                        </div>
                        <ul class="fields-list">
                          <li>
                            <span class="field-title">نام واحد صنفی:</span>
                            <span class="field-value font-semibold">
                              {{ item.licenseInfo.unitName }}
                            </span>
                          </li>
                          <li>
                            <span class="field-title">نام صاحب پروانه:</span>
                            <span class="field-value">{{ item.licenseInfo.holderName }}</span>
                          </li>
                          <li>
                            <span class="field-title">شماره پروانه کسب:</span>
                            <span class="field-value font-bold text-primary">
                              {{ item.licenseInfo.licenseNumber !== '—' ? fa(item.licenseInfo.licenseNumber) : '—' }}
                            </span>
                          </li>
                          <li>
                            <span class="field-title">کد ملی دارنده:</span>
                            <span class="field-value">
                              {{ item.licenseInfo.nationalId !== '—' ? fa(item.licenseInfo.nationalId) : '—' }}
                            </span>
                          </li>
                          <li>
                            <span class="field-title">نام اتحادیه مربوطه:</span>
                            <span class="field-value">{{ item.licenseInfo.unionName }}</span>
                          </li>
                          <li>
                            <span class="field-title">تاریخ صدور:</span>
                            <span class="field-value">{{ item.licenseInfo.issueDate }}</span>
                          </li>
                          <li>
                            <span class="field-title">آدرس ثبتی پروانه:</span>
                            <span class="field-value">{{ item.licenseInfo.address }}</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <!-- Bottom Action Controls -->
                    <div class="match-actions-bar">
                      <div class="actions-prompt">
                        <strong>تعیین تکلیف تطبیق ماده ۲۷:</strong>
                        <span>پس از بررسی صحت انطباق مشخصات، یکی از تصمیمات زیر را ثبت نمایید:</span>
                      </div>

                      <div class="actions-buttons-group">
                        <!-- ۱. تایید تطبیق -->
                        <button
                          type="button"
                          class="action-btn btn-verify"
                          :disabled="item.status === 'verified'"
                          @click="handleStatusChange(item, 'verified')"
                          data-testid="verify-match-btn"
                        >
                          <CheckCircle2 class="icon-sm" />
                          <span>تایید تطبیق</span>
                        </button>

                        <!-- ۲. بررسی -->
                        <button
                          type="button"
                          class="action-btn btn-investigate"
                          :disabled="item.status === 'investigate'"
                          @click="handleStatusChange(item, 'investigate')"
                          data-testid="investigate-match-btn"
                        >
                          <HelpCircle class="icon-sm" />
                          <span>بررسی میدانی</span>
                        </button>

                        <!-- ۳. رد -->
                        <button
                          type="button"
                          class="action-btn btn-reject"
                          :disabled="item.status === 'rejected'"
                          @click="handleStatusChange(item, 'rejected')"
                          data-testid="reject-match-btn"
                        >
                          <XCircle class="icon-sm" />
                          <span>رد تطبیق</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>

            <tr v-if="filteredMatches.length === 0">
              <td colspan="9" class="empty-state">
                موردی برای تطبیق ماده ۲۷ با مشخصات درخواستی یافت نشد.
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <!-- Mobile Cards View for Screens <= 768px -->
      <div class="mobile-cards-wrapper" dir="rtl">
        <div
          v-for="item in filteredMatches"
          :key="`mobile-${item.id}`"
          :class="['mobile-match-card', { 'is-expanded': expandedId === item.id }]"
          data-testid="article-27-mobile-card"
        >
          <!-- Card Header -->
          <div class="card-head" @click="toggleExpand(item.id)">
            <div class="card-head-top">
              <div class="card-id-badge">
                <span class="id-label">شناسه اخطار:</span>
                <span class="id-val font-bold">{{ fa(item.warningId) }}</span>
              </div>
              <span :class="['match-pill', statusLabelsMap[item.status].class]">
                {{ statusLabelsMap[item.status].label }}
              </span>
            </div>
            <h4 class="card-unit-title">{{ item.unitName }}</h4>
            <div class="card-meta-row">
              <span class="meta-item"><User class="icon-xxs inline-icon" /> {{ item.operatorName }}</span>
              <span class="meta-item"><CreditCard class="icon-xxs inline-icon" /> {{ fa(item.nationalId) }}</span>
            </div>
          </div>

          <!-- Card Key Details -->
          <div class="card-details-grid">
            <div class="detail-cell">
              <span class="detail-label">نوع تخلف:</span>
              <span class="violation-pill">{{ item.violationType }}</span>
            </div>
            <div class="detail-cell">
              <span class="detail-label">اتحادیه:</span>
              <span class="detail-val">{{ item.unionName }}</span>
            </div>
            <div class="detail-cell full-width">
              <span class="detail-label">رسته شغلی:</span>
              <span class="detail-val">{{ item.guildCategory }}</span>
            </div>
          </div>

          <!-- Expand Trigger Button -->
          <button
            type="button"
            class="mobile-expand-btn"
            @click="toggleExpand(item.id)"
          >
            <span>{{ expandedId === item.id ? 'بستن مشخصات تطبیق' : 'بررسی و تطبیق پروانه کسب' }}</span>
            <ChevronDown class="icon-xs chevron" :class="{ 'rotate-180': expandedId === item.id }" />
          </button>

          <!-- Expanded Comparison Drawer (on mobile: side-by-side cards) -->
          <div v-if="expandedId === item.id" class="mobile-expanded-content">
            <div class="comparison-container" dir="rtl">
              <div class="comparison-grid">
                <!-- Box 1: Warning Details -->
                <div class="compare-card warning-box">
                  <div class="box-header">
                    <Building2 class="icon-sm text-warning" />
                    <h4 class="box-title">اخطار ثبت‌شده میدانی</h4>
                  </div>
                  <ul class="fields-list">
                    <li>
                      <span class="field-title">شناسه اخطار:</span>
                      <span class="field-value font-bold">{{ fa(item.warningId) }}</span>
                    </li>
                    <li>
                      <span class="field-title">نام واحد:</span>
                      <span class="field-value font-semibold">{{ item.unitName }}</span>
                    </li>
                    <li>
                      <span class="field-title">متصدی:</span>
                      <span class="field-value">{{ item.operatorName }}</span>
                    </li>
                    <li>
                      <span class="field-title">کد ملی:</span>
                      <span class="field-value">{{ fa(item.nationalId) }}</span>
                    </li>
                    <li>
                      <span class="field-title">تخلف:</span>
                      <span class="field-value text-destructive">{{ item.violationType }}</span>
                    </li>
                    <li>
                      <span class="field-title">اتحادیه:</span>
                      <span class="field-value">{{ item.unionName }}</span>
                    </li>
                    <li>
                      <span class="field-title">رسته:</span>
                      <span class="field-value">{{ item.guildCategory }}</span>
                    </li>
                    <li>
                      <span class="field-title">آدرس:</span>
                      <span class="field-value">{{ item.address }}</span>
                    </li>
                  </ul>
                </div>

                <!-- Box 2: License Match Details -->
                <div class="compare-card license-box">
                  <div class="box-header">
                    <FileCheck class="icon-sm text-primary" />
                    <h4 class="box-title">پروانه نوین اصناف</h4>
                    <span
                      :class="[
                        'license-validity-badge',
                        item.licenseInfo.isValid ? 'is-valid' : 'is-invalid',
                      ]"
                    >
                      {{ item.licenseInfo.isValid ? 'معتبر' : 'فاقد/منقضی' }}
                    </span>
                  </div>
                  <ul class="fields-list">
                    <li>
                      <span class="field-title">نام واحد:</span>
                      <span class="field-value font-semibold">
                        {{ item.licenseInfo.unitName }}
                      </span>
                    </li>
                    <li>
                      <span class="field-title">صاحب پروانه:</span>
                      <span class="field-value">{{ item.licenseInfo.holderName }}</span>
                    </li>
                    <li>
                      <span class="field-title">شماره پروانه:</span>
                      <span class="field-value font-bold text-primary">
                        {{ item.licenseInfo.licenseNumber !== '—' ? fa(item.licenseInfo.licenseNumber) : '—' }}
                      </span>
                    </li>
                    <li>
                      <span class="field-title">کد ملی:</span>
                      <span class="field-value">
                        {{ item.licenseInfo.nationalId !== '—' ? fa(item.licenseInfo.nationalId) : '—' }}
                      </span>
                    </li>
                    <li>
                      <span class="field-title">اتحادیه:</span>
                      <span class="field-value">{{ item.licenseInfo.unionName }}</span>
                    </li>
                    <li>
                      <span class="field-title">تاریخ صدور:</span>
                      <span class="field-value">{{ item.licenseInfo.issueDate }}</span>
                    </li>
                    <li>
                      <span class="field-title">آدرس:</span>
                      <span class="field-value">{{ item.licenseInfo.address }}</span>
                    </li>
                  </ul>
                </div>
              </div>

              <!-- Bottom Action Controls -->
              <div class="match-actions-bar">
                <div class="actions-prompt">
                  <strong>تعیین تکلیف تطبیق:</strong>
                </div>
                <div class="actions-buttons-group">
                  <button
                    type="button"
                    class="action-btn btn-verify"
                    :disabled="item.status === 'verified'"
                    @click="handleStatusChange(item, 'verified')"
                  >
                    <CheckCircle2 class="icon-sm" />
                    <span>تایید تطبیق</span>
                  </button>

                  <button
                    type="button"
                    class="action-btn btn-investigate"
                    :disabled="item.status === 'investigate'"
                    @click="handleStatusChange(item, 'investigate')"
                  >
                    <HelpCircle class="icon-sm" />
                    <span>بررسی میدانی</span>
                  </button>

                  <button
                    type="button"
                    class="action-btn btn-reject"
                    :disabled="item.status === 'rejected'"
                    @click="handleStatusChange(item, 'rejected')"
                  >
                    <XCircle class="icon-sm" />
                    <span>رد تطبیق</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredMatches.length === 0" class="empty-state shadow-card">
          موردی برای تطبیق ماده ۲۷ با مشخصات درخواستی یافت نشد.
        </div>
      </div>
    </PanelCard>
  </div>
</template>

<style scoped lang="scss">
.article27-match-view {
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

.guide-tag {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.data-table {
  width: 100%;
  min-width: 62rem;
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

.expandable-row {
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: oklch(from var(--muted) l c h / 60%);
  }

  &.is-expanded {
    background-color: oklch(from var(--primary) l c h / 6%);
  }
}

.id-wrapper {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.chevron {
  transition: transform 0.2s ease;
  color: var(--muted-foreground);

  &.rotate-180 {
    transform: rotate(180deg);
  }
}

.violation-pill {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
  background-color: oklch(from var(--warning) l c h / 20%);
  color: var(--warning-foreground);
  font-size: 0.6875rem;
  font-weight: 600;
}

.match-pill {
  display: inline-block;
  padding: 0.1875rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;

  &.status-pending {
    background-color: var(--muted);
    color: var(--muted-foreground);
  }
  &.status-verified {
    background-color: oklch(from var(--success) l c h / 15%);
    color: var(--success);
  }
  &.status-investigate {
    background-color: oklch(from var(--warning) l c h / 20%);
    color: var(--warning-foreground);
  }
  &.status-rejected {
    background-color: oklch(from var(--destructive) l c h / 12%);
    color: var(--destructive);
  }
}

.btn-toggle-row {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--foreground);
  border-radius: var(--radius-sm);
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
}

.expanded-detail-row {
  background-color: oklch(from var(--background) l c h / 80%);
}

.expanded-cell {
  padding: 1rem !important;
}

.comparison-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.mobile-match-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background-color: var(--card);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
  transition: all 0.2s ease;

  &.is-expanded {
    border-color: var(--primary);
  }
}

.card-head {
  cursor: pointer;
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

.card-meta-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.75rem;
  color: var(--muted-foreground);

  .meta-item {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
}

.card-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  background-color: var(--muted);
  border-radius: var(--radius-md);
  padding: 0.625rem 0.75rem;
  font-size: 0.75rem;

  .detail-cell {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;

    &.full-width {
      grid-column: span 2;
    }
  }

  .detail-label {
    color: var(--muted-foreground);
    font-size: 0.6875rem;
  }

  .detail-val {
    color: var(--foreground);
    font-weight: 500;
  }
}

.mobile-expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.45rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: rgba(59, 130, 246, 0.08);
  }
}

.mobile-expanded-content {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border);
}

.comparison-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr 1fr;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(230px, 1fr));
    overflow-x: auto;
    padding-bottom: 0.5rem;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      height: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background-color: var(--border);
      border-radius: 9999px;
    }
  }
}

.compare-card {
  scroll-snap-align: start;
  min-width: 0;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background-color: var(--card);
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;

  &.warning-box {
    border-color: oklch(from var(--warning) l c h / 40%);
  }

  &.license-box {
    border-color: oklch(from var(--primary) l c h / 40%);
  }
}

.box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}

.box-title {
  font-size: 0.8125rem;
  font-weight: 700;
  margin: 0;
  flex: 1;
}

.license-validity-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;

  &.is-valid {
    background-color: oklch(from var(--success) l c h / 15%);
    color: var(--success);
  }
  &.is-invalid {
    background-color: oklch(from var(--destructive) l c h / 12%);
    color: var(--destructive);
  }
}

.fields-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;

  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    border-bottom: 1px dashed oklch(from var(--border) l c h / 60%);
    padding-bottom: 0.35rem;

    &:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
  }
}

.field-title {
  color: var(--muted-foreground);
}

.field-value {
  color: var(--foreground);
  max-width: 65%;
  text-align: left;
}

.match-actions-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background-color: var(--card);
  padding: 0.75rem 1rem;
}

.actions-prompt {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.75rem;

  strong {
    color: var(--foreground);
  }
  span {
    color: var(--muted-foreground);
  }
}

.actions-buttons-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius-md);
  border: none;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.btn-verify {
    background-color: var(--success);
    color: var(--success-foreground);
  }

  &.btn-investigate {
    background-color: var(--warning);
    color: var(--warning-foreground);
  }

  &.btn-reject {
    background-color: var(--destructive);
    color: var(--destructive-foreground);
  }
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 0;
  color: var(--muted-foreground);
}
</style>

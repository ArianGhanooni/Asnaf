<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useUnitsStore } from 'src/stores/units';
import { useSessionStore } from 'src/stores/session';
import type { Unit } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import EditOperatorModal from 'src/components/inspections/EditOperatorModal.vue';
import UnionDismissalLetterDialog from 'src/components/inspections/UnionDismissalLetterDialog.vue';
import {
  Search,
  Calendar,
  Edit3,
  FileText,
  FileCheck,
  UploadCloud,
  CheckCircle,
  MapPin,
  Phone,
  User,
  X,
  File,
  Eye,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const unitsStore = useUnitsStore();
const sessionStore = useSessionStore();

const isUnion = computed(() => sessionStore.session?.role === 'union');
const isStaff = computed(() => {
  const role = sessionStore.session?.role;
  return role === 'general' || role === 'union' || role === 'admin';
});

// مهلت منع پیگیری (۱ ماهه یا ۳ ماهه)
const currentDuration = computed<'1m' | '3m'>(() => {
  if (isUnion.value) return '3m';
  return route.query.duration === '1m' ? '1m' : '3m';
});

const searchQuery = ref('');
const selectedUnitId = ref<number | null>(null);

// همگام‌سازی انتخاب واحد با Query روتر
watch(
  () => route.query.unit,
  (val) => {
    selectedUnitId.value = val ? Number(val) : null;
  },
  { immediate: true }
);

// واحدهای دارای منع پیگیری
const dismissedUnits = computed<Unit[]>(() => {
  const userOrg = sessionStore.session?.org || '';
  const dur = currentDuration.value;

  return unitsStore.units
    .filter((u) => u.status === 'dismissed')
    .filter((u) => {
      // فیلتر بر اساس مهلت (۱ ماه یا ۳ ماه)
      if (dur === '1m') {
        return u.dismissalDuration === '1m';
      }
      return u.dismissalDuration === '3m' || !u.dismissalDuration;
    })
    .filter((u) => {
      // فیلتر دسترسی سازمانی برای اتحادیه‌ها
      if (!isUnion.value || !userOrg) return true;
      return u.union.includes(userOrg) || userOrg.includes(u.union) || u.union.includes('نانوایان');
    });
});

const filteredUnits = computed<Unit[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return dismissedUnits.value;
  return dismissedUnits.value.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.operator.toLowerCase().includes(q) ||
      u.union.toLowerCase().includes(q) ||
      u.address.toLowerCase().includes(q) ||
      u.nationalId.includes(q)
  );
});

function handleSelectUnit(u: Unit): void {
  selectedUnitId.value = u.id;
  void router.replace({ query: { ...route.query, unit: String(u.id) } });
  const el = document.getElementById(`dismissed-card-${u.id}`) || document.getElementById(`dismissed-row-${u.id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function formatInspectionReason(v: string | undefined): string {
  if (!v) return 'ماده ۲۷ قانون نظام صنفی';
  if (
    v.includes('۲۸') ||
    v.includes('28') ||
    v.includes('گران') ||
    v.includes('نرخ') ||
    v.includes('شکایت') ||
    v.includes('کم‌فروشی')
  ) {
    return 'ماده ۲۸ قانون نظام صنفی';
  }
  return 'ماده ۲۷ قانون نظام صنفی';
}

// Dialog 1: ویرایش متصدی
const showEditModal = ref(false);
const activeUnitForEdit = ref<Unit | null>(null);

function openEdit(u: Unit): void {
  activeUnitForEdit.value = u;
  showEditModal.value = true;
}

// Dialog 2: پیش‌نویس نامه منع پیگیری
const showDraftModal = ref(false);
const activeUnitForDraft = ref<Unit | null>(null);

function handleOpenDraft(u: Unit): void {
  activeUnitForDraft.value = u;
  showDraftModal.value = true;
}

// Dialog 3: ثبت نامه ثبتی با امکان آپلود فایل (ویژه منع پیگیری ۱ ماهه)
const showRegistrationLetterModal = ref(false);
const targetUnitForRegistration = ref<Unit | null>(null);
const registrationLetterNo = ref('');
const registrationLetterDate = ref('1405/08/04');
const registrationNotes = ref('');
const uploadedFileName = ref<string | null>(null);
const uploadedFileSize = ref<string | null>(null);
const uploadedFileType = ref<string | null>('application/pdf');
const uploadedFileUrl = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const showFilePreviewModal = ref(false);

function handleOpenRegistrationModal(u: Unit): void {
  targetUnitForRegistration.value = u;
  registrationLetterNo.value = `ثبت/اهواز/${Date.now().toString().slice(-5)}`;
  registrationLetterDate.value = '1405/08/04';
  registrationNotes.value = 'انطباق مدارک ثبتی رسمی و اساسنامه جهت صدور پروانه کسب دائم';
  uploadedFileName.value = 'official_registration_letter.pdf';
  uploadedFileSize.value = '۱.۲ مگابایت';
  uploadedFileType.value = 'application/pdf';
  uploadedFileUrl.value = null;
  showRegistrationLetterModal.value = true;
}

function openFilePreview(): void {
  showFilePreviewModal.value = true;
}

function triggerFileInput(): void {
  fileInputRef.value?.click();
}

function handleFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    uploadedFileName.value = file.name;
    uploadedFileType.value = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    if (uploadedFileUrl.value) {
      URL.revokeObjectURL(uploadedFileUrl.value);
    }
    uploadedFileUrl.value = URL.createObjectURL(file);
    const sizeInKb = Math.round(file.size / 1024);
    uploadedFileSize.value = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} مگابایت` : `${sizeInKb} کیلوبایت`;
  }
}

function removeUploadedFile(): void {
  uploadedFileName.value = null;
  uploadedFileSize.value = null;
  uploadedFileType.value = null;
  if (uploadedFileUrl.value) {
    URL.revokeObjectURL(uploadedFileUrl.value);
    uploadedFileUrl.value = null;
  }
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}

function confirmRegistrationLetter(): void {
  if (!targetUnitForRegistration.value) return;
  const u = targetUnitForRegistration.value;
  const inspectorName = sessionStore.session?.name || 'کارشناس اتاق اصناف';
  const letterNumber = registrationLetterNo.value.trim() || `ثبت/اهواز/${Date.now().toString().slice(-5)}`;
  const fileStatus = uploadedFileName.value ? ` (فایل پیوست: ${uploadedFileName.value})` : '';

  const updatedNotes = u.notes
    ? `${u.notes} | ثبت نامه ثبتی شماره ${letterNumber}${fileStatus}`
    : `ثبت نامه ثبتی شماره ${letterNumber}${fileStatus}`;

  unitsStore.updateUnit(u.id, {
    notes: updatedNotes,
  });

  unitsStore.addAudit(
    inspectorName,
    `ثبت و بارگذاری نامه ثبتی ۱ ماهه`,
    `واحد: ${u.name} (شناسه نامه: ${letterNumber})`
  );

  $q.notify({
    type: 'positive',
    message: `نامه ثبتی واحد صنفی «${u.name}» با موفقیت ثبت و ضمیمه پرونده گردید.`,
    caption: `شماره نامه: ${letterNumber}`,
    position: 'top',
    timeout: 3500,
  });

  showRegistrationLetterModal.value = false;
}
</script>

<template>
  <div class="stage-page-container">
    <!-- Header with Stage Title -->
    <div class="stage-header-row">
      <div class="stage-title-wrap">
        <h1 class="stage-title">منع پیگیری واحدهای صنفی</h1>
      </div>
    </div>

    <!-- Search Input (بالای جدول و کارت‌ها) -->
    <div class="search-input-wrap">
      <Search class="search-icon" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="جستجوی واحد، متصدی، صنف یا آدرس..."
        class="stage-search-input"
        data-testid="dismissed-search-input"
      />
    </div>

    <!-- 1. Mobile Cards Grid (Default for mobile screen sizes, and for inspectors) -->
    <div :class="['units-cards-grid', { 'desktop-hidden': isStaff }]">
      <div
        v-for="u in filteredUnits"
        :id="`dismissed-card-${u.id}`"
        :key="u.id"
        :class="['unit-card', { 'is-selected': u.id === selectedUnitId }]"
        @click="handleSelectUnit(u)"
      >
        <div class="unit-card-header">
          <div class="unit-title-group">
            <h3 class="unit-name">{{ u.name }}</h3>
            <span class="unit-union">{{ u.union }}</span>
          </div>
          <span class="duration-tag" :class="currentDuration === '1m' ? 'is-1m' : 'is-3m'">
            {{ currentDuration === '1m' ? '۱ ماهه' : '۳ ماهه' }}
          </span>
        </div>

        <div class="unit-info-body">
          <div class="info-row">
            <User class="icon-xs text-muted" />
            <span>متصدی: <strong>{{ u.operator }}</strong> (کدملی: {{ fa(u.nationalId) }})</span>
          </div>
          <div class="info-row">
            <Calendar class="icon-xs text-muted" />
            <span>تاریخ تولد متصدی: {{ u.birthDate ? fa(u.birthDate) : '—' }}</span>
          </div>
          <div class="info-row">
            <Phone class="icon-xs text-muted" />
            <span>شماره همراه: {{ fa(u.mobile) }}</span>
          </div>
          <div class="info-row">
            <MapPin class="icon-xs text-muted" />
            <span>{{ u.region }} · {{ u.address }}</span>
          </div>
          <div class="violation-box">
            <span class="violation-label">علت بازرسی:</span>
            <span class="violation-text">{{ formatInspectionReason(u.violation) }}</span>
          </div>
          <div class="notes-box">
            <span class="notes-label">توضیحات: </span>
            <span class="notes-text">{{ u.notes || '' }}</span>
          </div>
        </div>

        <!-- Action Buttons (ویرایش متصدی + پیش‌نویس نامه منع پیگیری برای ۳ ماهه + ثبت نامه ثبتی برای ۱ ماهه) -->
        <div class="unit-actions">
          <button
            type="button"
            class="action-btn-secondary"
            @click.stop="openEdit(u)"
            data-testid="edit-operator-btn"
          >
            <Edit3 class="icon-xs" />
            <span>ویرایش</span>
          </button>

          <button
            v-if="currentDuration === '3m'"
            type="button"
            class="action-btn-primary"
            @click.stop="handleOpenDraft(u)"
            data-testid="draft-dismissal-btn"
          >
            <FileText class="icon-xs" />
            <span>پیش‌نویس منع پیگیری</span>
          </button>

          <button
            v-if="currentDuration === '1m'"
            type="button"
            class="action-btn-success"
            @click.stop="handleOpenRegistrationModal(u)"
            data-testid="register-letter-btn"
          >
            <UploadCloud class="icon-xs" />
            <span>ثبت نامه ثبتی</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 2. Desktop Table View for Monitor Screen (For Chamber of Commerce & Union roles) -->
    <div v-if="isStaff" class="desktop-table-container">
      <div class="table-card shadow-card">
        <div class="table-scroll-wrap">
          <table class="warnings-data-table" dir="rtl">
            <thead>
              <tr>
                <th class="th-unit">نام واحد صنفی و اتحادیه</th>
                <th class="th-operator">متصدی و کدملی</th>
                <th class="th-birth">تاریخ تولد</th>
                <th class="th-phone">شماره همراه</th>
                <th class="th-address">نشانی و منطقه</th>
                <th class="th-violation">علت بازرسی</th>
                <th class="th-actions">عملیات</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="u in filteredUnits" :key="u.id">
                <!-- سطر اصلی رکورد واحد صنفی -->
                <tr
                  :id="`dismissed-row-${u.id}`"
                  :class="['table-row', { 'is-selected': u.id === selectedUnitId }]"
                  @click="handleSelectUnit(u)"
                >
                  <!-- نام واحد صنفی و اتحادیه (راست‌چین) -->
                  <td class="td-unit">
                    <div class="unit-cell-wrap">
                      <span class="unit-name-text">{{ u.name }}</span>
                      <span class="unit-union-chip">{{ u.union }}</span>
                    </div>
                  </td>

                  <!-- متصدی و کدملی (وسط‌چین - هر مورد در یک خط) -->
                  <td class="td-operator">
                    <div class="op-cell-wrap">
                      <span class="op-name-text">{{ u.operator }}</span>
                      <span class="op-id-text">کدملی: {{ fa(u.nationalId) }}</span>
                    </div>
                  </td>

                  <!-- تاریخ تولد متصدی (وسط‌چین) -->
                  <td class="td-birth">
                    <span class="birth-date-text">{{ u.birthDate ? fa(u.birthDate) : '—' }}</span>
                  </td>

                  <!-- شماره همراه (وسط‌چین) -->
                  <td class="td-phone">
                    <a :href="`tel:${u.mobile}`" class="phone-link-text" dir="ltr" @click.stop>{{ fa(u.mobile) }}</a>
                  </td>

                  <!-- نشانی و منطقه (وسط‌چین - هر مورد در یک خط) -->
                  <td class="td-address">
                    <div class="address-cell-wrap" :title="u.address">
                      <span class="region-text">{{ u.region }}</span>
                      <span class="addr-text">{{ u.address }}</span>
                    </div>
                  </td>

                  <!-- علت بازرسی (وسط‌چین) -->
                  <td class="td-violation">
                    <span
                      :class="[
                        'violation-pill',
                        formatInspectionReason(u.violation).includes('۲۸') ? 'is-art28' : 'is-art27',
                      ]"
                    >
                      {{ formatInspectionReason(u.violation) }}
                    </span>
                  </td>

                  <!-- عملیات متناسب با نقش (ویرایش متصدی + پیش‌نویس نامه منع پیگیری + ثبت نامه ثبتی ۱ ماهه) -->
                  <td class="td-actions" @click.stop>
                    <div class="table-actions-group">
                      <!-- ۱. ویرایش متصدی -->
                      <button
                        type="button"
                        class="tbl-btn tbl-btn-edit"
                        @click="openEdit(u)"
                        data-testid="tbl-edit-operator-btn"
                        aria-label="ویرایش متصدی"
                      >
                        <Edit3 class="icon-xs" />
                        <q-tooltip class="action-tooltip" anchor="top middle" self="bottom middle" :offset="[0, 6]">
                          ویرایش متصدی
                        </q-tooltip>
                      </button>

                      <!-- ۲. پیش‌نویس نامه منع پیگیری (فقط برای مهلت ۳ ماهه) -->
                      <button
                        v-if="currentDuration === '3m'"
                        type="button"
                        class="tbl-btn tbl-btn-draft"
                        @click="handleOpenDraft(u)"
                        data-testid="tbl-draft-dismissal-btn"
                        aria-label="پیش‌نویس نامه منع پیگیری"
                      >
                        <FileText class="icon-xs" />
                        <q-tooltip class="action-tooltip" anchor="top middle" self="bottom middle" :offset="[0, 6]">
                          پیش‌نویس نامه منع پیگیری
                        </q-tooltip>
                      </button>

                      <!-- ۳. ثبت نامه ثبتی (ویژه مهلت ۱ ماهه) -->
                      <button
                        v-if="currentDuration === '1m'"
                        type="button"
                        class="tbl-btn tbl-btn-upload"
                        @click="handleOpenRegistrationModal(u)"
                        data-testid="tbl-register-letter-btn"
                        aria-label="ثبت و بارگذاری نامه ثبتی"
                      >
                        <UploadCloud class="icon-xs" />
                        <q-tooltip class="action-tooltip" anchor="top middle" self="bottom middle" :offset="[0, 6]">
                          ثبت و بارگذاری نامه ثبتی
                        </q-tooltip>
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- سطر فیلد توضیحات در زیر رکورد مربوطه -->
                <tr
                  :class="['table-notes-row', { 'is-selected': u.id === selectedUnitId }]"
                  @click="handleSelectUnit(u)"
                >
                  <td colspan="7" class="td-notes-sub">
                    <div class="notes-sub-inner">
                      <span class="notes-sub-label">توضیحات:</span>
                      <span class="notes-sub-content">{{ u.notes || 'توضیحی برای این پرونده ثبت نشده است.' }}</span>
                    </div>
                  </td>
                </tr>
              </template>

              <tr v-if="filteredUnits.length === 0">
                <td colspan="7" class="empty-table-state">
                  هیچ پرونده منع پیگیری‌ای مطابق جستجو یافت نشد.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal 1: ویرایش متصدی -->
    <EditOperatorModal
      v-model="showEditModal"
      :unit="activeUnitForEdit"
    />

    <!-- Modal 2: پیش‌نویس رسمی نامه منع پیگیری -->
    <UnionDismissalLetterDialog
      v-model="showDraftModal"
      :unit="activeUnitForDraft"
      request-type="dismissal"
      @submitted="showDraftModal = false"
    />

    <!-- Modal 3: ثبت و بارگذاری نامه ثبتی (ویژه مهلت ۱ ماهه) -->
    <q-dialog
      v-model="showRegistrationLetterModal"
      persistent
      transition-show="scale"
      transition-hide="scale"
    >
      <q-card class="custom-action-dialog-card" dir="rtl" data-testid="registration-letter-dialog">
        <q-card-section class="custom-dialog-header">
          <div class="header-left-group">
            <div class="dialog-icon-wrap is-success">
              <FileCheck class="dialog-header-icon" />
            </div>
            <h3 class="dialog-header-title">ثبت و بارگذاری نامه ثبتی (مهلت ۱ ماهه)</h3>
          </div>
          <button
            type="button"
            class="dialog-close-btn"
            @click="showRegistrationLetterModal = false"
            aria-label="بستن"
          >
            <X class="icon-sm" />
          </button>
        </q-card-section>

        <q-separator />

        <q-card-section class="custom-dialog-body">
          <p class="dialog-message-text">
            متصدی واحد صنفی «<strong>{{ targetUnitForRegistration?.name }}</strong>» نامه رسمی اداره ثبت شرکت‌ها / املاک را ارائه نموده است. لطفاً مشخصات نامه و فایل اسکن‌شده را جهت ثبت در پرونده بارگذاری فرمایید:
          </p>

          <div class="dialog-field-group">
            <label class="dialog-field-label" for="reg-letter-no-input">شماره نامه ثبتی:</label>
            <input
              id="reg-letter-no-input"
              v-model="registrationLetterNo"
              type="text"
              class="custom-modal-input"
              placeholder="مثال: ث/اهواز/۱۴۰۵-۸۹۲"
              data-testid="input-reg-letter-no"
            />
          </div>

          <div class="dialog-field-group">
            <label class="dialog-field-label" for="reg-letter-date-input">تاریخ صدور نامه ثبتی:</label>
            <div class="date-picker-field">
              <input
                id="reg-letter-date-input"
                v-model="registrationLetterDate"
                type="text"
                class="custom-modal-input ltr-input date-input"
                placeholder="مثال: ۱۴۰۵/۰۸/۰۴"
                data-testid="input-reg-letter-date"
              />
              <button type="button" class="btn-picker" title="انتخاب تاریخ از تقویم شمسی">
                <q-icon name="event" size="1.2rem" />
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="registrationLetterDate"
                    calendar="persian"
                    mask="YYYY/MM/DD"
                    today-btn
                  >
                    <div class="row items-center justify-end q-pa-xs">
                      <q-btn v-close-popup label="تأیید" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </button>
            </div>
          </div>

          <!-- Upload Box -->
          <div class="dialog-field-group">
            <label class="dialog-field-label">بارگذاری تصویر یا اسکن نامه ثبتی (PDF/تصویر):</label>
            <input
              ref="fileInputRef"
              type="file"
              accept=".pdf,image/*"
              style="display: none;"
              @change="handleFileChange"
            />

            <div v-if="!uploadedFileName" class="upload-dropzone" @click="triggerFileInput" data-testid="upload-dropzone">
              <UploadCloud class="upload-icon" />
              <div class="upload-text-group">
                <span class="upload-primary-text">کلیک کنید یا فایل را بکشید و رها کنید</span>
                <span class="upload-hint-text">فرمت‌های مجاز: PDF، JPG، PNG (حداکثر ۵ مگابایت)</span>
              </div>
            </div>

            <div v-else class="uploaded-file-card" data-testid="uploaded-file-card">
              <div class="file-info-group">
                <File class="icon-sm text-primary" />
                <div class="file-texts">
                  <span class="file-name">{{ uploadedFileName }}</span>
                  <span class="file-size">{{ uploadedFileSize }}</span>
                </div>
              </div>
              <div class="file-actions-group">
                <button
                  type="button"
                  class="btn-file-preview"
                  @click="openFilePreview"
                  aria-label="پیش‌نمایش سند"
                  title="پیش‌نمایش سند"
                  data-testid="btn-preview-file"
                >
                  <Eye class="icon-xs" />
                  <span>پیش‌نمایش</span>
                </button>
                <button
                  type="button"
                  class="btn-remove-file"
                  @click="removeUploadedFile"
                  aria-label="حذف فایل"
                  title="حذف فایل"
                >
                  <X class="icon-xs" />
                </button>
              </div>
            </div>
          </div>

          <div class="dialog-field-group">
            <label class="dialog-field-label" for="reg-notes-input">توضیحات و مستندات ثبتی:</label>
            <textarea
              id="reg-notes-input"
              v-model="registrationNotes"
              rows="2"
              class="custom-modal-textarea"
              placeholder="توضیحات انطباق نامه ثبتی با متصدی و ملک صنفی..."
              data-testid="input-reg-notes"
            ></textarea>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions class="custom-dialog-footer">
          <button
            type="button"
            class="btn-dialog-cancel"
            @click="showRegistrationLetterModal = false"
          >
            انصراف
          </button>
          <button
            type="button"
            class="btn-dialog-action is-success"
            @click="confirmRegistrationLetter"
            data-testid="btn-confirm-registration-letter"
          >
            <CheckCircle class="icon-xs" />
            <span>تایید و ثبت نامه ثبتی</span>
          </button>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Modal 4: پیش‌نمایش فایل نامه ثبتی -->
    <q-dialog
      v-model="showFilePreviewModal"
      transition-show="scale"
      transition-hide="scale"
    >
      <q-card class="preview-dialog-card" dir="rtl" data-testid="file-preview-dialog">
        <q-card-section class="preview-dialog-header">
          <div class="header-left-group">
            <div class="dialog-icon-wrap is-primary">
              <FileText class="dialog-header-icon" />
            </div>
            <div class="header-titles">
              <h3 class="preview-title">پیش‌نمایش سند / نامه ثبتی</h3>
              <span class="preview-subtitle">{{ uploadedFileName || 'سند پیوست' }} ({{ uploadedFileSize || '' }})</span>
            </div>
          </div>
          <button
            type="button"
            class="dialog-close-btn"
            @click="showFilePreviewModal = false"
            aria-label="بستن پیش‌نمایش"
          >
            <X class="icon-sm" />
          </button>
        </q-card-section>

        <q-separator />

        <q-card-section class="preview-dialog-body">
          <!-- در صورتی که کاربر فایل واقعی آپلود کرده باشد -->
          <template v-if="uploadedFileUrl">
            <iframe
              v-if="uploadedFileType === 'application/pdf'"
              :src="uploadedFileUrl"
              class="preview-iframe"
              title="پیش‌نمایش سند PDF"
            />
            <div v-else class="preview-img-wrapper">
              <img :src="uploadedFileUrl" alt="پیش‌نمایش تصویر نامه" class="preview-image" />
            </div>
          </template>

          <!-- در حالت پیش‌فرض و فایل نمونه سیستم official_registration_letter.pdf -->
          <div v-else class="official-sheet-preview">
            <div class="official-sheet-paper">
              <div class="sheet-header">
                <div class="header-side">
                  <div>شماره: <strong>{{ registrationLetterNo || 'ثبت/اهواز/۱۴۰۵-۸۹۲' }}</strong></div>
                  <div>تاریخ: <strong>{{ registrationLetterDate || '۱۴۰۵/۰۸/۰۴' }}</strong></div>
                  <div>پیوست: <strong>دارد (برگ اساسنامه)</strong></div>
                </div>
                <div class="header-center">
                  <div class="emblem-text">جمهوری اسلامی ایران</div>
                  <div class="sub-emblem">قوه قضائیه - سازمان ثبت اسناد و املاک کشور</div>
                  <div class="org-name">اداره کل ثبت اسناد و املاک استان خوزستان</div>
                  <div class="unit-branch">اداره ثبت شرکت‌ها و مؤسسات غیرتجاری اهواز</div>
                </div>
                <div class="header-side qr-side">
                  <div class="mock-qr-box">
                    <span class="qr-label">شناسه یکتای ثبت:</span>
                    <span class="qr-code">۱۰۴۲۰۰۹۸۵۶</span>
                  </div>
                </div>
              </div>

              <div class="sheet-title-banner">
                <span>«گواهی رسمی تسلیم اسناد تاسیس و ثبت تغییرات»</span>
              </div>

              <div class="sheet-body-content">
                <p><strong>به: اتاق اصناف اهواز - واحد اجرائیات و نظارت بر بازرسی</strong></p>
                <p><strong>موضوع:</strong> گواهی تسلیم اسناد ثبتی متصدی و واحد صنفی</p>
                <p class="sheet-text-paragraph">
                  احتراماً عطف به استعلام متصدی محترم، بدین‌وسیله گواهی می‌شود مدارک و مستندات قانونی ثبت، ملک تجاری و اساسنامه واحد صنفی به نام
                  <strong>«{{ targetUnitForRegistration?.name || 'واحد صنفی' }}»</strong>
                  به تصدی آقای/خانم
                  <strong>«{{ targetUnitForRegistration?.operator || 'متصدی مربوطه' }}»</strong>
                  (شماره ملی {{ fa(targetUnitForRegistration?.nationalId || '') }})
                  در این اداره واصل و تحت پرونده رسمی ثبتی فوق در جریان صدور دفاتر قانونی و آگهی روزنامه رسمی قرار گرفته است.
                </p>
                <p class="sheet-text-paragraph">
                  این گواهی جهت ارائه به اتاق اصناف اهواز جهت اعمال مهلت قانونی ۱ ماهه موضوع آیین‌نامه اجرایی ماده ۲۷/۲۸ قانون نظام صنفی صادر گردیده و دارای اعتبار رسمی اداری می‌باشد.
                </p>
              </div>

              <div class="sheet-footer">
                <div class="stamp-box">
                  <div class="stamp-circle">
                    <span>اداره ثبت اسناد و املاک</span>
                    <span class="stamp-verified">ثبت شد - معتبر</span>
                  </div>
                </div>
                <div class="sign-box">
                  <div>رئیس اداره ثبت اسناد و املاک اهواز</div>
                  <div class="sign-title">از طرف: امور اسناد و شرکت‌ها</div>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions class="preview-dialog-footer">
          <button
            type="button"
            class="btn-dialog-cancel"
            @click="showFilePreviewModal = false"
          >
            بستن پیش‌نمایش
          </button>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped lang="scss">
.stage-page-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 80rem;
  margin: 0 auto;
  width: 100%;
}

.stage-header-row {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.stage-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stage-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--foreground);
  margin: 0;
}

/* Search Bar */
.search-input-wrap {
  position: relative;
  width: 100%;

  .search-icon {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.15rem;
    height: 1.15rem;
    color: var(--muted-foreground);
    pointer-events: none;
  }

  .stage-search-input {
    width: 100%;
    height: 3rem;
    padding-right: 2.85rem;
    padding-left: 1rem;
    border-radius: var(--radius-xl);
    border: 1px solid var(--border);
    background-color: var(--card);
    color: var(--foreground);
    font-size: 0.875rem;
    outline: none;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

    &:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px oklch(from var(--primary) l c h / 15%);
    }

    &::placeholder {
      color: var(--muted-foreground);
    }
  }
}

/* 1. Mobile Cards Grid */
.units-cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  &.desktop-hidden {
    @media (min-width: 1024px) {
      display: none !important;
    }
  }
}

.unit-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--primary);
    box-shadow: 0 4px 12px oklch(from var(--primary) l c h / 8%);
  }

  &.is-selected {
    border-color: var(--primary);
    background-color: oklch(from var(--primary) l c h / 4%);
    box-shadow: 0 0 0 2px var(--primary);
  }
}

.unit-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;

  .duration-tag {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-sm);

    &.is-1m {
      background-color: oklch(from var(--primary) l c h / 10%);
      color: var(--primary);
    }

    &.is-3m {
      background-color: oklch(from #d97706 l c h / 10%);
      color: #b45309;
    }
  }
}

.unit-title-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.unit-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 0;
  line-height: 1.4;
}

.unit-union {
  font-size: 0.75rem;
  color: var(--primary);
  font-weight: 600;
}

.unit-info-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--foreground);

  .info-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    line-height: 1.4;
  }

  .violation-box {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.65rem;
    background-color: oklch(from var(--muted) l c h / 50%);
    border-radius: var(--radius-sm);
    font-size: 0.775rem;
    margin-top: 0.25rem;

    .violation-label {
      color: var(--muted-foreground);
      font-weight: 600;
    }

    .violation-text {
      color: var(--foreground);
      font-weight: 700;
    }
  }

  .notes-box {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    padding: 0.4rem 0.65rem;
    background-color: oklch(from var(--primary) l c h / 4%);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    line-height: 1.4;

    .notes-label {
      color: var(--primary);
      font-weight: 700;
      white-space: nowrap;
    }

    .notes-text {
      color: var(--foreground);
    }
  }
}

.unit-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);

  button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.45rem 0.65rem;
    border-radius: var(--radius-md);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }

  .action-btn-secondary {
    background: var(--muted);
    color: var(--foreground);
    border-color: var(--border);

    &:hover {
      background: oklch(from var(--foreground) l c h / 8%);
    }
  }

  .action-btn-primary {
    background: var(--primary);
    color: #ffffff;

    &:hover {
      filter: brightness(1.1);
    }
  }

  .action-btn-success {
    background: #059669;
    color: #ffffff;

    &:hover {
      background: #047857;
    }
  }
}

/* 2. Desktop Table View for Monitor Screen */
.desktop-table-container {
  display: none;
  width: 100%;

  @media (min-width: 1024px) {
    display: block;
  }
}

.table-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.table-scroll-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.warnings-data-table {
  width: 100%;
  min-width: 960px;
  border-collapse: collapse;
  font-size: 0.8125rem;

  thead {
    background-color: var(--muted);
    border-bottom: 1px solid var(--border);

    th {
      padding: 0.85rem 0.85rem;
      font-weight: 700;
      color: var(--muted-foreground);
      font-size: 0.775rem;
      white-space: nowrap;
      text-align: center;

      &.th-unit {
        text-align: right;
      }
    }
  }

  tbody {
    tr.table-row {
      border-top: 1px solid var(--border);
      transition: background-color 0.15s ease;
      cursor: pointer;

      td {
        padding: 0.75rem 0.85rem;
        vertical-align: middle;
        white-space: nowrap;
        text-align: center;

        &.td-unit {
          text-align: right;
        }
      }
    }

    tr.table-notes-row {
      border-bottom: 1px solid var(--border);
      background-color: oklch(from var(--muted) l c h / 18%);
      transition: background-color 0.15s ease;
      cursor: pointer;

      td.td-notes-sub {
        padding: 0.35rem 0.85rem 0.6rem;
        text-align: right;
        vertical-align: middle;
      }
    }

    tr.table-row,
    tr.table-notes-row {
      &.is-selected {
        background-color: oklch(from var(--primary) l c h / 8%);

        .unit-name-text {
          color: var(--primary);
        }
      }
    }

    tr.table-row:hover,
    tr.table-row:hover + tr.table-notes-row,
    tr.table-notes-row:hover,
    tr.table-row:has(+ tr.table-notes-row:hover) {
      background-color: oklch(from var(--primary) l c h / 4%);
    }
  }
}

.unit-cell-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: right;
  gap: 0.2rem;
  white-space: nowrap;

  .unit-name-text {
    font-weight: 700;
    color: var(--foreground);
    font-size: 0.875rem;
    white-space: nowrap;
  }

  .unit-union-chip {
    font-size: 0.6875rem;
    color: var(--primary);
    font-weight: 600;
    white-space: nowrap;
  }
}

.op-cell-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.15rem;
  white-space: nowrap;

  .op-name-text {
    font-weight: 700;
    color: var(--foreground);
    white-space: nowrap;
  }

  .op-id-text {
    font-size: 0.6875rem;
    color: var(--muted-foreground);
    white-space: nowrap;
  }
}

.birth-date-text {
  font-size: 0.75rem;
  color: var(--foreground);
  white-space: nowrap;
  text-align: center;
}

.phone-link-text {
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--foreground);
  text-decoration: none;
  direction: ltr;
  display: inline-block;
  white-space: nowrap;
  text-align: center;

  &:hover {
    color: var(--primary);
    text-decoration: underline;
  }
}

.address-cell-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.15rem;
  white-space: nowrap;

  .region-text {
    font-weight: 600;
    color: var(--foreground);
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .addr-text {
    font-size: 0.6875rem;
    color: var(--muted-foreground);
    white-space: nowrap;
  }
}

.violation-pill {
  display: inline-block;
  padding: 0.25rem 0.55rem;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 700;
  white-space: nowrap;
  text-align: center;

  &.is-art27 {
    background-color: oklch(from #ea580c l c h / 12%);
    color: #c2410c;
    border: 1px solid oklch(from #ea580c l c h / 25%);
  }

  &.is-art28 {
    background-color: oklch(from #2563eb l c h / 12%);
    color: #1d4ed8;
    border: 1px solid oklch(from #2563eb l c h / 25%);
  }
}

.notes-sub-inner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.775rem;
  text-align: right;

  .notes-sub-label {
    font-weight: 700;
    color: var(--foreground);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .notes-sub-content {
    color: var(--muted-foreground);
    font-weight: 500;
    line-height: 1.4;
  }
}

.table-actions-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.tbl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.05rem;
  height: 2.05rem;
  padding: 0;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;

  .icon-xs {
    width: 1rem;
    height: 1rem;
  }

  &.tbl-btn-edit {
    background: oklch(from var(--primary) l c h / 10%);
    color: var(--primary);
    border-color: oklch(from var(--primary) l c h / 25%);

    &:hover {
      background: oklch(from var(--primary) l c h / 18%);
    }
  }

  &.tbl-btn-draft {
    background: oklch(from #2563eb l c h / 12%);
    color: #2563eb;
    border-color: oklch(from #2563eb l c h / 25%);

    &:hover {
      background: #2563eb;
      color: #ffffff;
    }
  }

  &.tbl-btn-upload {
    background: oklch(from #059669 l c h / 12%);
    color: #059669;
    border-color: oklch(from #059669 l c h / 25%);

    &:hover {
      background: #059669;
      color: #ffffff;
    }
  }
}

:deep(.action-tooltip) {
  background-color: var(--foreground) !important;
  color: var(--background) !important;
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  padding: 0.35rem 0.65rem !important;
  border-radius: var(--radius-sm) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18) !important;
  font-family: inherit !important;
}

.empty-table-state {
  padding: 3rem 1rem;
  text-align: center;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

/* Modals & Dialogs */
.custom-action-dialog-card {
  width: 100%;
  max-width: 32rem;
  max-height: 90vh;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-xl);
  background-color: var(--card);
  color: var(--foreground);
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.custom-dialog-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.15rem 1.35rem;
  background-color: var(--card);

  .header-left-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;

    .dialog-icon-wrap {
      width: 2.4rem;
      height: 2.4rem;
      border-radius: 0.65rem;
      display: grid;
      place-items: center;

      &.is-success {
        background-color: oklch(from #059669 l c h / 12%);
        color: #059669;
      }
      &.is-primary {
        background-color: oklch(from #2563eb l c h / 12%);
        color: #2563eb;
      }

      .dialog-header-icon {
        width: 1.35rem;
        height: 1.35rem;
      }
    }

    .dialog-header-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--foreground);
    }
  }

  .dialog-close-btn {
    display: grid;
    place-items: center;
    background: none;
    border: none;
    padding: 0.35rem;
    border-radius: 0.4rem;
    color: var(--muted-foreground);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: oklch(from var(--foreground) l c h / 10%);
      color: var(--foreground);
    }
  }
}

.custom-dialog-body {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.35rem;

  .dialog-message-text {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--foreground);
  }

  .dialog-field-group {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;

    .dialog-field-label {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--foreground);
    }

    .custom-modal-input {
      width: 100%;
      height: 2.65rem;
      padding: 0 0.85rem;
      border-radius: 0.65rem;
      border: 1px solid var(--border);
      background-color: var(--background);
      color: var(--foreground);
      font-size: 0.875rem;
      outline: none;
      transition: all 0.2s ease;

      &:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px oklch(from var(--primary) l c h / 15%);
      }
    }

    .date-picker-field {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;

      .date-input {
        padding-right: 2.75rem !important;
        padding-left: 0.75rem !important;
        font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, sans-serif !important;
      }

      .btn-picker {
        position: absolute;
        right: 0.4rem !important;
        left: auto !important;
        top: 50%;
        transform: translateY(-50%);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 0.4rem;
        background: transparent;
        border: none;
        color: var(--primary);
        cursor: pointer;
        z-index: 2;
        transition: background-color 0.15s ease;

        &:hover {
          background-color: oklch(from var(--primary) l c h / 12%);
        }
      }
    }

    .custom-modal-textarea {
      width: 100%;
      padding: 0.65rem 0.85rem;
      border-radius: 0.65rem;
      border: 1px solid var(--border);
      background-color: var(--background);
      color: var(--foreground);
      font-size: 0.875rem;
      font-family: inherit;
      outline: none;
      resize: vertical;
      min-height: 4rem;
      transition: all 0.2s ease;

      &:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px oklch(from var(--primary) l c h / 15%);
      }
    }
  }
}

/* Upload Dropzone & File Card */
.upload-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  padding: 1.25rem;
  border: 2px dashed var(--border);
  border-radius: 0.75rem;
  background-color: oklch(from var(--muted) l c h / 30%);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;

  &:hover {
    border-color: var(--primary);
    background-color: oklch(from var(--primary) l c h / 4%);
  }

  .upload-icon {
    width: 2rem;
    height: 2rem;
    color: var(--primary);
  }

  .upload-text-group {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;

    .upload-primary-text {
      font-size: 0.825rem;
      font-weight: 700;
      color: var(--foreground);
    }

    .upload-hint-text {
      font-size: 0.725rem;
      color: var(--muted-foreground);
    }
  }
}

.uploaded-file-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: 0.65rem;
  background-color: oklch(from var(--primary) l c h / 8%);
  border: 1px solid oklch(from var(--primary) l c h / 20%);
  gap: 0.75rem;

  .file-info-group {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;

    .file-texts {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;

      .file-name {
        font-size: 0.825rem;
        font-weight: 700;
        color: var(--foreground);
        direction: ltr;
        text-align: right;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .file-size {
        font-size: 0.7rem;
        color: var(--muted-foreground);
      }
    }
  }

  .file-actions-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;

    .btn-file-preview {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.65rem;
      border-radius: 0.45rem;
      background-color: oklch(from var(--primary) l c h / 12%);
      color: var(--primary);
      font-size: 0.75rem;
      font-weight: 700;
      border: 1px solid oklch(from var(--primary) l c h / 25%);
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background-color: var(--primary);
        color: #ffffff;
      }
    }

    .btn-remove-file {
      background: none;
      border: none;
      padding: 0.35rem;
      border-radius: 0.4rem;
      color: #ef4444;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background-color: rgba(239, 68, 68, 0.12);
      }
    }
  }
}

.custom-dialog-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 1rem 1.25rem;
  background-color: var(--muted);

  .btn-dialog-cancel {
    padding: 0.55rem 1.15rem;
    border-radius: 0.55rem;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--foreground);
    font-size: 0.825rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: var(--muted);
      border-color: var(--muted-foreground);
    }
  }

  .btn-dialog-action {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1.25rem;
    border-radius: 0.55rem;
    border: none;
    font-size: 0.825rem;
    font-weight: 700;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.15s ease;

    &.is-success {
      background-color: #059669;
      &:hover {
        background-color: #047857;
      }
    }
  }
}

/* File Preview Modal Styles */
.preview-dialog-card {
  width: 100%;
  max-width: 48rem;
  max-height: 90vh;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-xl);
  background-color: var(--card);
  color: var(--foreground);
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.preview-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background-color: var(--card);
  flex-shrink: 0;

  .header-left-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;

    .dialog-icon-wrap {
      width: 2.4rem;
      height: 2.4rem;
      border-radius: 0.65rem;
      display: grid;
      place-items: center;

      &.is-primary {
        background-color: oklch(from #2563eb l c h / 12%);
        color: #2563eb;
      }

      .dialog-header-icon {
        width: 1.35rem;
        height: 1.35rem;
      }
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;

      .preview-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 800;
        color: var(--foreground);
      }

      .preview-subtitle {
        font-size: 0.725rem;
        color: var(--muted-foreground);
        direction: ltr;
        text-align: right;
      }
    }
  }

  .dialog-close-btn {
    display: grid;
    place-items: center;
    background: none;
    border: none;
    padding: 0.35rem;
    border-radius: 0.4rem;
    color: var(--muted-foreground);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: oklch(from var(--foreground) l c h / 10%);
      color: var(--foreground);
    }
  }
}

.preview-dialog-body {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1.25rem;
  background-color: oklch(from var(--muted) l c h / 45%);

  .preview-iframe {
    width: 100%;
    height: 65vh;
    border: none;
    border-radius: 0.5rem;
    background-color: #ffffff;
  }

  .preview-img-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;

    .preview-image {
      max-width: 100%;
      max-height: 65vh;
      object-fit: contain;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
  }

  .official-sheet-preview {
    display: flex;
    justify-content: center;
    padding: 0.5rem 0;

    .official-sheet-paper {
      width: 100%;
      max-width: 42rem;
      background-color: #ffffff;
      color: #111827;
      padding: 2.25rem 2.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      border: 1px solid #e5e7eb;
      font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.7;

      .sheet-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #1f2937;
        padding-bottom: 1rem;
        margin-bottom: 1.25rem;

        .header-side {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-size: 0.775rem;
          color: #374151;

          &.qr-side {
            align-items: flex-end;
          }

          .mock-qr-box {
            padding: 0.5rem 0.65rem;
            border: 1px dashed #9ca3af;
            border-radius: 0.35rem;
            text-align: center;
            background: #f9fafb;

            .qr-label {
              display: block;
              font-size: 0.65rem;
              color: #6b7280;
            }
            .qr-code {
              font-size: 0.75rem;
              font-weight: 800;
              letter-spacing: 1px;
              color: #111827;
            }
          }
        }

        .header-center {
          text-align: center;

          .emblem-text {
            font-size: 0.85rem;
            font-weight: 700;
            color: #1f2937;
          }
          .sub-emblem {
            font-size: 0.8rem;
            font-weight: 700;
            color: #374151;
          }
          .org-name {
            font-size: 0.875rem;
            font-weight: 800;
            color: #111827;
            margin-top: 0.2rem;
          }
          .unit-branch {
            font-size: 0.775rem;
            color: #4b5563;
          }
        }
      }

      .sheet-title-banner {
        text-align: center;
        margin-bottom: 1.25rem;

        span {
          display: inline-block;
          font-size: 0.95rem;
          font-weight: 800;
          color: #1e3a8a;
          padding: 0.35rem 1rem;
          background: #eff6ff;
          border-radius: 0.4rem;
          border: 1px solid #bfdbfe;
        }
      }

      .sheet-body-content {
        font-size: 0.85rem;
        color: #1f2937;

        p {
          margin-bottom: 0.75rem;
        }

        .sheet-text-paragraph {
          text-align: justify;
          text-indent: 1.5rem;
          line-height: 1.85;
        }
      }

      .sheet-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 2rem;
        padding-top: 1.25rem;

        .stamp-box {
          .stamp-circle {
            width: 5.5rem;
            height: 5.5rem;
            border-radius: 50%;
            border: 2px dashed #dc2626;
            color: #dc2626;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transform: rotate(-10deg);
            opacity: 0.85;
            text-align: center;
            font-size: 0.65rem;
            font-weight: 800;
            padding: 0.25rem;

            .stamp-verified {
              font-size: 0.6rem;
              margin-top: 0.2rem;
              border-top: 1px solid #dc2626;
              padding-top: 0.15rem;
            }
          }
        }

        .sign-box {
          text-align: center;
          font-size: 0.825rem;
          font-weight: 700;
          color: #111827;

          .sign-title {
            font-size: 0.725rem;
            font-weight: 500;
            color: #4b5563;
            margin-top: 0.25rem;
          }
        }
      }
    }
  }
}

.preview-dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 0.85rem 1.25rem;
  background-color: var(--muted);
  flex-shrink: 0;
}
</style>


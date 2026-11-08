<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ChamberUserAccount, ChamberRoleTitle, ChamberUserPermissions } from 'src/stores/chamberUsers';
import { useChamberUsersStore } from 'src/stores/chamberUsers';
import { useQuasar } from 'quasar';
import { UserPlus, UserCog, X, Save, Eye, EyeOff, Trash2 } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: boolean;
  user: ChamberUserAccount | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved', user: ChamberUserAccount): void;
  (e: 'deleted', id: number): void;
}>();

const $q = useQuasar();
const chamberUsersStore = useChamberUsersStore();

const showPassword = ref(false);

const form = ref<{
  fullName: string;
  username: string;
  nationalId: string;
  mobile: string;
  roleTitle: ChamberRoleTitle;
  password: string;
  isActive: boolean;
  permissions: ChamberUserPermissions;
}>({
  fullName: '',
  username: '',
  nationalId: '',
  mobile: '',
  roleTitle: 'کارشناس اجرائیات و پلمپ',
  password: '',
  isActive: true,
  permissions: {
    canIssueAmakenSealOrder: true,
    canReferSecondWarning: true,
    canDispatchJointMissions: false,
    canViewAuditLogs: false,
    canManageUnions: false,
  },
});

watch(
  () => [props.user, props.modelValue],
  () => {
    showPassword.value = false;
    if (props.user) {
      form.value = {
        fullName: props.user.fullName,
        username: props.user.username || '',
        nationalId: props.user.nationalId,
        mobile: props.user.mobile,
        roleTitle: props.user.roleTitle,
        password: '',
        isActive: props.user.isActive,
        permissions: { ...props.user.permissions },
      };
    } else {
      form.value = {
        fullName: '',
        username: '',
        nationalId: '',
        mobile: '',
        roleTitle: 'کارشناس اجرائیات و پلمپ',
        password: '',
        isActive: true,
        permissions: {
          canIssueAmakenSealOrder: true,
          canReferSecondWarning: true,
          canDispatchJointMissions: false,
          canViewAuditLogs: false,
          canManageUnions: false,
        },
      };
    }
  },
  { immediate: true }
);

function handleRoleChange(newRole: ChamberRoleTitle): void {
  form.value.roleTitle = newRole;
  // پری‌ست هوشمند دسترسی‌ها متناسب با نقش
  if (newRole === 'رئیس اتاق اصناف') {
    form.value.permissions = {
      canIssueAmakenSealOrder: true,
      canReferSecondWarning: true,
      canDispatchJointMissions: true,
      canViewAuditLogs: true,
      canManageUnions: true,
    };
  } else if (newRole === 'مدیر بازرسی و نظارت') {
    form.value.permissions = {
      canIssueAmakenSealOrder: true,
      canReferSecondWarning: true,
      canDispatchJointMissions: true,
      canViewAuditLogs: true,
      canManageUnions: false,
    };
  } else if (newRole === 'کارشناس اجرائیات و پلمپ') {
    form.value.permissions = {
      canIssueAmakenSealOrder: true,
      canReferSecondWarning: true,
      canDispatchJointMissions: false,
      canViewAuditLogs: false,
      canManageUnions: false,
    };
  } else if (newRole === 'کارشناس ممیزی و سامانه') {
    form.value.permissions = {
      canIssueAmakenSealOrder: false,
      canReferSecondWarning: false,
      canDispatchJointMissions: false,
      canViewAuditLogs: true,
      canManageUnions: true,
    };
  } else if (newRole === 'کارشناس پذیرش و امور اصناف') {
    form.value.permissions = {
      canIssueAmakenSealOrder: false,
      canReferSecondWarning: true,
      canDispatchJointMissions: false,
      canViewAuditLogs: false,
      canManageUnions: true,
    };
  }
}

function handleSave(): void {
  if (!form.value.fullName.trim() || !form.value.username.trim() || !form.value.nationalId.trim() || !form.value.mobile.trim()) {
    $q.notify({
      type: 'warning',
      message: 'لطفاً تمامی فیلدهای الزامی (نام، نام کاربری، کد ملی و شماره همراه) را پر نمایید.',
      position: 'top',
    });
    return;
  }

  if (!props.user && !form.value.password.trim()) {
    $q.notify({
      type: 'warning',
      message: 'لطفاً کلمه عبور را برای حساب کاربری جدید وارد نمایید.',
      position: 'top',
    });
    return;
  }

  if (props.user) {
    const patch: Partial<ChamberUserAccount> = {
      fullName: form.value.fullName.trim(),
      username: form.value.username.trim(),
      nationalId: form.value.nationalId.trim(),
      mobile: form.value.mobile.trim(),
      roleTitle: form.value.roleTitle,
      isActive: form.value.isActive,
      permissions: form.value.permissions,
    };
    if (form.value.password?.trim()) {
      patch.password = form.value.password.trim();
    }
    chamberUsersStore.updateChamberUser(props.user.id, patch);

    const updated = chamberUsersStore.chamberUsers.find((u) => u.id === props.user?.id);
    if (updated) {
      emit('saved', updated);
    }

    $q.notify({
      type: 'positive',
      message: 'اطلاعات و سطوح دسترسی کاربر اتاق اصناف با موفقیت به‌روزرسانی شد.',
      position: 'top',
    });
  } else {
    const created = chamberUsersStore.addChamberUser({
      fullName: form.value.fullName.trim(),
      username: form.value.username.trim(),
      nationalId: form.value.nationalId.trim(),
      mobile: form.value.mobile.trim(),
      roleTitle: form.value.roleTitle,
      isActive: form.value.isActive,
      password: form.value.password.trim(),
      permissions: form.value.permissions,
    });

    emit('saved', created);

    $q.notify({
      type: 'positive',
      message: `حساب کاربری «${created.fullName}» در اتاق اصناف با موفقیت ایجاد شد.`,
      position: 'top',
    });
  }

  emit('update:modelValue', false);
}

function handleDelete(): void {
  if (!props.user) return;
  const userToDelete = props.user;
  $q.dialog({
    title: 'حذف کاربر اتاق اصناف',
    message: `آیا از حذف حساب کاربری «${userToDelete.fullName}» اطمینان دارید؟ این عملیات غیرقابل بازگشت است.`,
    ok: { label: 'حذف حساب', color: 'negative' },
    cancel: { label: 'انصراف', flat: true },
    persistent: true,
  }).onOk(() => {
    chamberUsersStore.deleteChamberUser(userToDelete.id);
    emit('deleted', userToDelete.id);
    emit('update:modelValue', false);
    $q.notify({
      type: 'positive',
      message: `حساب کاربری «${userToDelete.fullName}» با موفقیت حذف گردید.`,
      position: 'top',
    });
  });
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
    <q-card class="chamber-user-manage-card" dir="rtl" data-testid="chamber-user-manage-dialog">
      <!-- Header -->
      <q-card-section class="modal-header">
        <div class="header-content">
          <div class="header-icon-wrap">
            <component :is="user ? UserCog : UserPlus" class="header-icon" />
          </div>
          <div>
            <h3 class="header-title">
              {{ user ? 'ویرایش کاربر و سطح دسترسی اتاق اصناف' : 'تعریف کاربر جدید اتاق اصناف' }}
            </h3>
          </div>
        </div>
        <button type="button" class="btn-close" @click="emit('update:modelValue', false)">
          <X class="icon-sm" />
        </button>
      </q-card-section>

      <q-separator />

      <!-- Form Body -->
      <q-card-section class="modal-body">
        <form @submit.prevent="handleSave" class="form-grid">
          <!-- نام و نام خانوادگی -->
          <div class="form-group full-width">
            <label class="form-label" for="chamber-user-fullname">نام و نام خانوادگی:</label>
            <input
              id="chamber-user-fullname"
              v-model="form.fullName"
              type="text"
              required
              class="form-input"
              data-testid="input-chamber-user-fullname"
            />
          </div>

          <!-- سمت در اتاق اصناف -->
          <div class="form-group full-width">
            <label class="form-label" for="chamber-user-role-select">سمت سازمانی در اتاق اصناف:</label>
            <select
              id="chamber-user-role-select"
              :value="form.roleTitle"
              class="form-select"
              data-testid="select-chamber-user-role"
              @change="handleRoleChange(($event.target as HTMLSelectElement).value as ChamberRoleTitle)"
            >
              <option value="رئیس اتاق اصناف">رئیس اتاق اصناف</option>
              <option value="مدیر بازرسی و نظارت">مدیر بازرسی و نظارت</option>
              <option value="کارشناس اجرائیات و پلمپ">کارشناس اجرائیات و پلمپ</option>
              <option value="کارشناس ممیزی و سامانه">کارشناس ممیزی و سامانه</option>
              <option value="کارشناس پذیرش و امور اصناف">کارشناس پذیرش و امور اصناف</option>
            </select>
          </div>

          <!-- کد ملی -->
          <div class="form-group">
            <label class="form-label" for="chamber-user-nationalid">کد ملی:</label>
            <input
              id="chamber-user-nationalid"
              v-model="form.nationalId"
              type="text"
              maxlength="10"
              required
              class="form-input ltr-input"
              data-testid="input-chamber-user-nationalid"
            />
          </div>

          <!-- شماره همراه -->
          <div class="form-group">
            <label class="form-label" for="chamber-user-mobile">شماره همراه:</label>
            <input
              id="chamber-user-mobile"
              v-model="form.mobile"
              type="tel"
              maxlength="11"
              required
              class="form-input ltr-input"
              data-testid="input-chamber-user-mobile"
            />
          </div>

          <!-- نام کاربری -->
          <div class="form-group">
            <label class="form-label" for="chamber-user-username">نام کاربری (جهت ورود):</label>
            <input
              id="chamber-user-username"
              v-model="form.username"
              type="text"
              required
              class="form-input ltr-input"
              data-testid="input-chamber-user-username"
            />
          </div>

          <!-- کلمه عبور -->
          <div class="form-group full-width">
            <label class="form-label" for="chamber-user-password">
              {{ user ? 'تغییر کلمه عبور (اختیاری):' : 'کلمه عبور جهت ورود:' }}
            </label>
            <div class="password-input-wrap">
              <input
                id="chamber-user-password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                :required="!user"
                class="form-input ltr-input password-input-field"
                data-testid="input-chamber-user-password"
              />
              <button
                type="button"
                class="btn-toggle-eye"
                @click="showPassword = !showPassword"
                tabindex="-1"
                :title="showPassword ? 'مخفی‌سازی رمز' : 'نمایش رمز'"
              >
                <component :is="showPassword ? EyeOff : Eye" class="icon-xs" />
              </button>
            </div>
          </div>

          <!-- ماتریس دسترسی‌های حاکمیتی -->
          <div class="permissions-section full-width">
            <h4 class="perm-title">ماتریس سطوح دسترسی حاکمیتی در اتاق اصناف اهواز:</h4>
            <div class="perm-grid">
              <label class="perm-checkbox-label">
                <input v-model="form.permissions.canIssueAmakenSealOrder" type="checkbox" />
                <span>امکان صدور مکاتبه رسمی دستور پلمپ انتظامی به اداره اماکن عمومی</span>
              </label>

              <label class="perm-checkbox-label">
                <input v-model="form.permissions.canReferSecondWarning" type="checkbox" />
                <span>امکان ارجاع و ابلاغ اخطار ثانویه ۱۰ روزه به اداره اماکن</span>
              </label>

              <label class="perm-checkbox-label">
                <input v-model="form.permissions.canDispatchJointMissions" type="checkbox" />
                <span>امکان تخصیص و اعزام گشت‌های مشترک شهری (تعزیرات، بهداشت، اماکن)</span>
              </label>

              <label class="perm-checkbox-label">
                <input v-model="form.permissions.canViewAuditLogs" type="checkbox" />
                <span>دسترسی به لاگ‌های ممیزی پرونده‌ها، گزارش‌های کلان و داشبورد ریسک</span>
              </label>

              <label class="perm-checkbox-label">
                <input v-model="form.permissions.canManageUnions" type="checkbox" />
                <span>دسترسی به مدیریت و نظارت عالیه بر اتحادیه‌های ۵۲گانه و ثبت اتحادیه جدید</span>
              </label>
            </div>
          </div>
        </form>
      </q-card-section>

      <q-separator />

      <!-- Footer Actions -->
      <q-card-actions class="modal-footer">
        <button
          v-if="user"
          type="button"
          class="btn-delete-user"
          @click="handleDelete"
          data-testid="btn-delete-chamber-user"
        >
          <Trash2 class="icon-xs" />
          <span>حذف کاربر</span>
        </button>
        <div class="footer-end-actions">
          <button type="button" class="btn-cancel" @click="emit('update:modelValue', false)">
            انصراف
          </button>
          <button
            type="button"
            class="btn-save"
            @click="handleSave"
            data-testid="btn-save-chamber-user"
          >
            <Save class="icon-sm" />
            <span>{{ user ? 'ذخیره تغییرات کاربر' : 'ایجاد حساب کاربری اتاق' }}</span>
          </button>
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.chamber-user-manage-card {
  width: 100%;
  max-width: 38rem;
  max-height: 90vh;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-xl, 1rem);
  background-color: var(--card);
  color: var(--card-foreground);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  overflow: hidden;
}

.modal-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background-color: var(--muted);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon-wrap {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  background-color: oklch(from var(--primary) l c h / 12%);
  color: var(--primary);
}

.header-icon {
  width: 1.35rem;
  height: 1.35rem;
}

.header-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--foreground);
}

.btn-close {
  display: grid;
  place-items: center;
  background: none;
  border: none;
  padding: 0.35rem;
  border-radius: 0.375rem;
  color: var(--muted-foreground);
  cursor: pointer;

  &:hover {
    color: var(--foreground);
  }
}

.modal-body {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.875rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.full-width {
  grid-column: 1 / -1 !important;
  width: 100% !important;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  &.full-width {
    grid-column: 1 / -1;
  }
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--foreground);
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: var(--radius-md, 0.375rem);
  border: 1px solid var(--border);
  background-color: var(--background);
  color: var(--foreground);
  font-family: inherit;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px oklch(from var(--primary) l c h / 20%);
  }

  &.ltr-input {
    direction: ltr;
    text-align: left;
    font-family: 'Vazirmatn', inherit, sans-serif;
  }
}

.permissions-section {
  grid-column: 1 / -1 !important;
  width: 100% !important;
  box-sizing: border-box;
  margin-top: 0.5rem;
  padding: 0.875rem;
  background-color: var(--muted);
  border-radius: var(--radius-md, 0.375rem);
  border: 1px solid var(--border);

  .perm-title {
    margin: 0 0 0.625rem;
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--primary);
  }

  .perm-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .perm-checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: var(--foreground);
    cursor: pointer;
  }
}

.password-input-wrap {
  position: relative;
  display: flex;
  align-items: center;

  .password-input-field {
    padding-inline-end: 2.5rem;
  }

  .btn-toggle-eye {
    position: absolute;
    inset-inline-end: 0.5rem;
    background: none;
    border: none;
    color: var(--muted-foreground);
    cursor: pointer;
    display: grid;
    place-items: center;
    padding: 0.25rem;

    &:hover {
      color: var(--foreground);
    }
  }
}

.modal-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  background-color: var(--muted);

  .footer-end-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-inline-start: auto;
  }
}

.btn-delete-user {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.85rem;
  border-radius: var(--radius-md, 0.375rem);
  border: 1px solid var(--destructive);
  background: transparent;
  color: var(--destructive);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--destructive);
    color: #ffffff;
  }
}

.btn-cancel {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md, 0.375rem);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--foreground);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background-color: var(--muted);
  }
}

.btn-save {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1.25rem;
  border-radius: var(--radius-md, 0.375rem);
  border: none;
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}
</style>


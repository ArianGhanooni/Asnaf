<script setup lang="ts">
import { ref, watch } from 'vue';
import type { RoleMatrixItem, PermissionLevel } from 'src/stores/chamberUsers';
import { systemSections, useChamberUsersStore } from 'src/stores/chamberUsers';
import { useQuasar } from 'quasar';
import { ShieldCheck, ShieldAlert, X, Save, Check, Ban, AlertCircle } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: boolean;
  role: RoleMatrixItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved', role: RoleMatrixItem): void;
}>();

const $q = useQuasar();
const chamberUsersStore = useChamberUsersStore();

const roleTitle = ref('');
const permissionsState = ref<Record<string, { level: PermissionLevel; text: string }>>({});

function initForm(): void {
  if (props.role) {
    roleTitle.value = props.role.title;
    const pMap: Record<string, { level: PermissionLevel; text: string }> = {};
    for (const sec of systemSections) {
      const existing = props.role.permissions[sec.key];
      if (existing) {
        pMap[sec.key] = { level: existing.level, text: existing.text };
      } else {
        pMap[sec.key] = { level: 'none', text: 'عدم دسترسی' };
      }
    }
    permissionsState.value = pMap;
  } else {
    roleTitle.value = '';
    const pMap: Record<string, { level: PermissionLevel; text: string }> = {};
    for (const sec of systemSections) {
      pMap[sec.key] = { level: 'limited', text: 'دسترسی محدود' };
    }
    permissionsState.value = pMap;
  }
}

watch(
  () => [props.role, props.modelValue],
  () => {
    initForm();
  },
  { immediate: true }
);

function setLevel(secKey: string, level: PermissionLevel): void {
  if (!permissionsState.value[secKey]) {
    permissionsState.value[secKey] = { level, text: '' };
  } else {
    permissionsState.value[secKey].level = level;
  }

  // Auto preset default text if empty or was standard
  const curText = permissionsState.value[secKey].text;
  if (!curText || curText === 'دسترسی کامل' || curText === 'دسترسی محدود' || curText === 'عدم دسترسی') {
    if (level === 'full') permissionsState.value[secKey].text = 'دسترسی کامل';
    else if (level === 'limited') permissionsState.value[secKey].text = 'دسترسی محدود';
    else permissionsState.value[secKey].text = 'عدم دسترسی';
  }
}

function handleSave(): void {
  const trimmedTitle = roleTitle.value.trim();
  if (!trimmedTitle) {
    $q.notify({
      type: 'warning',
      message: 'لطفاً عنوان نقش را وارد نمایید.',
      position: 'top',
    });
    return;
  }

  if (props.role) {
    chamberUsersStore.updateRole(props.role.id, {
      title: trimmedTitle,
      permissions: permissionsState.value,
    });

    const updated = chamberUsersStore.systemRoles.find((r) => r.id === props.role?.id);
    if (updated) {
      emit('saved', updated);
    }

    $q.notify({
      type: 'positive',
      message: `سطح دسترسی نقش «${trimmedTitle}» با موفقیت به‌روزرسانی شد.`,
      position: 'top',
    });
  } else {
    const created = chamberUsersStore.addRole({
      title: trimmedTitle,
      permissions: permissionsState.value,
    });

    emit('saved', created);

    $q.notify({
      type: 'positive',
      message: `نقش جدید «${trimmedTitle}» با موفقیت تعریف گردید.`,
      position: 'top',
    });
  }

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
    <q-card class="role-manage-card" dir="rtl" data-testid="role-manage-dialog">
      <!-- Header -->
      <q-card-section class="modal-header">
        <div class="header-content">
          <div class="header-icon-wrap">
            <component :is="role ? ShieldCheck : ShieldAlert" class="header-icon" />
          </div>
          <div>
            <h3 class="header-title">
              {{ role ? `ویرایش سطح دسترسی نقش: ${role.title}` : 'تعریف نقش جدید در سامانه' }}
            </h3>
            <span class="header-sub">
              تعیین و پیکربندی سطح دسترسی به بخش‌ها و اختیارات سامانه نظارت اصناف
            </span>
          </div>
        </div>
        <button type="button" class="btn-close" @click="emit('update:modelValue', false)" aria-label="بستن">
          <X class="icon-sm" />
        </button>
      </q-card-section>

      <q-separator />

      <!-- Modal Body -->
      <q-card-section class="modal-body">
        <form @submit.prevent="handleSave" class="role-form">
          <!-- Role Title -->
          <div class="form-group role-title-group">
            <label class="form-label" for="role-title-input">عنوان نقش سازمانی:</label>
            <input
              id="role-title-input"
              v-model="roleTitle"
              type="text"
              required
              class="form-input"
              data-testid="input-role-title"
            />
          </div>

          <!-- Section Permissions List -->
          <div class="sections-perm-list">
            <h4 class="sections-list-title">سطح دسترسی نقش به بخش‌های سامانه:</h4>

            <div
              v-for="sec in systemSections"
              :key="sec.key"
              class="section-perm-row"
            >
              <div class="sec-meta">
                <span class="sec-title">{{ sec.title }}</span>
              </div>

              <div class="sec-level-actions">
                <!-- Level Select Buttons -->
                <div class="level-pills-wrap">
                  <button
                    type="button"
                    :class="['level-pill-btn full', { 'is-selected': permissionsState[sec.key]?.level === 'full' }]"
                    @click="setLevel(sec.key, 'full')"
                    title="دسترسی کامل"
                  >
                    <Check class="icon-xxs" />
                    <span>دسترسی کامل</span>
                  </button>

                  <button
                    type="button"
                    :class="['level-pill-btn limited', { 'is-selected': permissionsState[sec.key]?.level === 'limited' }]"
                    @click="setLevel(sec.key, 'limited')"
                    title="دسترسی محدود"
                  >
                    <AlertCircle class="icon-xxs" />
                    <span>دسترسی محدود</span>
                  </button>

                  <button
                    type="button"
                    :class="['level-pill-btn none', { 'is-selected': permissionsState[sec.key]?.level === 'none' }]"
                    @click="setLevel(sec.key, 'none')"
                    title="عدم دسترسی"
                  >
                    <Ban class="icon-xxs" />
                    <span>عدم دسترسی</span>
                  </button>
                </div>

                <!-- Custom description text input -->
                <input
                  v-if="permissionsState[sec.key]"
                  v-model="permissionsState[sec.key]!.text"
                  type="text"
                  class="sec-text-input"
                  title="توضیح یا برچسب وضعیت در جدول"
                />
              </div>
            </div>
          </div>
        </form>
      </q-card-section>

      <q-separator />

      <!-- Footer Actions -->
      <q-card-actions class="modal-footer">
        <button type="button" class="btn-cancel" @click="emit('update:modelValue', false)">
          انصراف
        </button>
        <button
          type="button"
          class="btn-save"
          @click="handleSave"
          data-testid="btn-save-role"
        >
          <Save class="icon-sm" />
          <span>{{ role ? 'ذخیره تغییرات سطح دسترسی' : 'ثبت و تعریف نقش جدید' }}</span>
        </button>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.role-manage-card {
  width: 100%;
  max-width: 44rem;
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

.header-sub {
  display: block;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-top: 0.15rem;
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

.role-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--foreground);
}

.form-input {
  width: 100%;
  padding: 0.6rem 0.85rem;
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
}

.sections-perm-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sections-list-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--primary);
}

.section-perm-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.85rem;
  border-radius: var(--radius-md, 0.5rem);
  background-color: var(--background);
  border: 1px solid var(--border);

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.sec-meta {
  flex: 1;

  .sec-title {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--foreground);
  }
}

.sec-level-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.level-pills-wrap {
  display: inline-flex;
  align-items: center;
  background-color: var(--card);
  padding: 0.2rem;
  border-radius: 9999px;
  border: 1px solid var(--border);
  gap: 0.2rem;
}

.level-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  border: none;
  background: transparent;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.15s ease;

  &.full.is-selected {
    background-color: #dcfce7;
    color: #166534;
  }

  &.limited.is-selected {
    background-color: #fef3c7;
    color: #92400e;
  }

  &.none.is-selected {
    background-color: #fee2e2;
    color: #991b1b;
  }
}

.sec-text-input {
  width: 9.5rem;
  padding: 0.3rem 0.55rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  font-size: 0.72rem;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
}

.modal-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  background-color: var(--muted);
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
.icon-xxs {
  width: 0.75rem;
  height: 0.75rem;
}
</style>

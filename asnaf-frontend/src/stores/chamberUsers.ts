import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ChamberRoleTitle =
  | 'رئیس اتاق اصناف'
  | 'مدیر بازرسی و نظارت'
  | 'کارشناس اجرائیات و پلمپ'
  | 'کارشناس ممیزی و سامانه'
  | 'کارشناس پذیرش و امور اصناف';

export interface ChamberUserPermissions {
  canIssueAmakenSealOrder: boolean;   // صدور مکاتبه رسمی دستور پلمپ انتظامی به اماکن
  canReferSecondWarning: boolean;     // ارجاع اخطار ثانویه ۱۰ روزه اماکن
  canDispatchJointMissions: boolean;  // تخصیص و اعزام گشت مشترک با تعزیرات و بهداشت
  canViewAuditLogs: boolean;          // دسترسی به لاگ‌های ممیزی پرونده‌ها و گزارشات کلان
  canManageUnions: boolean;           // مدیریت، پایش عملکرد و تعریف اتحادیه‌ها
}

export interface ChamberUserAccount {
  readonly id: number;
  fullName: string;
  username: string;
  nationalId: string;
  mobile: string;
  roleTitle: ChamberRoleTitle;
  isActive: boolean;
  password?: string;
  permissions: ChamberUserPermissions;
  createdAt: string;
}

export interface InspectorAccount {
  readonly id: number;
  fullName: string;
  username: string;
  code: string;
  mobile: string;
  region: string;
  rank: string;
  isActive: boolean;
}

export type PermissionLevel = 'full' | 'limited' | 'none';

export interface SystemSectionDef {
  key: string;
  title: string;
}

export interface RoleMatrixItem {
  id: string;
  title: string;
  isSystem: boolean;
  permissions: Record<string, {
    level: PermissionLevel;
    text: string;
  }>;
}

export const systemSections: SystemSectionDef[] = [
  { key: 'dashboard', title: 'داشبورد و شاخص‌های نظارتی' },
  { key: 'unionsManagement', title: 'مدیریت و دایرکتوری ۵۲ اتحادیه' },
  { key: 'unionUsers', title: 'تعریف و مدیریت کاربران اتحادیه' },
  { key: 'chamberUsers', title: 'تعریف و مدیریت کاربران اتاق اصناف' },
  { key: 'sealOrders', title: 'صدور دستور پلمپ و اخطار اماکن' },
  { key: 'unsealDismissal', title: 'تایید فک پلمپ و منع پیگیری' },
  { key: 'auditLogs', title: 'ممیزی، لاگ امنیتی و گزارشات کلان' },
];

export const initialSystemRoles: RoleMatrixItem[] = [
  {
    id: 'general',
    title: 'اتاق اصناف اهواز',
    isSystem: true,
    permissions: {
      dashboard: { level: 'full', text: 'دسترسی کامل استانی' },
      unionsManagement: { level: 'full', text: 'ثبت، ویرایش و پایش' },
      unionUsers: { level: 'full', text: 'نظارت و مدیریت' },
      chamberUsers: { level: 'full', text: 'دسترسی مستقیم' },
      sealOrders: { level: 'full', text: 'صلاحیت انحصاری صدور' },
      unsealDismissal: { level: 'full', text: 'تایید نهایی و ابلاغ' },
      auditLogs: { level: 'full', text: 'دسترسی کامل' },
    },
  },
  {
    id: 'union',
    title: 'اتحادیه‌های صنفی',
    isSystem: true,
    permissions: {
      dashboard: { level: 'limited', text: 'محدود به صنف' },
      unionsManagement: { level: 'none', text: 'عدم دسترسی' },
      unionUsers: { level: 'full', text: 'تعریف کاربران خود صنف' },
      chamberUsers: { level: 'none', text: 'عدم دسترسی' },
      sealOrders: { level: 'limited', text: 'پیشنهاد و تقاضا' },
      unsealDismissal: { level: 'limited', text: 'صدور پیش‌نویس اولیه' },
      auditLogs: { level: 'none', text: 'عدم دسترسی' },
    },
  },
  {
    id: 'inspector',
    title: 'بازرسان میدانی',
    isSystem: true,
    permissions: {
      dashboard: { level: 'limited', text: 'محدود به منطقه بازرسی' },
      unionsManagement: { level: 'none', text: 'عدم دسترسی' },
      unionUsers: { level: 'none', text: 'عدم دسترسی' },
      chamberUsers: { level: 'none', text: 'عدم دسترسی' },
      sealOrders: { level: 'limited', text: 'ثبت گزارش میدانی' },
      unsealDismissal: { level: 'none', text: 'عدم دسترسی' },
      auditLogs: { level: 'none', text: 'عدم دسترسی' },
    },
  },
  {
    id: 'admin',
    title: 'مدیر ارشد (Admin)',
    isSystem: true,
    permissions: {
      dashboard: { level: 'full', text: 'دسترسی کامل حاکمیتی' },
      unionsManagement: { level: 'full', text: 'دسترسی کامل' },
      unionUsers: { level: 'full', text: 'دسترسی کامل' },
      chamberUsers: { level: 'full', text: 'دسترسی کامل' },
      sealOrders: { level: 'full', text: 'دسترسی کامل' },
      unsealDismissal: { level: 'full', text: 'دسترسی کامل' },
      auditLogs: { level: 'full', text: 'دسترسی کامل' },
    },
  },
];

const initialChamberUsers: ChamberUserAccount[] = [
  {
    id: 1,
    fullName: 'سجاد فتاحی',
    username: 's.fattahi',
    nationalId: '1751122334',
    mobile: '09163189369',
    roleTitle: 'رئیس اتاق اصناف',
    isActive: true,
    password: '••••••••',
    permissions: {
      canIssueAmakenSealOrder: true,
      canReferSecondWarning: true,
      canDispatchJointMissions: true,
      canViewAuditLogs: true,
      canManageUnions: true,
    },
    createdAt: '۱۴۰۴/۰۱/۱۵',
  },
  {
    id: 2,
    fullName: 'کامران خدری',
    username: 'k.khedri',
    nationalId: '1752233445',
    mobile: '09162223344',
    roleTitle: 'مدیر بازرسی و نظارت',
    isActive: true,
    password: '••••••••',
    permissions: {
      canIssueAmakenSealOrder: true,
      canReferSecondWarning: true,
      canDispatchJointMissions: true,
      canViewAuditLogs: true,
      canManageUnions: false,
    },
    createdAt: '۱۴۰۴/۰۲/۱۰',
  },
  {
    id: 3,
    fullName: 'نرگس مرادی',
    username: 'n.moradi',
    nationalId: '1753344556',
    mobile: '09163334455',
    roleTitle: 'کارشناس اجرائیات و پلمپ',
    isActive: true,
    password: '••••••••',
    permissions: {
      canIssueAmakenSealOrder: true,
      canReferSecondWarning: true,
      canDispatchJointMissions: false,
      canViewAuditLogs: false,
      canManageUnions: false,
    },
    createdAt: '۱۴۰۴/۰۳/۱۸',
  },
  {
    id: 4,
    fullName: 'حامد انصاری',
    username: 'h.ansari',
    nationalId: '1754455667',
    mobile: '09164445566',
    roleTitle: 'کارشناس ممیزی و سامانه',
    isActive: true,
    password: '••••••••',
    permissions: {
      canIssueAmakenSealOrder: false,
      canReferSecondWarning: false,
      canDispatchJointMissions: false,
      canViewAuditLogs: true,
      canManageUnions: true,
    },
    createdAt: '۱۴۰۴/۰۴/۰۵',
  },
  {
    id: 5,
    fullName: 'شیما سواری',
    username: 'sh.savari',
    nationalId: '1755566778',
    mobile: '09165556677',
    roleTitle: 'کارشناس پذیرش و امور اصناف',
    isActive: true,
    password: '••••••••',
    permissions: {
      canIssueAmakenSealOrder: false,
      canReferSecondWarning: true,
      canDispatchJointMissions: false,
      canViewAuditLogs: false,
      canManageUnions: true,
    },
    createdAt: '۱۴۰۴/۰۵/۲۰',
  },
];

const initialInspectors: InspectorAccount[] = [
  { id: 101, fullName: 'آرین قانونی', username: 'ins.4012', code: '۴۰۱۲', mobile: '09165557788', region: 'منطقه ۲ و ۴', rank: 'رتبه ۱ (ارشد)', isActive: true },
  { id: 102, fullName: 'رضا موسوی', username: 'ins.4018', code: '۴۰۱۸', mobile: '09166667788', region: 'منطقه ۳', rank: 'رتبه ۲', isActive: true },
  { id: 103, fullName: 'فاطمه نیسی', username: 'ins.4025', code: '۴۰۲۵', mobile: '09167778899', region: 'منطقه ۱', rank: 'رتبه ۳', isActive: true },
  { id: 104, fullName: 'علی سواری', username: 'ins.4030', code: '۴۰۳۰', mobile: '09168889900', region: 'منطقه ۶', rank: 'رتبه ۴', isActive: true },
  { id: 105, fullName: 'مریم کریمی', username: 'ins.4042', code: '۴۰۴۲', mobile: '09169990011', region: 'منطقه ۵ و ۸', rank: 'رتبه ۵', isActive: true },
];

export const useChamberUsersStore = defineStore('chamberUsers', () => {
  const chamberUsers = ref<ChamberUserAccount[]>([...initialChamberUsers]);
  const inspectors = ref<InspectorAccount[]>([...initialInspectors]);
  const systemRoles = ref<RoleMatrixItem[]>([...initialSystemRoles]);

  function addRole(payload: { title: string; permissions: Record<string, { level: PermissionLevel; text: string }> }): RoleMatrixItem {
    const newId = `role_${Date.now()}`;
    const newRole: RoleMatrixItem = {
      id: newId,
      title: payload.title,
      isSystem: false,
      permissions: payload.permissions,
    };
    systemRoles.value.push(newRole);
    return newRole;
  }

  function updateRole(id: string, patch: Partial<RoleMatrixItem>): void {
    const idx = systemRoles.value.findIndex((r) => r.id === id);
    const existingRole = systemRoles.value[idx];
    if (existingRole) {
      systemRoles.value[idx] = {
        ...existingRole,
        ...patch,
      } as RoleMatrixItem;
    }
  }

  function deleteRole(id: string): void {
    systemRoles.value = systemRoles.value.filter((r) => r.id !== id);
  }

  function addChamberUser(payload: Omit<ChamberUserAccount, 'id' | 'createdAt'>): ChamberUserAccount {
    const newId = chamberUsers.value.length > 0 ? Math.max(...chamberUsers.value.map((u) => u.id)) + 1 : 1;
    const today = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const newUser: ChamberUserAccount = {
      id: newId,
      ...payload,
      createdAt: today,
    };
    chamberUsers.value.unshift(newUser);
    return newUser;
  }

  function updateChamberUser(id: number, patch: Partial<ChamberUserAccount>): void {
    const idx = chamberUsers.value.findIndex((u) => u.id === id);
    if (idx !== -1) {
      chamberUsers.value[idx] = {
        ...chamberUsers.value[idx],
        ...patch,
      } as ChamberUserAccount;
    }
  }

  function toggleChamberUserStatus(id: number): void {
    const user = chamberUsers.value.find((u) => u.id === id);
    if (user) {
      user.isActive = !user.isActive;
    }
  }

  function toggleInspectorStatus(id: number): void {
    const ins = inspectors.value.find((i) => i.id === id);
    if (ins) {
      ins.isActive = !ins.isActive;
    }
  }

  function deleteChamberUser(id: number): void {
    const idx = chamberUsers.value.findIndex((u) => u.id === id);
    if (idx !== -1) {
      chamberUsers.value.splice(idx, 1);
    }
  }

  return {
    chamberUsers,
    inspectors,
    systemRoles,
    addRole,
    updateRole,
    deleteRole,
    addChamberUser,
    updateChamberUser,
    toggleChamberUserStatus,
    toggleInspectorStatus,
    deleteChamberUser,
  };
});


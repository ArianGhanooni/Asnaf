export type Role = 'admin' | 'general' | 'union' | 'inspector';

export type Section =
  | 'dashboard'
  | 'unions'
  | 'missions'
  | 'warnings'
  | 'bread'
  | 'specialized'
  | 'risk'
  | 'reports'
  | 'audit'
  | 'settings';

export interface SessionUser {
  readonly role: Role;
  readonly name: string;
  readonly mobile: string;
  readonly org: string;
}

export const roleLabels: Record<Role, string> = {
  admin: 'مدیر ارشد سامانه (Admin)',
  general: 'اتاق اصناف',
  union: 'اتحادیه',
  inspector: 'بازرسان',
};

export const access: Record<Role, Section[]> = {
  admin: ['dashboard', 'unions', 'missions', 'warnings', 'bread', 'specialized', 'risk', 'reports', 'audit', 'settings'],
  general: ['dashboard', 'unions', 'missions', 'reports', 'settings'],
  union: ['dashboard', 'missions', 'reports', 'settings'],
  inspector: ['dashboard', 'missions', 'settings'],
};

export function can(role: Role, s: Section): boolean {
  return access[role]?.includes(s) ?? false;
}

export const demoUsers: Record<Role, { name: string; mobile: string; org: string }> = {
  admin: { name: 'مدیریت کل سیستم (Admin)', mobile: '09120000000', org: 'مرکز فرماندهی و نظارت فناوری اصناف' },
  general: { name: 'سجاد فتاحی', mobile: '09163189369', org: 'مدیریت نظارت اصناف استان خوزستان' },
  union: { name: 'مهدی کعبی', mobile: '09161234567', org: 'اتحادیه نانوایان اهواز' },
  inspector: { name: 'آرین قانونی', mobile: '09165557788', org: 'بازرس افتخاری اتحادیه' },
};

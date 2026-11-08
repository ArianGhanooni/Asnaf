import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Role, Section, SessionUser } from 'src/types/auth';
import { demoUsers, can } from 'src/types/auth';
import { Dark } from 'quasar';

export const useSessionStore = defineStore('session', () => {
  const session = ref<SessionUser | null>(null);
  const ready = ref(false);
  const theme = ref<'light' | 'dark'>('light');

  function initSession(): void {
    try {
      const saved = localStorage.getItem('asnaf-session');
      if (saved) {
        session.value = JSON.parse(saved);
        if (session.value?.role === 'inspector') {
          if (
            session.value.name === 'نوراله چشم‌فر' ||
            session.value.name === 'نوراله چشمفر' ||
            session.value.name?.includes('چشم')
          ) {
            session.value = { ...session.value, name: demoUsers.inspector.name };
          }
          if (session.value.org === 'بازرسی منطقه ۲ اهواز') {
            session.value = { ...session.value, org: demoUsers.inspector.org };
          }
          localStorage.setItem('asnaf-session', JSON.stringify(session.value));
        }
      }
      const savedTheme = localStorage.getItem('asnaf-theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        theme.value = savedTheme;
      }
    } catch {
      // ignore
    } finally {
      applyTheme(theme.value);
      ready.value = true;
    }
  }

  function applyTheme(t: 'light' | 'dark'): void {
    const isDark = t === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    Dark.set(isDark);
  }

  function toggleTheme(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    applyTheme(theme.value);
    localStorage.setItem('asnaf-theme', theme.value);
  }

  function login(role: Role): void {
    const user: SessionUser = { role, ...demoUsers[role] };
    session.value = user;
    localStorage.setItem('asnaf-session', JSON.stringify(user));
  }

  function logout(): void {
    session.value = null;
    localStorage.removeItem('asnaf-session');
  }

  function canAccess(s: Section): boolean {
    if (!session.value) return false;
    return can(session.value.role, s);
  }

  const isAuthenticated = computed(() => session.value !== null);

  return {
    session,
    ready,
    theme,
    isAuthenticated,
    initSession,
    toggleTheme,
    login,
    logout,
    canAccess,
  };
});

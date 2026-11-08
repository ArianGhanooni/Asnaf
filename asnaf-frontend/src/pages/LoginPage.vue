<script setup lang="ts">
import type { Component } from 'vue';
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from 'src/stores/session';
import type { Role } from 'src/types/auth';
import { demoUsers } from 'src/types/auth';
import emblem from 'src/assets/emblem.png';
import {
  Eye,
  EyeOff,
  Moon,
  Shield,
  ShieldCheck,
  User,
  Sun,
  Building2,
  UserCheck,
  Landmark,
} from 'lucide-vue-next';

const router = useRouter();
const sessionStore = useSessionStore();

const role = ref<Role>('general');
const username = ref(demoUsers.general.mobile);
const pass = ref('123456');
const show = ref(false);
const captcha = ref('');
const err = ref('');

const isDark = computed(() => sessionStore.theme === 'dark');

onMounted(() => {
  sessionStore.initSession();
  if (sessionStore.ready && sessionStore.isAuthenticated) {
    router.push('/dashboard');
  }
});

const visibleRoles: { key: Role; label: string; icon: Component }[] = [
  { key: 'admin', label: 'مدیر سامانه', icon: Shield },
  { key: 'general', label: 'اتاق اصناف', icon: Landmark },
  { key: 'union', label: 'اتحادیه', icon: Building2 },
  { key: 'inspector', label: 'بازرسان', icon: UserCheck },
];

function selectRole(r: Role): void {
  role.value = r;
  if (r === 'admin') {
    username.value = 'admin';
    pass.value = 'admin';
  } else {
    username.value = demoUsers[r].mobile;
    pass.value = '123456';
  }
  err.value = '';
}

function submitLogin(): void {
  err.value = '';
  const trimmedUser = username.value.trim().toLowerCase();
  const trimmedPass = pass.value.trim().toLowerCase();

  // ورود به عنوان مدیر سامانه با admin admin
  if (role.value === 'admin' || (trimmedUser === 'admin' && trimmedPass === 'admin')) {
    if (trimmedUser !== 'admin' || trimmedPass !== 'admin') {
      err.value = 'نام کاربری یا رمز عبور مدیر سامانه اشتباه است (admin / admin).';
      return;
    }
    sessionStore.login('admin');
    router.push('/dashboard');
    return;
  }

  if (!username.value.trim()) {
    err.value = 'لطفاً نام کاربری را وارد نمایید.';
    return;
  }
  if (pass.value.length < 5) {
    err.value = 'رمز عبور حداقل ۵ کاراکتر است.';
    return;
  }
  if (captcha.value !== '4827' && captcha.value !== '۴۸۲۷') {
    err.value = 'کد امنیتی اشتباه است.';
    return;
  }

  sessionStore.login(role.value);
  router.push('/dashboard');
}
</script>

<template>
  <div :class="['login-page-container', { 'is-dark': isDark }]" dir="rtl">
    <!-- Retro CRT TV Glitch Map Background (with ~30% Balanced Overlay) -->
    <div class="crt-map-viewport" aria-hidden="true">
      <div class="crt-map-base" />
      <div class="crt-map-glitch crt-map-glitch-1" />
      <div class="crt-map-glitch crt-map-glitch-2" />
      <div class="crt-map-overlay" />
      <div class="crt-scanlines" />
      <div class="crt-roll-bar" />
    </div>

    <!-- Top Navigation Bar (Logo on Start, Theme Toggle on End) -->
    <header class="page-top-bar">
      <div class="brand-group">
        <div class="emblem-wrapper">
          <img :src="emblem" alt="نشان اتاق اصناف" class="emblem-img" />
        </div>
        <div class="brand-text">
          <span class="brand-title">اتاق اصناف ایران</span>
          <span class="brand-subtitle">استان خوزستان</span>
        </div>
      </div>

      <button
        class="theme-toggle-btn"
        @click="sessionStore.toggleTheme"
        aria-label="تغییر تم"
        data-testid="theme-toggle-btn"
      >
        <Sun v-if="isDark" class="icon-md" />
        <Moon v-else class="icon-md" />
      </button>
    </header>

    <!-- Centered Login Card Area with Pronounced Elevation Shadow -->
    <main class="login-center-wrapper">
      <div class="login-card">
        <div class="card-header">
          <h1 class="card-title">ورود به سامانه</h1>
        </div>

        <form class="login-form" @submit.prevent="submitLogin">
          <!-- Role Selector (اتاق اصناف، اتحادیه، بازرسان) -->
          <div class="role-grid">
            <button
              v-for="item in visibleRoles"
              :key="item.key"
              type="button"
              :class="['role-btn', { 'is-active': role === item.key }]"
              @click="selectRole(item.key)"
              :data-testid="`role-btn-${item.key}`"
            >
              <component :is="item.icon" class="icon-md" />
              <span>{{ item.label }}</span>
            </button>
          </div>

          <!-- Username Input -->
          <div class="field-group">
            <label for="u" class="field-label">نام کاربری</label>
            <div class="input-wrap">
              <User class="input-icon" />
              <input
                id="u"
                v-model="username"
                type="text"
                dir="ltr"
                class="form-input text-left pr-9"
                placeholder="نام کاربری..."
                data-testid="login-username-input"
              />
            </div>
          </div>

          <!-- Password Input -->
          <div class="field-group">
            <label for="p" class="field-label">رمز عبور</label>
            <div class="input-wrap">
              <input
                id="p"
                v-model="pass"
                :type="show ? 'text' : 'password'"
                dir="ltr"
                class="form-input text-left pl-10"
                data-testid="login-password-input"
              />
              <button
                type="button"
                class="password-toggle-btn"
                @click="show = !show"
                aria-label="نمایش رمز"
                data-testid="password-toggle-btn"
              >
                <EyeOff v-if="show" class="icon-sm" />
                <Eye v-else class="icon-sm" />
              </button>
            </div>
          </div>

          <!-- Captcha -->
          <div class="field-group">
            <label for="c" class="field-label">کد امنیتی</label>
            <div class="captcha-row">
              <input
                id="c"
                v-model="captcha"
                type="text"
                dir="ltr"
                class="form-input text-center font-mono"
                placeholder="کد تصویر"
                data-testid="login-captcha-input"
              />
              <div class="captcha-badge">4827</div>
            </div>
          </div>

          <p v-if="err" class="error-banner">{{ err }}</p>

          <button type="submit" class="submit-btn" data-testid="login-submit-btn">
            <ShieldCheck class="icon-md" />
            <span>ورود امن</span>
          </button>
        </form>
      </div>
    </main>

    <!-- Subtle Clean Footer Note -->
    <footer class="page-footer">
      <span>سامانه جامع نظارت و بازرسی اصناف شهرستان اهواز</span>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.login-page-container {
  position: relative;
  height: 100vh;
  height: 100dvh;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  direction: rtl;
  overflow: hidden;
  box-sizing: border-box;
  background-color: #e5f0f8;
  color: #0f172a;
  transition: background-color 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              color 0.35s cubic-bezier(0.4, 0, 0.2, 1);

  // --- Dark Mode Overrides ---
  &.is-dark {
    background-color: #0a101d;
    color: #f8fafc;

    .brand-title {
      color: #f8fafc;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.85);
    }

    .brand-subtitle {
      color: #93c5fd;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.85);
    }

    .emblem-wrapper {
      background: transparent;
      border: none;
      box-shadow: none;
    }

    .theme-toggle-btn {
      background: rgba(15, 23, 42, 0.9);
      border-color: rgba(255, 255, 255, 0.12);
      color: #f8fafc;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);

      &:hover {
        background: rgba(30, 41, 59, 0.95);
        border-color: rgba(96, 165, 250, 0.4);
      }
    }

    // High Elevation Shadow for Login Card in Dark Mode
    .login-card {
      background: rgba(15, 23, 42, 0.94);
      border-color: rgba(255, 255, 255, 0.14);
      box-shadow:
        0 10px 20px -3px rgba(0, 0, 0, 0.6),
        0 25px 45px -5px rgba(0, 0, 0, 0.8),
        0 45px 85px -12px rgba(0, 0, 0, 0.95),
        0 0 0 1px rgba(255, 255, 255, 0.08),
        0 0 40px -5px rgba(37, 99, 235, 0.3);
    }

    .card-title {
      color: #ffffff;
    }

    .role-btn {
      background: rgba(31, 41, 55, 0.8);
      border-color: rgba(255, 255, 255, 0.1);
      color: #e5e7eb;

      &:hover {
        background: rgba(55, 65, 81, 0.9);
      }

      &.is-active {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.22);
        color: #60a5fa;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.35);
      }
    }

    .field-label {
      color: #e2e8f0;
    }

    .form-input {
      background: rgba(11, 17, 32, 0.9);
      border-color: rgba(255, 255, 255, 0.14);
      color: #f8fafc;

      &:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
      }
    }

    .captcha-badge {
      background: rgba(31, 41, 55, 0.9);
      color: #f3f4f6;
      border-color: rgba(255, 255, 255, 0.12);
      text-decoration-color: rgba(148, 163, 184, 0.6);
    }

    .page-footer span {
      background: rgba(15, 23, 42, 0.92);
      color: #cbd5e1;
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    }

    // --- CRT Dark Mode Original Colors & 30% Dark Overlay ---
    .crt-map-base {
      background-image: url('../assets/map-pattern-dark.jpg');
    }

    .crt-map-glitch-1,
    .crt-map-glitch-2 {
      background-image: url('../assets/map-pattern-dark.jpg');
    }

    .crt-map-overlay {
      background-color: rgba(8, 13, 22, 0.72);
    }

    .crt-scanlines {
      background: repeating-linear-gradient(
        to bottom,
        transparent 0px,
        transparent 2px,
        rgba(0, 0, 0, 0.18) 3px,
        rgba(0, 0, 0, 0.18) 4px
      );
      opacity: 0.85;
    }

    .crt-roll-bar {
      background: linear-gradient(
        to bottom,
        transparent 0%,
        rgba(56, 189, 248, 0.04) 50%,
        transparent 100%
      );
    }
  }
}

/* ========================================================================= */
/* --- CRT RETRO TV GLITCH MAP BACKGROUND SYSTEM (WITH ~30% OVERLAY) ---     */
/* ========================================================================= */
.crt-map-viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

/* Base Map Layer with Raw Original Image Colors */
.crt-map-base {
  position: absolute;
  inset: -15px;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  transition: background-image 0.4s ease;
  will-change: transform, opacity;

  // Raw Light Mode map
  background-image: url('../assets/map-pattern-light.jpg');
  animation: crtPhosphorFlicker 0.2s infinite alternate;
}

/* Horizontal Slice Glitch Layer 1 - Raw Original Color */
.crt-map-glitch-1 {
  position: absolute;
  inset: -15px;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  opacity: 0;
  pointer-events: none;
  will-change: transform, opacity, clip-path;
  background-image: url('../assets/map-pattern-light.jpg');
  animation: crtGlitchSlice1 4.8s infinite steps(1, end);
}

/* Horizontal Slice Glitch Layer 2 - Raw Original Color */
.crt-map-glitch-2 {
  position: absolute;
  inset: -15px;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  opacity: 0;
  pointer-events: none;
  will-change: transform, opacity, clip-path;
  background-image: url('../assets/map-pattern-light.jpg');
  animation: crtGlitchSlice2 4.8s infinite steps(1, end);
}

/* Subdued ~30% Map Visibility via 68% Protective Layer */
.crt-map-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background-color: rgba(240, 246, 252, 0.68);
  transition: background-color 0.35s ease;
}

/* Fine CRT Horizontal Scanlines */
.crt-scanlines {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 2px,
    rgba(15, 23, 42, 0.04) 3px,
    rgba(15, 23, 42, 0.04) 4px
  );
  pointer-events: none;
  opacity: 0.75;
}

/* Cathode Ray Rolling Refresh Bar */
.crt-roll-bar {
  position: absolute;
  inset-inline-start: 0;
  inset-inline-end: 0;
  z-index: 2;
  height: 90px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(37, 99, 235, 0.03) 50%,
    transparent 100%
  );
  animation: crtRollBar 7s linear infinite;
  pointer-events: none;
}

/* Glitch Keyframe Animations */
@keyframes crtGlitchSlice1 {
  0%, 82%, 100% {
    opacity: 0;
    transform: translate(0, 0);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }
  83% {
    opacity: 0.9;
    transform: translate(-9px, 1px);
    clip-path: polygon(0 14%, 100% 14%, 100% 26%, 0 26%);
    filter: hue-rotate(80deg) contrast(1.2);
  }
  84% {
    opacity: 0.95;
    transform: translate(12px, -2px);
    clip-path: polygon(0 38%, 100% 38%, 100% 54%, 0 54%);
    filter: hue-rotate(-60deg) saturate(1.4);
  }
  85% {
    opacity: 0.75;
    transform: translate(-6px, 2px);
    clip-path: polygon(0 68%, 100% 68%, 100% 82%, 0 82%);
    filter: hue-rotate(40deg);
  }
  86% {
    opacity: 0;
    transform: translate(0, 0);
  }
  92% {
    opacity: 0.85;
    transform: translate(8px, -1px);
    clip-path: polygon(0 8%, 100% 8%, 100% 20%, 0 20%);
    filter: contrast(1.25);
  }
  93% {
    opacity: 0.65;
    transform: translate(-5px, 1px);
    clip-path: polygon(0 58%, 100% 58%, 100% 70%, 0 70%);
  }
  94% {
    opacity: 0;
    transform: translate(0, 0);
  }
}

@keyframes crtGlitchSlice2 {
  0%, 83%, 100% {
    opacity: 0;
    transform: translate(0, 0);
  }
  83.5% {
    opacity: 0.8;
    transform: translate(8px, -1px);
    clip-path: polygon(0 28%, 100% 28%, 100% 36%, 0 36%);
    filter: hue-rotate(-90deg) saturate(1.5);
  }
  84.5% {
    opacity: 0.9;
    transform: translate(-11px, 2px);
    clip-path: polygon(0 62%, 100% 62%, 100% 76%, 0 76%);
    filter: hue-rotate(180deg);
  }
  85.5% {
    opacity: 0;
    transform: translate(0, 0);
  }
  92.5% {
    opacity: 0.75;
    transform: translate(-8px, -1px);
    clip-path: polygon(0 78%, 100% 78%, 100% 90%, 0 90%);
    filter: invert(0.08);
  }
  93.5% {
    opacity: 0;
    transform: translate(0, 0);
  }
}

@keyframes crtRollBar {
  0% {
    top: -120px;
  }
  100% {
    top: 100vh;
  }
}

@keyframes crtPhosphorFlicker {
  0% {
    opacity: 0.985;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.992;
  }
}

@media (prefers-reduced-motion: reduce) {
  .crt-map-base,
  .crt-map-glitch-1,
  .crt-map-glitch-2,
  .crt-roll-bar {
    animation: none !important;
  }
}

/* ========================================================================= */
/* --- CONTENT LAYOUT WITH ELEVATION SHADOWS ---                            */
/* ========================================================================= */

/* Top Navigation Bar */
.page-top-bar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  width: 100%;
  flex-shrink: 0;

  @media (max-height: 750px), (max-width: 640px) {
    padding: 0.65rem 1rem;
  }
}

/* Pure Logo & Brand (No wrapping card or background on texts) */
.brand-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: none;
  border: none;
  box-shadow: none;
  padding: 0;
}

.emblem-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0;
  flex-shrink: 0;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
}

.emblem-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: filter 0.25s ease;

  :root.dark &,
  body.body--dark &,
  .is-dark & {
    filter: brightness(0) invert(1);
  }
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.brand-title {
  font-size: 0.9375rem;
  font-weight: 800;
  color: #1e3a8a;
  margin: 0;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.85);
  transition: color 0.3s ease;
}

.brand-subtitle {
  font-size: 0.75rem;
  font-weight: 700;
  color: #2563eb;
  margin: 0;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.85);
  transition: color 0.3s ease;
}

.theme-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.85);
  border-radius: 0.85rem;
  color: #0f172a;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all 0.2s ease;

  &:hover {
    background: #ffffff;
    box-shadow: 0 6px 18px rgba(37, 99, 235, 0.2);
    transform: translateY(-1px);
  }
}

/* Centered Login Card Area */
.login-center-wrapper {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  flex: 1;
  min-height: 0;
}

/* Pronounced 3D Elevation Drop Shadow for Login Card */
.login-card {
  width: 100%;
  max-width: 26.5rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 1.5rem;
  padding: 1.85rem 1.75rem 1.65rem;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.08),
    0 20px 35px -5px rgba(15, 23, 42, 0.18),
    0 35px 65px -10px rgba(15, 23, 42, 0.28),
    0 0 0 1px rgba(255, 255, 255, 0.85);
  transition: all 0.35s ease;

  @media (max-height: 750px), (max-width: 480px) {
    padding: 1.35rem 1.25rem 1.25rem;
    border-radius: 1.25rem;
  }
}

.card-header {
  text-align: center;
  margin-top: 0.25rem;
  margin-bottom: 1.5rem;

  @media (max-height: 750px) {
    margin-top: 0.15rem;
    margin-bottom: 1.15rem;
  }
}

.card-title {
  font-size: 1.45rem;
  font-weight: 800;
  margin: 0;
  padding: 0;
  line-height: 1.3;
  color: #0f172a;
  transition: color 0.3s ease;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;

  @media (max-height: 750px) {
    gap: 0.65rem;
  }
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
}

.role-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  border-radius: 0.85rem;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #0f172a;
  padding: 0.55rem 0.25rem;
  font-size: 0.72rem;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f8fafc;
  }

  &.is-active {
    border-color: #2563eb;
    background: rgba(37, 99, 235, 0.08);
    color: #2563eb;
    font-weight: 700;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
  }
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #334155;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  inset-inline-start: 0.75rem;
  width: 1rem;
  height: 1rem;
  color: #94a3b8;
  pointer-events: none;
}

.form-input {
  width: 100%;
  height: 2.65rem;
  border-radius: 0.75rem;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  padding: 0 0.85rem;
  font-size: 16px; // 16px prevents iOS Safari and mobile browsers from auto-zooming on focus
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  @media (min-width: 769px) {
    font-size: 0.875rem;
  }

  &:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
  }

  &.pr-9 {
    padding-inline-end: 2.25rem;
  }

  &.pl-10 {
    padding-inline-start: 2.5rem;
  }
}

.password-toggle-btn {
  position: absolute;
  inset-inline-end: 0.75rem;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0.25rem;

  &:hover {
    color: #475569;
  }
}

.captcha-row {
  display: flex;
  gap: 0.5rem;
}

.captcha-badge {
  display: grid;
  height: 2.65rem;
  width: 7rem;
  flex-shrink: 0;
  user-select: none;
  place-items: center;
  border-radius: 0.75rem;
  background-color: #f1f5f9;
  color: #1e293b;
  letter-spacing: 0.35em;
  border: 1px solid #cbd5e1;
  font-family: monospace;
  font-size: 1.15rem;
  font-weight: 700;
  font-style: italic;
  text-decoration: line-through;
  text-decoration-color: rgba(148, 163, 184, 0.6);
}

.error-banner {
  border-radius: 0.75rem;
  background-color: #fee2e2;
  color: #dc2626;
  border: 1px solid rgba(220, 38, 38, 0.2);
  margin: 0;
  padding: 0.65rem;
  font-size: 0.8125rem;
}

.submit-btn {
  display: flex;
  height: 2.75rem;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.75rem;
  border: none;
  background-color: #2563eb;
  color: #ffffff;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
  transition: all 0.2s ease;

  &:hover {
    background-color: #1d4ed8;
    box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

/* Page Footer with Protected Pill Backdrop */
.page-footer {
  position: relative;
  z-index: 10;
  text-align: center;
  padding: 0.75rem 1rem;
  flex-shrink: 0;

  @media (max-height: 750px) {
    padding: 0.45rem 1rem;
  }

  span {
    display: inline-block;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 0.35rem 1rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #334155;
    border: 1px solid rgba(226, 232, 240, 0.85);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);

    @media (max-width: 480px) {
      font-size: 0.6875rem;
      padding: 0.25rem 0.75rem;
    }
  }
}

.icon-md {
  width: 1.25rem;
  height: 1.25rem;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}
</style>

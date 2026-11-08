<script setup lang="ts">
import { useSessionStore } from 'src/stores/session';
import { roleLabels } from 'src/types/auth';
import { Lock } from 'lucide-vue-next';

const sessionStore = useSessionStore();
</script>

<template>
  <div class="access-denied-container">
    <div class="access-denied-card shadow-card">
      <div class="lock-icon-wrap">
        <Lock class="lock-icon" />
      </div>
      <h2 class="denied-title">عدم دسترسی</h2>
      <p class="denied-desc">
        نقش «{{ sessionStore.session ? roleLabels[sessionStore.session.role] : '' }}» مجوز مشاهده این بخش را ندارد.
      </p>
      <router-link to="/dashboard" class="return-btn">
        بازگشت به داشبورد
      </router-link>
    </div>
  </div>
</template>

<style scoped lang="scss">
.access-denied-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  padding: 2rem 1rem;
}

.access-denied-card {
  width: 100%;
  max-w: 28rem;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  background-color: var(--card);
  padding: 2rem;
  text-align: center;
}

.lock-icon-wrap {
  display: grid;
  place-items: center;
  margin: 0 auto;
}

.lock-icon {
  width: 2.5rem;
  height: 2.5rem;
  color: var(--destructive);
}

.denied-title {
  margin-top: 1rem;
  font-size: 1.125rem;
  font-weight: 700;
}

.denied-desc {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--muted-foreground);
}

.return-btn {
  display: inline-block;
  margin-top: 1.5rem;
  border-radius: var(--radius-md);
  background-color: var(--primary);
  color: var(--primary-foreground);
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.9;
  }
}
</style>

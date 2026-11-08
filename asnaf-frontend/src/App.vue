<script setup lang="ts">
import { onMounted } from 'vue';
import { useSessionStore } from 'src/stores/session';

const sessionStore = useSessionStore();

onMounted(() => {
  sessionStore.initSession();
});
</script>

<template>
  <router-view />
</template>

<script setup lang="ts">
export interface MapPoint {
  id: string | number;
  x: number;
  y: number;
  tone: 'success' | 'warning' | 'destructive' | 'primary' | 'gold';
  label: string;
  pulse?: boolean;
}

withDefaults(
  defineProps<{
    points: MapPoint[];
    zones?: boolean;
  }>(),
  {
    zones: true,
  }
);

const toneColors = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
  primary: 'var(--primary)',
  gold: 'var(--gold)',
};
</script>

<template>
  <div class="map-canvas-container">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="map-svg">
      <defs>
        <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M5 0H0V5" fill="none" stroke="var(--border)" stroke-width="0.15" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#grid)" />
      
      <!-- Karun river -->
      <path
        d="M58 0 C50 20, 64 35, 52 50 S40 75, 48 100"
        fill="none"
        stroke="oklch(from var(--primary) l c h / 25%)"
        stroke-width="3"
      />
      
      <!-- Main roads -->
      <path d="M0 40 H100 M0 70 H100 M30 0 V100 M75 0 V100" stroke="oklch(from var(--foreground) l c h / 10%)" stroke-width="0.6" />
      
      <!-- Inspection Zones -->
      <g v-if="zones">
        <rect x="8" y="12" width="30" height="24" rx="2" fill="oklch(from var(--success) l c h / 10%)" stroke="oklch(from var(--success) l c h / 50%)" stroke-width="0.3" stroke-dasharray="1 0.6" />
        <rect x="60" y="45" width="28" height="30" rx="2" fill="oklch(from var(--destructive) l c h / 10%)" stroke="oklch(from var(--destructive) l c h / 50%)" stroke-width="0.3" stroke-dasharray="1 0.6" />
        <rect x="15" y="55" width="25" height="28" rx="2" fill="oklch(from var(--warning) l c h / 15%)" stroke="var(--warning)" stroke-width="0.3" stroke-dasharray="1 0.6" />
      </g>
    </svg>

    <!-- Map Points -->
    <div
      v-for="p in points"
      :key="p.id"
      class="map-point group"
      :style="{ left: `${p.x}%`, top: `${p.y}%` }"
    >
      <span
        v-if="p.pulse"
        class="pulse-ring"
        :style="{ backgroundColor: toneColors[p.tone] }"
      />
      <svg viewBox="0 0 10 10" class="point-svg">
        <circle cx="5" cy="5" r="4.2" :fill="toneColors[p.tone]" stroke="var(--card)" stroke-width="1.4" />
      </svg>
      <span class="point-tooltip">
        {{ p.label }}
      </span>
    </div>

    <div class="map-attribution">نقشه اهواز · Neshan / OSM</div>
  </div>
</template>

<style scoped lang="scss">
.map-canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 380px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background-color: var(--muted);
}

.map-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.map-point {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 10;

  &:hover .point-tooltip {
    opacity: 1;
    visibility: visible;
  }
}

.pulse-ring {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  opacity: 0.6;
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
  75%, 100% {
    transform: scale(2.4);
    opacity: 0;
  }
}

.point-svg {
  position: relative;
  width: 0.875rem;
  height: 0.875rem;
  display: block;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.point-tooltip {
  pointer-events: none;
  position: absolute;
  bottom: calc(100% + 4px);
  right: 50%;
  transform: translateX(50%);
  white-space: nowrap;
  border-radius: var(--radius-sm);
  background-color: var(--popover);
  color: var(--popover-foreground);
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease;
  z-index: 20;
}

.map-attribution {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  border-radius: var(--radius-sm);
  background-color: oklch(from var(--card) l c h / 90%);
  padding: 0.25rem 0.5rem;
  font-size: 0.625rem;
  color: var(--muted-foreground);
  backdrop-filter: blur(4px);
}
</style>

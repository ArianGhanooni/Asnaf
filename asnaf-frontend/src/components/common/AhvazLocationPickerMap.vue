<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AHVAZ_CENTER,
  AHVAZ_BOUNDS,
  ahvazNeighborhoods,
  findNeighborhoodByCoords,
} from 'src/utils/ahvazGis';
import {
  MapPin,
  Crosshair,
  Plus,
  Minus,
} from 'lucide-vue-next';

interface Props {
  readonly latLng: [number, number];
  readonly neighborhood?: string | undefined;
  readonly height?: string | undefined;
}

const props = withDefaults(defineProps<Props>(), {
  neighborhood: undefined,
  height: '280px',
});

const emit = defineEmits<{
  (e: 'update:latLng', coords: [number, number]): void;
  (e: 'location-selected', info: { latLng: [number, number]; neighborhood?: string | undefined; region?: string | undefined; x: number; y: number }): void;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
let tileLayer: L.TileLayer | null = null;
let currentMarker: L.Marker | null = null;
let polygonsGroup: L.LayerGroup | null = null;

const currentCoords = ref<[number, number]>([...props.latLng]);
const detectedNeighborhood = ref<string>(props.neighborhood || 'کیانپارس');
const isLocating = ref<boolean>(false);

function calculateXY(lat: number, lng: number): { x: number; y: number } {
  const x = Math.round(Math.min(95, Math.max(5, ((lng - 48.58) / 0.20) * 100)));
  const y = Math.round(Math.min(95, Math.max(5, ((lat - 31.25) / 0.15) * 100)));
  return { x, y };
}

// طراحی مدرن، دقیق و استاندارد نشانگر نقشه (SVG Teardrop with Drop Shadow & Target Point)
function createPickerIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-location-pin-container',
    html: `
      <div class="pin-wrapper">
        <div class="pin-head-svg">
          <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="pinGradient" x1="16" y1="0" x2="16" y2="40" gradientUnits="userSpaceOnUse">
                <stop stop-color="#ef4444"/>
                <stop offset="100%" stop-color="#b91c1c"/>
              </linearGradient>
              <filter id="pinShadow" x="-4" y="0" width="40" height="46" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.35"/>
              </filter>
            </defs>
            <path filter="url(#pinShadow)" d="M16 1C7.71573 1 1 7.71573 1 16C1 26.2 14.5 38.6 15.4 39.5C15.7 39.8 16.3 39.8 16.6 39.5C17.5 38.6 31 26.2 31 16C31 7.71573 24.2843 1 16 1Z" fill="url(#pinGradient)" stroke="#ffffff" stroke-width="2"/>
            <circle cx="16" cy="15" r="5.5" fill="#ffffff"/>
            <circle cx="16" cy="15" r="2.8" fill="#dc2626"/>
          </svg>
        </div>
        <div class="pin-ground-anchor">
          <span class="ground-pulse"></span>
          <span class="ground-dot"></span>
        </div>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
  });
}

function updateLocation(lat: number, lng: number): void {
  const roundedLat = Number(lat.toFixed(6));
  const roundedLng = Number(lng.toFixed(6));
  currentCoords.value = [roundedLat, roundedLng];

  if (currentMarker) {
    currentMarker.setLatLng([roundedLat, roundedLng]);
  }

  // تشخیص خودکار محله بر اساس مختصات
  const match = findNeighborhoodByCoords(roundedLat, roundedLng);
  if (match) {
    detectedNeighborhood.value = match.name;
  }

  const { x, y } = calculateXY(roundedLat, roundedLng);

  emit('update:latLng', [roundedLat, roundedLng]);
  emit('location-selected', {
    latLng: [roundedLat, roundedLng],
    neighborhood: match?.name,
    region: match?.region,
    x,
    y,
  });
}

function initMap(): void {
  if (!mapContainer.value) return;

  const initialLat = currentCoords.value[0] || AHVAZ_CENTER[0];
  const initialLng = currentCoords.value[1] || AHVAZ_CENTER[1];

  // پیکربندی استاندارد نقشه بدون امکان فوکوس ناخواسته و پرش صفحه
  map = L.map(mapContainer.value, {
    center: [initialLat, initialLng],
    zoom: 14,
    minZoom: 11,
    maxZoom: 18,
    zoomControl: false,
    maxBounds: AHVAZ_BOUNDS,
    keyboard: false, // جلوگیری از دریافت فوکوس و پرش به بالای صفحه
    scrollWheelZoom: true,
  });

  // استفاده مستقیم از تایل‌های OpenStreetMap
  tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  polygonsGroup = L.layerGroup().addTo(map);

  // رسم یکپارچه کلیه حریم‌های محلات اهواز با استایل یکسان، یک‌رنگ و کاملاً غیرقابل انتخاب
  // interactive: false باعث می‌شود کلیک‌ها یا لمس موبایل مستقیماً به نقشه برسد
  const UNIFORM_BOUNDARY_STYLE: L.PolylineOptions = {
    color: '#0284c7', // رنگ ثابت خطوط حریم (Sky Blue)
    weight: 1.5,
    dashArray: '4, 4',
    fillColor: '#38bdf8',
    fillOpacity: 0.05, // سایه ملایم و یکنواخت برای خوانایی کامل نقشه
    interactive: false, // غیرقابل کلیک/انتخاب بودن حریم محله‌ها
  };

  ahvazNeighborhoods.forEach((n) => {
    L.polygon(n.polygon, UNIFORM_BOUNDARY_STYLE).addTo(polygonsGroup!);
  });

  // نشانگر موقعیت با آیکون مدرن جدید
  currentMarker = L.marker([initialLat, initialLng], {
    draggable: true,
    icon: createPickerIcon(),
    zIndexOffset: 1000,
  }).addTo(map);

  // رویداد اتمام Drag نشانگر
  currentMarker.on('dragend', () => {
    if (!currentMarker) return;
    const pos = currentMarker.getLatLng();
    updateLocation(pos.lat, pos.lng);
  });

  // رویداد کلیک یا لمس مستقیم روی نقشه بدون پرش صفحه
  map.on('click', (e: L.LeafletMouseEvent) => {
    if (e.originalEvent) {
      e.originalEvent.stopPropagation();
      e.originalEvent.preventDefault();
    }
    updateLocation(e.latlng.lat, e.latlng.lng);
  });

  nextTick(() => {
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 250);
  });
}

function zoomIn(e: Event): void {
  e.preventDefault();
  if (map) map.zoomIn();
}

function zoomOut(e: Event): void {
  e.preventDefault();
  if (map) map.zoomOut();
}

function locateDeviceGps(e: Event): void {
  e.preventDefault();
  if (!navigator.geolocation) return;
  isLocating.value = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      isLocating.value = false;
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      // بررسی آیا موقعیت در اهواز است
      if (lat >= 31.15 && lat <= 31.45 && lng >= 48.45 && lng <= 48.85) {
        updateLocation(lat, lng);
        if (map) map.setView([lat, lng], 16, { animate: false });
      }
    },
    () => {
      isLocating.value = false;
    },
    { timeout: 8000 }
  );
}

// در صورت تغییر موقعیت از والد (بدون انیمیشن یا پرش نقشه)
watch(
  () => props.latLng,
  ([newLat, newLng]) => {
    if (
      Math.abs(newLat - currentCoords.value[0]) > 0.0001 ||
      Math.abs(newLng - currentCoords.value[1]) > 0.0001
    ) {
      updateLocation(newLat, newLng);
    }
  }
);

onMounted(() => {
  initMap();
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<template>
  <div class="ahvaz-location-picker" dir="rtl">
    <!-- نوار وضعیت بالای نقشه -->
    <div class="picker-top-bar">
      <div class="coords-display">
        <MapPin class="icon-xs text-primary flex-shrink-0" />
        <span class="lbl">موقعیت انتخابی روی نقشه:</span>
        <span v-if="detectedNeighborhood" class="neigh-pill">
          محله: <strong>{{ detectedNeighborhood }}</strong>
        </span>
      </div>

      <div class="picker-tools">
        <button
          type="button"
          class="tool-btn"
          @click="locateDeviceGps"
          :disabled="isLocating"
          title="مکان‌یابی فعلی بازرس (GPS)"
        >
          <Crosshair class="icon-xs" />
          <span>موقعیت من (GPS)</span>
        </button>
      </div>
    </div>

    <!-- کانتینر نقشه Leaflet -->
    <div class="map-view-wrapper" :style="{ height }">
      <!-- tabindex -1 و استایل برای ممانعت از پرش فوکوس صفحه هنگام کلیک -->
      <div
        ref="mapContainer"
        class="leaflet-map-host"
        tabindex="-1"
      ></div>

      <!-- کنترل‌های بزرگ‌نمایی اختصاصی (دکمه‌های استاندارد بدون تگ <a>) -->
      <div class="custom-zoom-controls">
        <button type="button" class="zoom-btn" @click="zoomIn" title="بزرگ‌نمایی">
          <Plus class="icon-xs" />
        </button>
        <button type="button" class="zoom-btn" @click="zoomOut" title="کوچک‌نمایی">
          <Minus class="icon-xs" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ahvaz-location-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.picker-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.coords-display {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--foreground);
}

.lbl {
  font-weight: 600;
  color: var(--muted-foreground);
}

.neigh-pill {
  background: var(--muted);
  border: 1px solid var(--border);
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.775rem;
  color: var(--foreground);

  strong {
    color: var(--primary);
  }
}

.picker-tools {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.6rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--foreground);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--muted);
    border-color: var(--primary);
    color: var(--primary);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.map-view-wrapper {
  position: relative;
  width: 100%;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 2px solid var(--border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.leaflet-map-host {
  width: 100%;
  height: 100%;
  z-index: 1;
  outline: none !important;
  touch-action: pan-x pan-y;

  &:focus {
    outline: none !important;
  }
}

/* Custom Zoom Controls (Pure button elements to avoid any href="#" jump) */
.custom-zoom-controls {
  position: absolute;
  bottom: 0.75rem;
  left: 0.75rem;
  z-index: 500;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  border-radius: 0.5rem;
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--border);
}

.zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  background: var(--card);
  border: none;
  color: var(--foreground);
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background: var(--muted);
    color: var(--primary);
  }

  &:first-child {
    border-bottom: 1px solid var(--border);
  }
}

/* Redesigned Location Marker Pin */
:deep(.custom-location-pin-container) {
  background: transparent !important;
  border: none !important;

  .pin-wrapper {
    position: relative;
    width: 32px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  .pin-head-svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 32px;
    height: 42px;
    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: bottom center;

    &:hover {
      transform: scale(1.1) translateY(-2px);
    }
  }

  .pin-ground-anchor {
    position: absolute;
    bottom: -3px;
    left: 50%;
    transform: translateX(-50%);
    width: 14px;
    height: 6px;
    display: flex;
    align-items: center;
    justify-content: center;

    .ground-dot {
      width: 8px;
      height: 4px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.45);
    }

    .ground-pulse {
      position: absolute;
      width: 14px;
      height: 6px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.4);
      animation: ground-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
  }
}

@keyframes ground-ping {
  75%, 100% {
    transform: scale(1.8);
    opacity: 0;
  }
}

.icon-xs {
  width: 0.95rem;
  height: 0.95rem;
}
</style>
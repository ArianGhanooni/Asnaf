<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Unit } from 'src/types/asnaf';
import {
  ahvazNeighborhoods,
  AHVAZ_CENTER,
  AHVAZ_DEFAULT_ZOOM,
  AHVAZ_BOUNDS,
  getUnitLatLng,
  getNeighborhoodHeatStyle,
  HEAT_PALETTE,
} from 'src/utils/ahvazGis';
import { fa } from 'src/utils/fa';
import { Layers, RotateCcw, MapPin, Compass } from 'lucide-vue-next';

interface Props {
  readonly units: Unit[];
  readonly selectedUnitId?: number | null;
  readonly height?: string;
  readonly stage?: 'warning_1' | 'warning_2' | 'seal_ordered';
  readonly stageTitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  selectedUnitId: null,
  height: '420px',
  stage: 'warning_1',
  stageTitle: 'نقشه حرارتی و موقعیت پرونده‌ها',
});

const emit = defineEmits<{
  (e: 'select-unit', unit: Unit): void;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
let mapInstance: L.Map | null = null;
let polygonLayerGroup: L.LayerGroup | null = null;
let markersLayerGroup: L.LayerGroup | null = null;
const markerMap = new Map<number, L.Marker>();

const showHeatmap = ref(true);

const stageColor = computed(() => {
  if (props.stage === 'seal_ordered') return '#ef4444'; // Red
  if (props.stage === 'warning_2') return '#f97316'; // Orange
  return '#eab308'; // Amber / Yellow
});

// محاسبه چگالی پرونده‌ها در هر محله اهواز
const neighborhoodUnitCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (const n of ahvazNeighborhoods) {
    counts[n.id] = 0;
  }
  for (const u of props.units) {
    const searchTxt = `${u.region} ${u.address} ${u.name}`;
    for (const n of ahvazNeighborhoods) {
      if (searchTxt.includes(n.name)) {
        counts[n.id] = (counts[n.id] ?? 0) + 1;
        break;
      }
    }
  }
  return counts;
});

const maxNeighborhoodCount = computed(() => {
  const vals = Object.values(neighborhoodUnitCounts.value);
  return vals.length > 0 ? Math.max(...vals, 1) : 1;
});

function createCustomPinIcon(stage: string, isSelected: boolean): L.DivIcon {
  const color = stage === 'seal_ordered' ? '#ef4444' : stage === 'warning_2' ? '#f97316' : '#eab308';
  const size = isSelected ? 38 : 30;
  return L.divIcon({
    className: 'custom-heat-pin',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: 2.5px solid #ffffff;
        border-radius: 9999px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        transform: translate(-50%, -50%);
        transition: all 0.2s ease;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function initMap(): void {
  if (!mapContainer.value || mapInstance) return;

  mapInstance = L.map(mapContainer.value, {
    center: AHVAZ_CENTER,
    zoom: AHVAZ_DEFAULT_ZOOM,
    minZoom: 11,
    maxZoom: 17,
    maxBounds: AHVAZ_BOUNDS,
    zoomControl: false,
  });

  L.control.zoom({ position: 'bottomleft' }).addTo(mapInstance);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(mapInstance);

  polygonLayerGroup = L.layerGroup().addTo(mapInstance);
  markersLayerGroup = L.layerGroup().addTo(mapInstance);

  renderHeatmapPolygons();
  renderUnitMarkers();
}

function renderHeatmapPolygons(): void {
  if (!polygonLayerGroup) return;
  polygonLayerGroup.clearLayers();

  if (!showHeatmap.value) return;

  const counts = neighborhoodUnitCounts.value;
  const max = maxNeighborhoodCount.value;

  for (const n of ahvazNeighborhoods) {
    const count = counts[n.id] ?? 0;
    const style = getNeighborhoodHeatStyle(count, max);

    const polygon = L.polygon(n.polygon, {
      color: style.borderColor,
      weight: 1.5,
      opacity: 0.8,
      fillColor: style.color,
      fillOpacity: count > 0 ? style.fillOpacity : 0.08,
      dashArray: count > 0 ? undefined : '4, 4',
    });

    polygon.bindTooltip(
      `
      <div style="direction: rtl; text-align: right; font-family: inherit; font-size: 0.85rem; padding: 2px;">
        <p style="font-weight: 700; margin: 0 0 4px 0;">محله ${n.name}</p>
        <p style="margin: 0; color: #475569;">${n.region} · ${fa(count)} واحد در این مرحله</p>
      </div>
    `,
      { sticky: true, direction: 'auto' }
    );

    polygon.addTo(polygonLayerGroup);
  }
}

function renderUnitMarkers(): void {
  if (!markersLayerGroup) return;
  markersLayerGroup.clearLayers();
  markerMap.clear();

  for (const unit of props.units) {
    const latLng = getUnitLatLng(unit);
    const isSelected = unit.id === props.selectedUnitId;
    const icon = createCustomPinIcon(props.stage, isSelected);

    const marker = L.marker(latLng, { icon, riseOnHover: true });

    marker.bindPopup(
      `
      <div style="direction: rtl; text-align: right; font-family: inherit; min-width: 180px; padding: 4px;">
        <h4 style="margin: 0 0 6px 0; font-size: 0.95rem; font-weight: 800; color: #0f172a;">${unit.name}</h4>
        <p style="margin: 0 0 4px 0; font-size: 0.8rem; color: #475569;">متصدی: <strong>${unit.operator}</strong></p>
        <p style="margin: 0 0 4px 0; font-size: 0.8rem; color: #475569;">صنف: ${unit.union}</p>
        <p style="margin: 0 0 8px 0; font-size: 0.75rem; color: #64748b;">${unit.address}</p>
        <div style="display: flex; justify-content: flex-end;">
          <span style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">
            انتخاب پرونده
          </span>
        </div>
      </div>
    `,
      { closeButton: false }
    );

    marker.on('click', () => {
      emit('select-unit', unit);
    });

    marker.addTo(markersLayerGroup);
    markerMap.set(unit.id, marker);
  }
}

function resetView(): void {
  if (!mapInstance) return;
  mapInstance.flyTo(AHVAZ_CENTER, AHVAZ_DEFAULT_ZOOM, { duration: 1 });
}

function toggleHeatmap(): void {
  showHeatmap.value = !showHeatmap.value;
  renderHeatmapPolygons();
}

watch(
  () => props.units,
  () => {
    renderHeatmapPolygons();
    renderUnitMarkers();
  },
  { deep: true }
);

watch(
  () => props.selectedUnitId,
  (newId) => {
    if (!newId || !mapInstance) return;
    const marker = markerMap.get(newId);
    const unit = props.units.find((u) => u.id === newId);
    if (marker && unit) {
      const latLng = getUnitLatLng(unit);
      mapInstance.flyTo(latLng, 15, { duration: 0.8 });
      marker.openPopup();
    }
  }
);

onMounted(() => {
  nextTick(() => {
    initMap();
  });
});

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<template>
  <div class="heatmap-panel-wrapper">
    <!-- Map Control Header -->
    <div class="heatmap-header">
      <div class="header-info">
        <span class="header-title">{{ stageTitle }}</span>
      </div>

      <div class="header-actions">
        <button
          type="button"
          :class="['control-btn', { 'is-active': showHeatmap }]"
          @click="toggleHeatmap"
          title="تغییر لایه حرارتی"
        >
          <Layers class="icon-xs" />
          <span>لایه تراکم</span>
        </button>

        <button
          type="button"
          class="control-btn"
          @click="resetView"
          title="بازنشانی نمای نقشه اهواز"
        >
          <RotateCcw class="icon-xs" />
          <span>نمای کل اهواز</span>
        </button>
      </div>
    </div>

    <!-- Leaflet Map Container -->
    <div
      ref="mapContainer"
      class="leaflet-heatmap-canvas"
      :style="{ height }"
      data-testid="ahvaz-inspection-heatmap"
    />
  </div>
</template>

<style scoped lang="scss">
.heatmap-panel-wrapper {
  display: flex;
  flex-direction: column;
  border-radius: 1rem;
  border: 1px solid var(--border);
  background: var(--card);
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.heatmap-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--card);
  gap: 0.5rem;
  flex-wrap: wrap;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--foreground);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: var(--foreground);
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(37, 99, 235, 0.08);
    border-color: var(--primary);
    color: var(--primary);
  }

  &.is-active {
    background: var(--primary);
    color: #ffffff;
    border-color: var(--primary);
  }
}

.leaflet-heatmap-canvas {
  width: 100%;
  position: relative;
  z-index: 1;
}

.icon-sm {
  width: 1.15rem;
  height: 1.15rem;
}

.icon-xs {
  width: 0.85rem;
  height: 0.85rem;
}
</style>


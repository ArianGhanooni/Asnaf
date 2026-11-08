<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SpecializedUnitItem, SpecializedUnionConfig } from 'src/types/specialized';
import { fa } from 'src/utils/fa';
import {
  ahvazNeighborhoods,
  AHVAZ_CENTER,
  AHVAZ_DEFAULT_ZOOM,
  AHVAZ_BOUNDS,
  getSpecializedUnitLatLng,
  type AhvazNeighborhood,
} from 'src/utils/ahvazGis';
import {
  Filter,
  Layers,
  RotateCcw,
  MapPin,
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-vue-next';

interface Props {
  readonly units: SpecializedUnitItem[];
  readonly unionConfig: SpecializedUnionConfig;
  readonly height?: string;
  readonly selectedUnitId?: number | null | undefined;
}

const props = withDefaults(defineProps<Props>(), {
  height: '520px',
  selectedUnitId: null,
});

const emit = defineEmits<{
  (e: 'select-unit', unit: SpecializedUnitItem): void;
}>();

// جلوگیری قاطع از پرش اسکرول صفحه به بالا در تعامل با لایفلت
// @ts-expect-error override Leaflet internal refocus
if (L.Control && L.Control.prototype && !L.Control.prototype._refocusPatched) {
  // @ts-expect-error internal method override
  L.Control.prototype._refocusOnMap = function () {};
  // @ts-expect-error marker flag
  L.Control.prototype._refocusPatched = true;
}

// رنگ‌بندی تفکیک‌شده و متمایز محلات کلان‌شهر اهواز بر روی OpenStreetMap
const neighborhoodDistinctColors: Record<string, string> = {
  کیانپارس: '#0284c7', // آبی آسمانی
  کیان‌آباد: '#0d9488', // سبز کله‌غازی
  امانیه: '#d97706', // کهربایی گرم
  'زیتون کارمندی': '#2563eb', // آبی درباری
  'کوی ملت': '#059669', // زمردی
  کوروش: '#059669',
  گلستان: '#7c3aed', // بنفش
  نادری: '#e11d48', // رز یاقوتی
  پادادشهر: '#f59e0b', // طلایی
  کمپلو: '#4f46e5', // نیلی / ایندیگو
  خشایار: '#db2777', // سرخابی
  'عین ۲': '#64748b', // سربی
  سپیدار: '#0891b2', // فیروزه‌ای
  باهنر: '#0891b2',
};

function getNeighborhoodColor(name: string): string {
  for (const [key, color] of Object.entries(neighborhoodDistinctColors)) {
    if (name.includes(key)) return color;
  }
  return '#0284c7';
}

// فیلترهای نقشه پایش اصناف
const searchQuery = ref<string>('');
const statusFilter = ref<string>('all');
const categoryFilter = ref<string>('all');
const neighborhoodFilter = ref<string>('all');
const showNeighborhoodPolygons = ref<boolean>(true);

// نقشه و لایه‌ها
const mapContainer = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
let tileLayer: L.TileLayer | null = null;
let polygonsLayerGroup: L.LayerGroup | null = null;
let markersLayerGroup: L.LayerGroup | null = null;
const unitMarkersMap = new Map<number, L.Marker>();

// لایه استاندارد و آزاد OpenStreetMap دقیقاً شبیه ماژول نان و آرد
const osmTileConfig = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  options: {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};

function initTileLayer(): void {
  if (!map) return;
  if (tileLayer) {
    map.removeLayer(tileLayer);
  }
  tileLayer = L.tileLayer(osmTileConfig.url, osmTileConfig.options).addTo(map);
  tileLayer.bringToBack();
}

// واحدهای فیلترشده روی نقشه
const filteredUnits = computed<SpecializedUnitItem[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return props.units.filter((u) => {
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.operator.toLowerCase().includes(q) ||
      u.neighborhood.toLowerCase().includes(q) ||
      u.category.toLowerCase().includes(q) ||
      u.address.toLowerCase().includes(q);

    const matchesStatus = statusFilter.value === 'all' || u.status === statusFilter.value;
    const matchesCategory = categoryFilter.value === 'all' || u.category === categoryFilter.value;
    const matchesNeighborhood =
      neighborhoodFilter.value === 'all' || u.neighborhood === neighborhoodFilter.value;

    return matchesSearch && matchesStatus && matchesCategory && matchesNeighborhood;
  });
});

// آمار لحظه‌ای نقشه
const mapStats = computed(() => {
  const total = filteredUnits.value.length;
  const normal = filteredUnits.value.filter((u) => u.status === 'normal').length;
  const warning = filteredUnits.value.filter((u) => u.status === 'warning').length;
  const alert = filteredUnits.value.filter((u) => u.status === 'alert').length;
  return { total, normal, warning, alert };
});

function initMap(): void {
  if (!mapContainer.value) return;

  map = L.map(mapContainer.value, {
    center: AHVAZ_CENTER,
    zoom: AHVAZ_DEFAULT_ZOOM,
    zoomControl: false,
    minZoom: 10,
    maxZoom: 20,
    keyboard: false,
  });

  const container = map.getContainer();
  const origFocus = container.focus.bind(container);
  container.focus = (opts?: FocusOptions) => {
    origFocus({ ...opts, preventScroll: true });
  };
  container.removeAttribute('tabindex');

  // جلوگیری از جهش صفحه به بالا به دلیل لینک‌های با href="#" در کنترل‌های لایفلت
  container.addEventListener(
    'click',
    (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (!href || href === '#' || href === 'javascript:void(0)' || href.startsWith('#')) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    },
    true
  );

  map.on('click', (e: L.LeafletMouseEvent) => {
    if (e.originalEvent) {
      L.DomEvent.stopPropagation(e.originalEvent);
      L.DomEvent.preventDefault(e.originalEvent);
    }
  });

  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  initTileLayer();
  map.fitBounds(AHVAZ_BOUNDS, { padding: [15, 15] });

  polygonsLayerGroup = L.layerGroup().addTo(map);
  markersLayerGroup = L.layerGroup().addTo(map);

  renderNeighborhoodPolygons();
  renderUnitMarkers();
}

/**
 * رسم مرزبندی تفکیک‌شده محلات اهواز با منطقه‌های رنگی متفاوت بر پایه OpenStreetMap
 */
function renderNeighborhoodPolygons(): void {
  const group = polygonsLayerGroup;
  if (!group) return;
  group.clearLayers();

  if (!showNeighborhoodPolygons.value) return;

  ahvazNeighborhoods.forEach((n: AhvazNeighborhood) => {
    const neighborhoodUnits = props.units.filter((u) => u.neighborhood === n.name);
    const count = neighborhoodUnits.length;
    const warningCount = neighborhoodUnits.filter((u) => u.status === 'warning').length;
    const alertCount = neighborhoodUnits.filter((u) => u.status === 'alert').length;

    // اختصاص رنگ منحصر‌به‌فرد منطقه
    const color = getNeighborhoodColor(n.name);

    const polygon = L.polygon(n.polygon, {
      color: color,
      fillColor: color,
      fillOpacity: 0.20,
      weight: 2,
      dashArray: count === 0 ? '4, 4' : undefined,
    });

    const tooltipContent = `
      <div class="compact-neighborhood-card" dir="rtl">
        <div class="cn-head">
          <span class="cn-color-bullet" style="background-color: ${color};"></span>
          <strong class="cn-title">${n.name}</strong>
          <span class="cn-region">${fa(n.region)}</span>
        </div>
        <div class="cn-stats">
          <span class="cn-pill active">${fa(count)} واحد پایش</span>
          ${alertCount > 0 ? `<span class="cn-pill warn">${fa(alertCount)} بحرانی</span>` : warningCount > 0 ? `<span class="cn-pill warn">${fa(warningCount)} اخطار</span>` : `<span class="cn-pill done">عادی</span>`}
        </div>
      </div>
    `;

    const isNorth = n.center[0] > 31.3320;
    polygon.bindTooltip(tooltipContent, {
      sticky: true,
      direction: isNorth ? 'bottom' : 'top',
      offset: isNorth ? [0, 10] : [0, -10],
      className: 'osm-custom-tooltip',
    });

    polygon.on('mouseover', () => {
      polygon.setStyle({ fillOpacity: 0.45, weight: 3.5 });
    });

    polygon.on('mouseout', () => {
      polygon.setStyle({ fillOpacity: 0.20, weight: 2 });
    });

    polygon.on('click', (e: L.LeafletMouseEvent) => {
      if (e.originalEvent) {
        L.DomEvent.stopPropagation(e.originalEvent);
        L.DomEvent.preventDefault(e.originalEvent);
      }
      neighborhoodFilter.value = n.name;
      if (map) {
        map.flyTo(n.center, 14, { duration: 0.8 });
      }
    });

    polygon.addTo(group);

    const fadedLabelIcon = L.divIcon({
      html: `
        <div class="neighborhood-faded-watermark">
          <span class="faded-title" style="color: ${color};">${n.name}</span>
          <span class="faded-sub">${fa(n.region)}</span>
        </div>
      `,
      className: 'faded-label-wrapper',
      iconSize: [130, 36],
      iconAnchor: [65, 18],
    });

    L.marker(n.center, {
      icon: fadedLabelIcon,
      interactive: false,
    }).addTo(group);
  });
}

/**
 * ایجاد پین نقطه‌ای سفارشی
 */
function createUnitDivIcon(status: string, isSelected: boolean): L.DivIcon {
  const statusClass =
    status === 'normal'
      ? 'status-normal'
      : status === 'warning'
        ? 'status-warning'
        : 'status-alert';

  const selectedClass = isSelected ? 'is-selected-spot' : '';

  const html = `
    <div class="specialized-spot-pin ${statusClass} ${selectedClass}">
      ${isSelected ? '<span class="spot-selected-glow"></span>' : ''}
      <span class="spot-pulse ${status}"></span>
      <span class="spot-core ${status}"></span>
    </div>
  `;

  return L.divIcon({
    html,
    className: `custom-specialized-pin-wrapper ${selectedClass}`,
    iconSize: isSelected ? [36, 36] : [26, 26],
    iconAnchor: isSelected ? [18, 18] : [13, 13],
    popupAnchor: [0, -13],
  });
}

/**
 * رسم مارکرهای واحدهای صنفی روی نقشه اهواز
 */
function renderUnitMarkers(): void {
  const group = markersLayerGroup;
  if (!group) return;
  group.clearLayers();
  unitMarkersMap.clear();

  filteredUnits.value.forEach((unit: SpecializedUnitItem) => {
    const latLng = getSpecializedUnitLatLng(unit);
    const isSelected = props.selectedUnitId === unit.id;
    const icon = createUnitDivIcon(unit.status, isSelected);

    const marker = L.marker(latLng, {
      icon,
      zIndexOffset: isSelected ? 1500 : 0,
    });

    const statusToneClass =
      unit.status === 'normal'
        ? 'normal'
        : unit.status === 'warning'
          ? 'warning'
          : 'alert';

    const tooltipContent = `
      <div class="compact-specialized-card" dir="rtl">
        <div class="cs-head">
          <div class="cs-title-wrap">
            <span class="cs-status-bullet ${statusToneClass}"></span>
            <strong class="cs-name">${unit.name}</strong>
          </div>
          <span class="cs-category-badge">${unit.category}</span>
        </div>

        <div class="cs-meta">
          <span class="cs-place">${unit.neighborhood} (${fa(unit.region)})</span>
          <span class="cs-sep">·</span>
          <span class="cs-operator">متصدی: ${unit.operator}</span>
        </div>

        <div class="cs-metrics-box">
          <div class="cs-metric-row">
            <span class="metric-label">${unit.metric1Label}:</span>
            <strong class="metric-val">${fa(unit.metric1Value)}</strong>
          </div>
          <div class="cs-metric-row">
            <span class="metric-label">${unit.metric2Label}:</span>
            <strong class="metric-val">${fa(unit.metric2Value)}</strong>
          </div>
        </div>

        <div class="cs-foot">
          <span class="cs-status-pill ${statusToneClass}">${unit.statusLabel}</span>
          <span class="cs-inspection-date">بازرسی: ${fa(unit.lastInspectionDate)}</span>
        </div>
      </div>
    `;

    const isNorth = latLng[0] > 31.3320;
    marker.bindTooltip(tooltipContent, {
      direction: isNorth ? 'bottom' : 'top',
      offset: isNorth ? [0, 8] : [0, -8],
      className: 'osm-custom-tooltip',
      opacity: 0.98,
    });

    marker.on('click', (e: L.LeafletMouseEvent) => {
      if (e.originalEvent) {
        L.DomEvent.stopPropagation(e.originalEvent);
        L.DomEvent.preventDefault(e.originalEvent);
      }
      emit('select-unit', unit);
    });

    marker.addTo(group);
    unitMarkersMap.set(unit.id, marker);
  });
}

function resetMapView(): void {
  neighborhoodFilter.value = 'all';
  statusFilter.value = 'all';
  categoryFilter.value = 'all';
  searchQuery.value = '';
  if (map) {
    map.fitBounds(AHVAZ_BOUNDS, { padding: [15, 15], maxZoom: 14 });
  }
}

function togglePolygons(): void {
  showNeighborhoodPolygons.value = !showNeighborhoodPolygons.value;
  renderNeighborhoodPolygons();
}

function onNeighborhoodSelect(): void {
  if (neighborhoodFilter.value === 'all') {
    resetMapView();
    return;
  }
  const found = ahvazNeighborhoods.find((n) => n.name === neighborhoodFilter.value);
  if (found && map) {
    map.flyTo(found.center, 14, { duration: 0.8 });
  }
}

watch(
  () => props.selectedUnitId,
  (newId) => {
    renderUnitMarkers();
    if (newId != null && map) {
      const u = props.units.find((item) => item.id === newId);
      if (u) {
        const coords = getSpecializedUnitLatLng(u);
        map.flyTo(coords, 16, { duration: 0.8 });
        const m = unitMarkersMap.get(u.id);
        if (m) {
          m.openTooltip();
        }
      }
    }
  }
);

watch(
  [searchQuery, statusFilter, categoryFilter, neighborhoodFilter],
  () => {
    renderUnitMarkers();
  }
);

watch(
  () => props.units,
  () => {
    renderNeighborhoodPolygons();
    renderUnitMarkers();
  },
  { deep: true }
);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  initMap();
  if (mapContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      if (map) {
        map.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainer.value);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (map) {
    map.remove();
    map = null;
    tileLayer = null;
    polygonsLayerGroup = null;
    markersLayerGroup = null;
    unitMarkersMap.clear();
  }
});
</script>

<template>
  <div
    class="ahvaz-specialized-wrapper"
    :style="{ height: props.height, minHeight: '380px' }"
    data-testid="ahvaz-specialized-map"
  >
    <!-- نوار فیلتر و ابزارهای نقشه دقیقا شبیه ماژول نان و آرد -->
    <div class="map-toolbar-panel">
      <!-- جست‌وجوی سریع واحد / متصدی / محله -->
      <div class="filter-group search-group">
        <label class="toolbar-label">
          <Search class="icon-xxs" />
          <span>جست‌وجو:</span>
        </label>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="نام واحد، متصدی، نشانی..."
          class="toolbar-input"
          data-testid="specialized-map-search-input"
        />
      </div>

      <!-- فیلتر رسته صنفی -->
      <div class="filter-group">
        <label class="toolbar-label">
          <Filter class="icon-xxs" />
          <span>رسته:</span>
        </label>
        <select
          v-model="categoryFilter"
          class="toolbar-select"
          data-testid="specialized-map-category-filter"
        >
          <option v-for="cat in unionConfig.categories" :key="cat" :value="cat === 'همه رسته‌ها' ? 'all' : cat">
            {{ cat }}
          </option>
        </select>
      </div>

      <!-- فیلتر وضعیت پایش -->
      <div class="filter-group">
        <label class="toolbar-label">
          <AlertTriangle class="icon-xxs" />
          <span>وضعیت:</span>
        </label>
        <select
          v-model="statusFilter"
          class="toolbar-select"
          data-testid="specialized-map-status-filter"
        >
          <option value="all">همه وضعیت‌ها</option>
          <option v-for="st in unionConfig.statuses" :key="st.value" :value="st.value">
            {{ st.label }}
          </option>
        </select>
      </div>

      <!-- انتخاب محله اهواز -->
      <div class="filter-group">
        <label class="toolbar-label">
          <MapPin class="icon-xxs" />
          <span>محله:</span>
        </label>
        <select
          v-model="neighborhoodFilter"
          class="toolbar-select"
          @change="onNeighborhoodSelect"
          data-testid="specialized-map-neighborhood-filter"
        >
          <option value="all">همه محله‌های اهواز</option>
          <option
            v-for="n in ahvazNeighborhoods"
            :key="n.id"
            :value="n.name"
          >
            {{ n.name }} ({{ fa(n.region) }})
          </option>
        </select>
      </div>

      <!-- نشان پایه نقشه OpenStreetMap -->
      <div class="filter-group">
        <span class="toolbar-label">
          <Globe class="icon-xxs" />
          <span>پایه نقشه:</span>
          <span class="provider-badge" data-testid="specialized-map-provider-badge">OpenStreetMap</span>
        </span>
      </div>

      <!-- دکمه لایه مرز محلات -->
      <button
        type="button"
        :class="['toolbar-toggle-btn', { active: showNeighborhoodPolygons }]"
        @click="togglePolygons"
        data-testid="toggle-specialized-polygons-btn"
        title="نمایش / مخفی‌سازی محدوده رنگی محلات"
      >
        <Layers class="icon-xxs" />
        <span>محله‌ها</span>
      </button>

      <!-- دکمه بازنشانی نما -->
      <button
        type="button"
        class="toolbar-btn"
        @click="resetMapView"
        data-testid="reset-specialized-map-btn"
        title="بازنشانی نقشه و مرکزیت اهواز"
      >
        <RotateCcw class="icon-xxs" />
        <span>اهواز</span>
      </button>

      <!-- حباب‌های شمارنده وضعیت -->
      <div class="map-stats-badge" dir="rtl">
        <span class="stat-bubble normal" title="مطلوب و منطبق">
          {{ fa(mapStats.normal) }} مطلوب
        </span>
        <span class="stat-bubble warning" title="دارای نوسان/کسری">
          {{ fa(mapStats.warning) }} نوسان
        </span>
        <span class="stat-bubble alert" title="اخطار/تخلف">
          {{ fa(mapStats.alert) }} اخطار
        </span>
      </div>
    </div>

    <!-- کانتینر نقشه Leaflet -->
    <div ref="mapContainer" class="leaflet-map-canvas" data-testid="specialized-leaflet-map" />

    <!-- راهنمای رنگ‌های وضعیت در پایین نقشه دقیقا شبیه ماژول نان و آرد -->
    <div class="map-footer-bar">
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-spot tone-normal" />
          <span>مطلوب و منطبق</span>
        </div>
        <div class="legend-item">
          <span class="legend-spot tone-warning" />
          <span>دارای نوسان / کسری</span>
        </div>
        <div class="legend-item">
          <span class="legend-spot tone-alert" />
          <span>اخطار و تخلف صنفی</span>
        </div>
        <div class="legend-item">
          <span class="legend-zone" />
          <span>مرزبندی تفکیک‌شده محلات اهواز</span>
        </div>
      </div>

      <div class="osm-attribution">
        نقشه پایش اصناف اهواز · OpenStreetMap GIS
      </div>
    </div>
  </div>
</template>

<style lang="scss">
/* استایل‌های سراسری پین‌های صنفی و کارت‌های فشرده */
.custom-specialized-pin-wrapper {
  background: transparent;
  border: none;

  &.is-selected-spot {
    z-index: 1000 !important;
  }
}

.specialized-spot-pin {
  position: relative;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  .spot-core {
    width: 14px;
    height: 14px;
    border-radius: 9999px;
    border: 2px solid #ffffff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    z-index: 2;
    transition: transform 0.2s ease;

    &.normal {
      background-color: #10b981;
    }
    &.warning {
      background-color: #f59e0b;
    }
    &.alert {
      background-color: #ef4444;
    }
  }

  .spot-pulse {
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 9999px;
    opacity: 0.35;
    animation: spot-ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;
    z-index: 1;

    &.normal {
      background-color: #10b981;
    }
    &.warning {
      background-color: #f59e0b;
    }
    &.alert {
      background-color: #ef4444;
    }
  }

  &.is-selected-spot .spot-core {
    transform: scale(1.4);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 2px 8px rgba(0, 0, 0, 0.5);
  }

  &.is-selected-spot .spot-selected-glow {
    position: absolute;
    width: 38px;
    height: 38px;
    border-radius: 9999px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, rgba(59, 130, 246, 0) 70%);
    animation: selected-glow-pulse 1.8s ease-in-out infinite alternate;
    z-index: 0;
  }
}

@keyframes spot-ping {
  75%, 100% {
    transform: scale(1.8);
    opacity: 0;
  }
}

@keyframes selected-glow-pulse {
  from {
    transform: scale(0.9);
    opacity: 0.6;
  }
  to {
    transform: scale(1.25);
    opacity: 0.95;
  }
}

.faded-label-wrapper {
  background: transparent;
  border: none;
  pointer-events: none;
}

.neighborhood-faded-watermark {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.95), 0 0 6px rgba(255, 255, 255, 0.85);

  .faded-title {
    font-size: 0.8125rem;
    font-weight: 800;
    line-height: 1.1;
    opacity: 0.92;
    white-space: nowrap;
  }

  .faded-sub {
    font-size: 0.625rem;
    font-weight: 600;
    color: #475569;
    opacity: 0.75;
    line-height: 1;
  }
}

/* کارت فشرده تولتیپ محله */
.compact-neighborhood-card {
  padding: 0.25rem 0.35rem;
  min-width: 155px;
  max-width: 220px;
  font-family: inherit;

  .cn-head {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.25rem;
    padding-bottom: 0.2rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);

    .cn-color-bullet {
      width: 9px;
      height: 9px;
      border-radius: 9999px;
      flex-shrink: 0;
    }

    .cn-title {
      font-size: 0.75rem;
      color: #0f172a;
      flex: 1;
    }

    .cn-region {
      font-size: 0.625rem;
      color: #64748b;
      background: #f1f5f9;
      padding: 0.05rem 0.25rem;
      border-radius: 3px;
    }
  }

  .cn-stats {
    display: flex;
    align-items: center;
    gap: 0.35rem;

    .cn-pill {
      font-size: 0.625rem;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      font-weight: 600;

      &.active {
        background: #e0f2fe;
        color: #0369a1;
      }
      &.warn {
        background: #fef3c7;
        color: #b45309;
      }
      &.done {
        background: #dcfce7;
        color: #15803d;
      }
    }
  }
}

/* کارت فشرده تولتیپ واحد صنفی */
.compact-specialized-card {
  padding: 0.35rem;
  min-width: 200px;
  max-width: 260px;
  font-family: inherit;

  .cs-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.35rem;
    margin-bottom: 0.2rem;

    .cs-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      flex: 1;
      min-width: 0;

      .cs-status-bullet {
        width: 8px;
        height: 8px;
        border-radius: 9999px;
        flex-shrink: 0;

        &.normal {
          background-color: #10b981;
        }
        &.warning {
          background-color: #f59e0b;
        }
        &.alert {
          background-color: #ef4444;
        }
      }

      .cs-name {
        font-size: 0.75rem;
        color: #0f172a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .cs-category-badge {
      font-size: 0.5625rem;
      background: #f1f5f9;
      color: #475569;
      padding: 0.05rem 0.25rem;
      border-radius: 3px;
      white-space: nowrap;
    }
  }

  .cs-meta {
    font-size: 0.625rem;
    color: #64748b;
    margin-bottom: 0.3rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;

    .cs-sep {
      opacity: 0.5;
    }
  }

  .cs-metrics-box {
    background: #f8fafc;
    border-radius: 4px;
    padding: 0.25rem 0.35rem;
    margin-bottom: 0.3rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;

    .cs-metric-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.625rem;

      .metric-label {
        color: #64748b;
      }
      .metric-val {
        color: #0f172a;
        font-weight: 700;
      }
    }
  }

  .cs-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.5625rem;

    .cs-status-pill {
      font-weight: 700;
      padding: 0.05rem 0.35rem;
      border-radius: 9999px;

      &.normal {
        background-color: rgba(16, 185, 129, 0.15);
        color: #059669;
      }
      &.warning {
        background-color: rgba(245, 158, 11, 0.18);
        color: #d97706;
      }
      &.alert {
        background-color: rgba(239, 68, 68, 0.15);
        color: #dc2626;
      }
    }

    .cs-inspection-date {
      color: #94a3b8;
    }
  }
}
</style>

<style scoped lang="scss">
.ahvaz-specialized-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 460px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.leaflet-map-canvas {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 420px;
}

.map-toolbar-panel {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  background-color: var(--card);
  border-bottom: 1px solid var(--border);
  padding-block: 0.5rem;
  padding-inline: 0.75rem;
  z-index: 10;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.toolbar-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  white-space: nowrap;
}

.provider-badge {
  background-color: oklch(from var(--primary) l c h / 12%);
  color: var(--primary);
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm);
  border: 1px solid oklch(from var(--primary) l c h / 25%);
}

.toolbar-input {
  height: 1.875rem;
  width: 140px;
  font-size: 0.6875rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding-inline: 0.45rem;
  outline: none;
  transition: border-color 0.15s ease;

  &::placeholder {
    color: var(--muted-foreground);
    opacity: 0.7;
  }

  &:hover,
  &:focus {
    border-color: var(--primary);
  }
}

.toolbar-select {
  height: 1.875rem;
  font-size: 0.6875rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--foreground);
  padding-inline: 0.4rem;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:hover,
  &:focus {
    border-color: var(--primary);
  }
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  height: 1.875rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background-color: var(--muted);
  color: var(--foreground);
  font-size: 0.6875rem;
  font-weight: 600;
  padding-inline: 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--card);
    border-color: var(--primary);
    color: var(--primary);
  }
}

.toolbar-toggle-btn {
  @extend .toolbar-btn;

  &.active {
    background-color: oklch(from var(--primary) l c h / 15%);
    border-color: var(--primary);
    color: var(--primary);
  }
}

.map-stats-badge {
  margin-inline-start: auto;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.stat-bubble {
  font-size: 0.6875rem;
  font-weight: 700;
  padding-block: 0.15rem;
  padding-inline: 0.45rem;
  border-radius: 9999px;
  white-space: nowrap;

  &.normal {
    background-color: rgba(16, 185, 129, 0.15);
    color: #059669;
    border: 1px solid rgba(16, 185, 129, 0.35);
  }

  &.warning {
    background-color: rgba(245, 158, 11, 0.18);
    color: #d97706;
    border: 1px solid rgba(245, 158, 11, 0.35);
  }

  &.alert {
    background-color: rgba(239, 68, 68, 0.15);
    color: #dc2626;
    border: 1px solid rgba(239, 68, 68, 0.35);
  }
}

.map-footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  background-color: var(--card);
  border-top: 1px solid var(--border);
  padding-block: 0.375rem;
  padding-inline: 0.75rem;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  flex-wrap: wrap;
}

.legend-items {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.legend-spot {
  width: 9px;
  height: 9px;
  border-radius: 9999px;

  &.tone-normal {
    background-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
  }
  &.tone-warning {
    background-color: #f59e0b;
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3);
  }
  &.tone-alert {
    background-color: #ef4444;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3);
  }
}

.legend-zone {
  width: 14px;
  height: 8px;
  border-radius: 2px;
  background: linear-gradient(90deg, #0284c7, #059669, #e11d48, #d97706);
  opacity: 0.75;
  border: 1px dashed #0284c7;
}

.osm-attribution {
  font-size: 0.625rem;
  color: var(--muted-foreground);
  opacity: 0.8;
}
</style>

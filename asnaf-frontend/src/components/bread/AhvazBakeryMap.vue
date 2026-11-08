<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Bakery } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import {
  ahvazNeighborhoods,
  AHVAZ_CENTER,
  AHVAZ_DEFAULT_ZOOM,
  AHVAZ_BOUNDS,
  getBakeryLatLng,
  getNeighborhoodHeatStyle,
  type AhvazNeighborhood,
  type HeatStyle,
} from 'src/utils/ahvazGis';
import {
  Filter,
  Layers,
  RotateCcw,
  MapPin,
  Globe,
  Search,
  Wheat,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-vue-next';

interface Props {
  readonly bakeries: Bakery[];
  readonly height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  height: '520px',
});

const emit = defineEmits<{
  (e: 'select-bakery', bakery: Bakery): void;
}>();

// جلوگیری از پرش صفحه به بالا هنگام کلیک روی نقشه یا کنترل‌ها
// @ts-expect-error override Leaflet internal refocus
if (L.Control && L.Control.prototype && !L.Control.prototype._refocusPatched) {
  // @ts-expect-error internal method override
  L.Control.prototype._refocusOnMap = function () {};
  // @ts-expect-error marker flag
  L.Control.prototype._refocusPatched = true;
}

// جست‌وجو و فیلترهای تخصصی پایش سهمیه آرد
const searchQuery = ref<string>('');
const statusFilter = ref<string>('all');
const typeFilter = ref<string>('all');
const neighborhoodFilter = ref<string>('all');
const showNeighborhoodPolygons = ref<boolean>(true);

// نقشه و لایه‌ها
const mapContainer = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
let tileLayer: L.TileLayer | null = null;
let polygonsLayerGroup: L.LayerGroup | null = null;
let markersLayerGroup: L.LayerGroup | null = null;

// لایه استاندارد OpenStreetMap
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

// انواع موجود نان
const breadTypes = computed(() => [...new Set(props.bakeries.map((b) => b.type))]);

// نانوایی‌های فیلترشده بر اساس وضعیت سهمیه، نوع نان، محله و جست‌وجو
const filteredBakeries = computed<Bakery[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return props.bakeries.filter((b) => {
    const matchesSearch =
      !q ||
      b.name.toLowerCase().includes(q) ||
      b.type.toLowerCase().includes(q) ||
      (b.neighborhood && b.neighborhood.toLowerCase().includes(q)) ||
      (b.operator && b.operator.toLowerCase().includes(q)) ||
      (b.address && b.address.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter.value === 'all' || b.status === statusFilter.value;
    const matchesType =
      typeFilter.value === 'all' || b.type === typeFilter.value;
    const matchesNeighborhood =
      neighborhoodFilter.value === 'all' ||
      (b.neighborhood && b.neighborhood.includes(neighborhoodFilter.value)) ||
      b.name.includes(neighborhoodFilter.value);

    return matchesSearch && matchesStatus && matchesType && matchesNeighborhood;
  });
});

// آمار لحظه‌ای پایش سهمیه‌ها روی نقشه
const quotaStats = computed(() => {
  const total = filteredBakeries.value.length;
  const normal = filteredBakeries.value.filter((b) => b.status === 'عادی').length;
  const shortage = filteredBakeries.value.filter((b) => b.status === 'کسری سهمیه').length;
  const deviation = filteredBakeries.value.filter((b) => b.status === 'انحراف مشکوک').length;
  return { total, normal, shortage, deviation };
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

  container.addEventListener('click', (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement | null)?.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (!href || href === '#' || href === 'javascript:void(0)') {
        e.preventDefault();
      }
    }
  });

  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  initTileLayer();
  map.fitBounds(AHVAZ_BOUNDS, { padding: [15, 15] });

  polygonsLayerGroup = L.layerGroup().addTo(map);
  markersLayerGroup = L.layerGroup().addTo(map);

  renderNeighborhoodPolygons();
  renderBakeryMarkers();
}



/**
 * ترسیم محلات اهواز با برچسب‌های مات و اطلاعات سهمیه نانوایی‌های هر محله
 */
function renderNeighborhoodPolygons(): void {
  const group = polygonsLayerGroup;
  if (!group) return;
  group.clearLayers();

  if (!showNeighborhoodPolygons.value) return;

  // محاسبه بیشترین تعداد نانوایی جهت مقیاس حرارتی
  let maxCount = 0;
  ahvazNeighborhoods.forEach((n) => {
    const c = props.bakeries.filter(
      (b) =>
        (b.neighborhood && b.neighborhood.includes(n.name)) ||
        b.name.includes(n.name)
    ).length;
    if (c > maxCount) maxCount = c;
  });

  ahvazNeighborhoods.forEach((n: AhvazNeighborhood) => {
    // تعداد نانوایی‌های این محله
    const neighborhoodBakeries = props.bakeries.filter(
      (b) =>
        (b.neighborhood && b.neighborhood.includes(n.name)) ||
        b.name.includes(n.name)
    );
    const count = neighborhoodBakeries.length;
    const abnormal = neighborhoodBakeries.filter(
      (b) => b.status === 'انحراف مشکوک' || b.status === 'کسری سهمیه'
    ).length;

    const heat = getNeighborhoodHeatStyle(count, maxCount);

    const polygon = L.polygon(n.polygon, {
      color: heat.borderColor,
      fillColor: heat.color,
      fillOpacity: heat.fillOpacity,
      weight: 2,
      dashArray: count === 0 ? '4, 4' : undefined,
    });

    const tooltipContent = `
      <div class="compact-neighborhood-card" dir="rtl">
        <div class="cn-head">
          <span class="cn-color-bullet" style="background-color: ${heat.color};"></span>
          <strong class="cn-title">${n.name}</strong>
          <span class="cn-region">${fa(n.region)}</span>
        </div>
        <div class="cn-stats">
          <span class="cn-pill active">${fa(count)} خبازی</span>
          ${abnormal > 0 ? `<span class="cn-pill warn">${fa(abnormal)} هشدار</span>` : `<span class="cn-pill done">عادی</span>`}
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
      polygon.setStyle({ fillOpacity: Math.min(0.65, heat.fillOpacity + 0.22), weight: 3.5 });
    });
    polygon.on('mouseout', () => {
      polygon.setStyle({ fillOpacity: heat.fillOpacity, weight: 2 });
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
  });
}

/**
 * ایجاد آیکون HTML سفارشی برای هر نقطه پایش سهمیه نانوایی
 */
function createBakeryDivIcon(status: string): L.DivIcon {
  const toneClass =
    status === 'عادی'
      ? 'tone-normal'
      : status === 'کسری سهمیه'
        ? 'tone-shortage'
        : 'tone-deviation';

  const html = `
    <div class="bakery-spot-pin ${toneClass}">
      <span class="spot-pulse ${toneClass}"></span>
      <span class="spot-core ${toneClass}">
        <span class="spot-icon">🌾</span>
      </span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-bakery-pin-wrapper',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

/**
 * رسم نقاط نانوایی‌ها (پایش سهمیه‌ای آرد) روی نقشه اهواز با کارت استاندارد و فشرده
 */
function renderBakeryMarkers(): void {
  const group = markersLayerGroup;
  if (!group) return;
  group.clearLayers();

  filteredBakeries.value.forEach((b: Bakery) => {
    const latLng = getBakeryLatLng(b);
    const icon = createBakeryDivIcon(b.status);
    const marker = L.marker(latLng, { icon });

    const statusClass =
      b.status === 'عادی'
        ? 'normal'
        : b.status === 'کسری سهمیه'
          ? 'shortage'
          : 'deviation';

    const ratio = Math.round((b.used / b.quota) * 100);

    const tooltipContent = `
      <div class="compact-bakery-card" dir="rtl">
        <div class="cb-head">
          <div class="cb-title-wrap">
            <span class="cb-status-bullet ${statusClass}"></span>
            <strong class="cb-name">${b.name}</strong>
          </div>
          <span class="cb-type-badge">${b.type}</span>
        </div>

        <div class="cb-meta">
          <span class="cb-place">${b.neighborhood || 'اهواز'}</span>
          ${b.operator ? `<span class="cb-sep">·</span><span class="cb-operator">${b.operator}</span>` : ''}
        </div>

        <div class="cb-quota-bar">
          <div class="cb-bar-track">
            <div class="cb-bar-fill ${statusClass}" style="width: ${Math.min(100, ratio)}%;"></div>
          </div>
          <div class="cb-bar-labels">
            <span>مصرف: <strong>${fa(b.used)}</strong> از ${fa(b.quota)} کیسه</span>
            <span class="cb-pct">${fa(ratio)}٪</span>
          </div>
        </div>

        <div class="cb-foot">
          <span class="cb-status-pill ${statusClass}">${b.status}</span>
          <span class="cb-received">دریافتی: ${fa(b.received)}</span>
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
      emit('select-bakery', b);
    });

    marker.addTo(group);
  });
}

function resetMapView(): void {
  neighborhoodFilter.value = 'all';
  statusFilter.value = 'all';
  typeFilter.value = 'all';
  searchQuery.value = '';
  if (map) {
    map.fitBounds(AHVAZ_BOUNDS, { padding: [15, 15] });
  }
}

function togglePolygons(): void {
  showNeighborhoodPolygons.value = !showNeighborhoodPolygons.value;
  renderNeighborhoodPolygons();
}

function onNeighborhoodSelect(): void {
  if (neighborhoodFilter.value === 'all') {
    if (map) map.fitBounds(AHVAZ_BOUNDS, { padding: [15, 15] });
    return;
  }
  const n = ahvazNeighborhoods.find((item) => item.name === neighborhoodFilter.value);
  if (n && map) {
    map.flyTo(n.center, 14, { duration: 0.8 });
  }
}

watch([filteredBakeries, showNeighborhoodPolygons], () => {
  renderBakeryMarkers();
  renderNeighborhoodPolygons();
});

watch(
  () => props.bakeries,
  () => {
    renderBakeryMarkers();
    renderNeighborhoodPolygons();
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
  }
});
</script>

<template>
  <div
    class="ahvaz-bakery-wrapper"
    :style="{ height: props.height, minHeight: '380px' }"
    data-testid="ahvaz-bakery-map"
  >
    <!-- نوار فیلتر و ابزارهای جست‌وجو در بالای نقشه -->
    <div class="map-toolbar-panel">
      <!-- جست‌وجوی سریع نانوایی / محله -->
      <div class="filter-group search-group">
        <label class="toolbar-label">
          <Search class="icon-xxs" />
          <span>جست‌وجو:</span>
        </label>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="نام نانوایی، متصدی، محله..."
          class="toolbar-input"
          data-testid="bakery-map-search-input"
        />
      </div>

      <!-- فیلتر وضعیت پایش سهمیه -->
      <div class="filter-group">
        <label class="toolbar-label">
          <Filter class="icon-xxs" />
          <span>سهمیه:</span>
        </label>
        <select
          v-model="statusFilter"
          class="toolbar-select"
          data-testid="bakery-map-status-filter"
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="عادی">مصرف عادی</option>
          <option value="کسری سهمیه">کسری سهمیه</option>
          <option value="انحراف مشکوک">انحراف مشکوک</option>
        </select>
      </div>

      <!-- فیلتر نوع نان -->
      <div class="filter-group">
        <label class="toolbar-label">
          <Wheat class="icon-xxs" />
          <span>نوع:</span>
        </label>
        <select
          v-model="typeFilter"
          class="toolbar-select"
          data-testid="bakery-map-type-filter"
        >
          <option value="all">همه نان‌ها</option>
          <option v-for="t in breadTypes" :key="t" :value="t">{{ t }}</option>
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
          data-testid="bakery-map-neighborhood-filter"
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
          <span class="provider-badge" data-testid="bakery-map-provider-badge">OpenStreetMap</span>
        </span>
      </div>



      <!-- دکمه لایه محلات -->
      <button
        type="button"
        :class="['toolbar-toggle-btn', { active: showNeighborhoodPolygons }]"
        @click="togglePolygons"
        data-testid="toggle-neighborhoods-btn"
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
        data-testid="reset-bakery-map-btn"
        title="بازنشانی نقشه و مرکزیت اهواز"
      >
        <RotateCcw class="icon-xxs" />
        <span>اهواز</span>
      </button>

      <!-- نشانگرهای وضعیت پایش سهمیه -->
      <div class="map-stats-badge" dir="rtl">
        <span class="stat-bubble normal" title="مصرف عادی">
          {{ fa(quotaStats.normal) }} عادی
        </span>
        <span class="stat-bubble shortage" title="کسری سهمیه">
          {{ fa(quotaStats.shortage) }} کسری
        </span>
        <span class="stat-bubble deviation" title="انحراف مشکوک">
          {{ fa(quotaStats.deviation) }} انحراف
        </span>
      </div>
    </div>

    <!-- کانتینر نقشه Leaflet -->
    <div ref="mapContainer" class="leaflet-map-canvas" />

    <!-- راهنمای رنگ‌های وضعیت در پایین نقشه -->
    <div class="map-footer-bar">
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-spot tone-normal" />
          <span>مصرف عادی سهمیه</span>
        </div>
        <div class="legend-item">
          <span class="legend-spot tone-shortage" />
          <span>کسری سهمیه آرد</span>
        </div>
        <div class="legend-item">
          <span class="legend-spot tone-deviation" />
          <span>انحراف مشکوک سهمیه</span>
        </div>
        <div class="legend-item">
          <span class="legend-zone" />
          <span>مرزبندی محلات اهواز</span>
        </div>

      </div>

      <div class="osm-attribution">
        نقشه پایش آرد اهواز · OpenStreetMap GIS
      </div>
    </div>
  </div>
</template>

<style lang="scss">
/* استایل‌های سراسری پین‌های نانوایی و کارت‌های فشرده */
.custom-bakery-pin-wrapper {
  background: transparent;
  border: none;
}

.bakery-spot-pin {
  position: relative;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  .spot-core {
    width: 18px;
    height: 18px;
    border-radius: 9999px;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;

    .spot-icon {
      font-size: 0.625rem;
      line-height: 1;
    }

    &.tone-normal {
      background-color: #10b981;
    }
    &.tone-shortage {
      background-color: #f59e0b;
    }
    &.tone-deviation {
      background-color: #ef4444;
    }
  }

  .spot-pulse {
    position: absolute;
    width: 26px;
    height: 26px;
    border-radius: 9999px;
    opacity: 0.6;
    animation: bakery-pulse-anim 2s cubic-bezier(0, 0, 0.2, 1) infinite;
    z-index: 1;

    &.tone-normal {
      background-color: rgba(16, 185, 129, 0.35);
    }
    &.tone-shortage {
      background-color: rgba(245, 158, 11, 0.45);
    }
    &.tone-deviation {
      background-color: rgba(239, 68, 68, 0.55);
    }
  }
}

@keyframes bakery-pulse-anim {
  0% {
    transform: scale(0.6);
    opacity: 0.9;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

/* کارت فشرده و استاندارد پایش نانوایی (بدون سرریز از نقشه) */
.compact-bakery-card {
  background-color: var(--card);
  color: var(--foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.45rem 0.6rem;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  font-family: inherit;
  width: 205px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.6875rem;
  line-height: 1.35;
  pointer-events: none;
}

.cb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.25rem;
}

.cb-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
}

.cb-status-bullet {
  width: 7px;
  height: 7px;
  border-radius: 9999px;
  flex-shrink: 0;

  &.normal {
    background-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
  }
  &.shortage {
    background-color: #f59e0b;
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25);
  }
  &.deviation {
    background-color: #ef4444;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.25);
  }
}

.cb-name {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cb-type-badge {
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--primary);
  background-color: oklch(from var(--primary) l c h / 10%);
  padding: 0.05rem 0.3rem;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.cb-meta {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--muted-foreground);
  font-size: 0.625rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cb-place {
  font-weight: 600;
  color: var(--foreground);
}

.cb-sep {
  opacity: 0.5;
}

.cb-operator {
  overflow: hidden;
  text-overflow: ellipsis;
}

.cb-quota-bar {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-top: 0.1rem;
}

.cb-bar-track {
  width: 100%;
  height: 5px;
  background-color: var(--muted);
  border-radius: 9999px;
  overflow: hidden;
}

.cb-bar-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.3s ease;

  &.normal {
    background-color: #10b981;
  }
  &.shortage {
    background-color: #f59e0b;
  }
  &.deviation {
    background-color: #ef4444;
  }
}

.cb-bar-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.5625rem;
  color: var(--muted-foreground);

  strong {
    color: var(--foreground);
  }

  .cb-pct {
    font-weight: 700;
    color: var(--primary);
    font-family: monospace;
  }
}

.cb-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
  margin-top: 0.1rem;
}

.cb-status-pill {
  font-size: 0.5625rem;
  font-weight: 700;
  padding: 0.05rem 0.35rem;
  border-radius: 9999px;

  &.normal {
    background-color: rgba(16, 185, 129, 0.15);
    color: #059669;
  }
  &.shortage {
    background-color: rgba(245, 158, 11, 0.18);
    color: #d97706;
  }
  &.deviation {
    background-color: rgba(239, 68, 68, 0.15);
    color: #dc2626;
  }
}

.cb-received {
  font-size: 0.5625rem;
  color: var(--muted-foreground);
}
</style>

<style scoped lang="scss">
.ahvaz-bakery-wrapper {
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

.toolbar-input {
  height: 1.875rem;
  width: 135px;
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

  &.shortage {
    background-color: rgba(245, 158, 11, 0.18);
    color: #d97706;
    border: 1px solid rgba(245, 158, 11, 0.35);
  }

  &.deviation {
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
  &.tone-shortage {
    background-color: #f59e0b;
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3);
  }
  &.tone-deviation {
    background-color: #ef4444;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3);
  }
}

.legend-zone {
  width: 12px;
  height: 8px;
  border-radius: 2px;
  background-color: rgba(6, 182, 212, 0.25);
  border: 1px dashed #06b6d4;
}

.legend-karun-stream {
  width: 18px;
  height: 7px;
  border-radius: 2px;
  background-color: #0284c7;
  border-top: 2px solid #38bdf8;
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.5);
}

.osm-attribution {
  font-size: 0.625rem;
  color: var(--muted-foreground);
}

.provider-badge {
  font-size: 0.625rem;
  font-weight: 700;
  padding-block: 0.15rem;
  padding-inline: 0.4rem;
  border-radius: var(--radius-sm);
  background-color: oklch(from var(--primary) l c h / 10%);
  color: var(--primary);
  border: 1px solid oklch(from var(--primary) l c h / 20%);
}

.icon-xxs {
  width: 0.75rem;
  height: 0.75rem;
}
</style>

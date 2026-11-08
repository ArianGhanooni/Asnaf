<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Mission } from 'src/types/asnaf';
import { fa } from 'src/utils/fa';
import {
  ahvazNeighborhoods,
  AHVAZ_CENTER,
  AHVAZ_DEFAULT_ZOOM,
  AHVAZ_BOUNDS,
  getMissionLatLng,
  getNeighborhoodHeatStyle,
  HEAT_PALETTE,
  type AhvazNeighborhood,
  type HeatStyle,
} from 'src/utils/ahvazGis';
import {
  Filter,
  Layers,
  RotateCcw,
  MapPin,
  Search,
  BookOpen,
  X,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Flame,
} from 'lucide-vue-next';

interface Props {
  readonly missions: Mission[];
  readonly height?: string;
  readonly selectedMissionId?: number | null;
  readonly inspectorMode?: boolean;
  readonly inspectorName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  height: '560px',
  selectedMissionId: null,
  inspectorMode: false,
  inspectorName: '',
});

const emit = defineEmits<{
  (e: 'select-mission', mission: Mission): void;
}>();

// جلوگیری از پرش و اسکرول صفحه به بالا هنگام کلیک روی نقشه یا کنترل‌های Leaflet
// @ts-expect-error override Leaflet internal refocus to prevent page scrolling jump
if (L.Control && L.Control.prototype && !L.Control.prototype._refocusPatched) {
  // @ts-expect-error internal method override
  L.Control.prototype._refocusOnMap = function () {};
  // @ts-expect-error marker flag
  L.Control.prototype._refocusPatched = true;
}

// وضعیت فیلترها و راهنمای نقشه
const searchQuery = ref<string>('');
const statusFilter = ref<'all' | 'active' | 'pending_approval' | 'done'>('all');
const neighborhoodFilter = ref<string>('all');
const showNeighborhoodPolygons = ref<boolean>(true);
const showSideLegend = ref<boolean>(true);

// نقشه و لایه‌ها
const mapContainer = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
let tileLayer: L.TileLayer | null = null;
let polygonsLayerGroup: L.LayerGroup | null = null;
let markersLayerGroup: L.LayerGroup | null = null;
const missionMarkersMap = new Map<number, L.Marker>();

// لایه استاندارد OpenStreetMap اهواز
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

// مأموریت‌های فیلترشده روی نقشه
const filteredMapMissions = computed<Mission[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return props.missions.filter((m) => {
    const matchesSearch =
      !q ||
      m.inspector.toLowerCase().includes(q) ||
      m.place.toLowerCase().includes(q) ||
      (m.targetUnit && m.targetUnit.toLowerCase().includes(q)) ||
      (m.type && m.type.toLowerCase().includes(q)) ||
      String(m.id).includes(q);

    const matchesStatus =
      statusFilter.value === 'all' || m.status === statusFilter.value;
    const matchesNeighborhood =
      neighborhoodFilter.value === 'all' || m.place.includes(neighborhoodFilter.value);

    return matchesSearch && matchesStatus && matchesNeighborhood;
  });
});

// آمار لحظه‌ای مأموریت‌های نقشه
const stats = computed(() => {
  const total = filteredMapMissions.value.length;
  const active = filteredMapMissions.value.filter((m) => m.status === 'active').length;
  const pending = filteredMapMissions.value.filter((m) => m.status === 'pending_approval').length;
  const done = filteredMapMissions.value.filter((m) => m.status === 'done').length;
  return { total, active, pending, done };
});

// آمار تعداد مأموریت به تفکیک محله
const neighborhoodStats = computed<Record<string, { total: number; active: number; done: number }>>(() => {
  const acc: Record<string, { total: number; active: number; done: number }> = {};
  ahvazNeighborhoods.forEach((n) => {
    const list = props.missions.filter((m) => m.place.includes(n.name));
    acc[n.name] = {
      total: list.length,
      active: list.filter((m) => m.status === 'active').length,
      done: list.filter((m) => m.status === 'done').length,
    };
  });
  return acc;
});

// بیشترین تعداد مأموریت در بین محلات (مبنای طیف نقشه حرارتی)
const maxNeighborhoodMissions = computed<number>(() => {
  let max = 0;
  ahvazNeighborhoods.forEach((n) => {
    const cnt = neighborhoodStats.value[n.name]?.total || 0;
    if (cnt > max) max = cnt;
  });
  return max;
});

// دریافت استایل حرارتی برای هر محله
function getHeatForNeighborhood(name: string): HeatStyle {
  const total = neighborhoodStats.value[name]?.total || 0;
  return getNeighborhoodHeatStyle(total, maxNeighborhoodMissions.value);
}

// محلات مرتب‌شده بر اساس بار مأموریت (برای نمایش در راهنما)
const rankedNeighborhoods = computed(() => {
  return [...ahvazNeighborhoods].sort((a, b) => {
    const countA = neighborhoodStats.value[a.name]?.total || 0;
    const countB = neighborhoodStats.value[b.name]?.total || 0;
    return countB - countA;
  });
});

function initMap(): void {
  if (!mapContainer.value) return;

  // مقداردهی اولیه نقشه با keyboard: false جهت جلوگیری قطعی از پرش صفحه به بالا
  map = L.map(mapContainer.value, {
    center: AHVAZ_CENTER,
    zoom: AHVAZ_DEFAULT_ZOOM,
    zoomControl: false,
    minZoom: 10,
    maxZoom: 20,
    keyboard: false,
  });

  // جلوگیری از اسکرول مرورگر به بالا هنگام دریافت فوکوس کانتینر
  const container = map.getContainer();
  const origFocus = container.focus.bind(container);
  container.focus = (opts?: FocusOptions) => {
    origFocus({ ...opts, preventScroll: true });
  };
  container.removeAttribute('tabindex');

  // جلوگیری از رفتار لینک‌های تهی (#) درون نقشه که باعث پرش صفحه می‌شوند
  container.addEventListener('click', (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement | null)?.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (!href || href === '#' || href === 'javascript:void(0)') {
        e.preventDefault();
      }
    }
  });

  // کنترل زوم در گوشه پایین سمت چپ
  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  initTileLayer();
  map.fitBounds(AHVAZ_BOUNDS, { padding: [15, 15] });

  polygonsLayerGroup = L.layerGroup().addTo(map);
  markersLayerGroup = L.layerGroup().addTo(map);

  renderNeighborhoodPolygons();
  renderMissionMarkers();
}

/**
 * رسم مرزبندی دقیق محلات اهواز بر اساس حریم‌های اداری OpenStreetMap
 * و اعمال رنگ حرارتی پویا بر اساس تعداد مأموریت‌های هر محله
 */
function renderNeighborhoodPolygons(): void {
  const group = polygonsLayerGroup;
  if (!group) return;
  group.clearLayers();

  if (!showNeighborhoodPolygons.value) return;

  ahvazNeighborhoods.forEach((n: AhvazNeighborhood) => {
    const statsForN = neighborhoodStats.value[n.name] || { total: 0, active: 0, done: 0 };
    const heat = getNeighborhoodHeatStyle(statsForN.total, maxNeighborhoodMissions.value);

    // ترسیم پلی‌گان واقعی برگرفته از حریم‌های اداری OpenStreetMap
    const polygon = L.polygon(n.polygon, {
      color: heat.borderColor,
      fillColor: heat.color,
      fillOpacity: heat.fillOpacity,
      weight: 2,
      dashArray: statsForN.total === 0 ? '4, 4' : undefined,
    });

    const tooltipContent = `
      <div class="compact-neighborhood-card" dir="rtl">
        <div class="cn-head">
          <span class="cn-color-bullet" style="background-color: ${heat.color};"></span>
          <strong class="cn-title">${n.name}</strong>
          <span class="cn-region">${fa(n.region)}</span>
        </div>
        <div class="cn-heat-status" style="background-color: ${heat.color}18; color: ${heat.borderColor}; border: 1px solid ${heat.color}35;">
          <span class="heat-dot" style="background-color: ${heat.color};"></span>
          <strong>${heat.label}</strong>
        </div>
        <p class="cn-desc">${n.description}</p>
        <div class="cn-stats">
          <span class="cn-pill total">${props.inspectorMode ? 'مأموریت‌های بازرسی شما: ' : 'کل: '}${fa(statsForN.total)} مأموریت</span>
          <span class="cn-pill active">فعال: ${fa(statsForN.active)}</span>
          <span class="cn-pill done">تکمیل: ${fa(statsForN.done)}</span>
        </div>
      </div>
    `;

    const isNorth = n.center[0] > 31.3320;
    polygon.bindTooltip(tooltipContent, {
      sticky: true,
      direction: isNorth ? 'bottom' : 'top',
      offset: isNorth ? [0, 8] : [0, -8],
      className: 'osm-custom-tooltip',
    });

    polygon.on('mouseover', () => {
      polygon.setStyle({
        fillOpacity: Math.min(0.65, heat.fillOpacity + 0.22),
        weight: 3.5,
      });
    });

    polygon.on('mouseout', () => {
      polygon.setStyle({
        fillOpacity: heat.fillOpacity,
        weight: 2,
      });
    });

    // کلیک روی محدوده محله با جلوگیری از انتشار رویداد برای عدم پرش صفحه
    polygon.on('click', (e: L.LeafletMouseEvent) => {
      if (e.originalEvent) {
        L.DomEvent.stopPropagation(e.originalEvent);
        L.DomEvent.preventDefault(e.originalEvent);
      }
      selectNeighborhood(n.name, n.center);
    });

    polygon.addTo(group);
  });
}

/**
 * ایجاد نشانگر مأموریت متناسب با وضعیت
 */
function createMissionDivIcon(status: Mission['status'], isSelected = false): L.DivIcon {
  const isDone = status === 'done';
  const isPending = status === 'pending_approval';
  const colorClass = isDone ? 'tone-done' : isPending ? 'tone-pending' : 'tone-active';
  const selectedClass = isSelected ? 'is-selected-spot' : '';

  const html = `
    <div class="mission-spot-pin ${colorClass} ${selectedClass}">
      ${isSelected ? '<span class="spot-selected-glow"></span>' : ''}
      <span class="spot-pulse ${status}"></span>
      <span class="spot-core ${status}"></span>
    </div>
  `;

  return L.divIcon({
    html,
    className: `custom-mission-pin-wrapper ${selectedClass}`,
    iconSize: isSelected ? [36, 36] : [24, 24],
    iconAnchor: isSelected ? [18, 18] : [12, 12],
    popupAnchor: [0, -12],
  });
}

/**
 * رسم نقاط مأموریت‌ها روی نقشه اهواز
 */
function renderMissionMarkers(): void {
  const group = markersLayerGroup;
  if (!group) return;
  group.clearLayers();
  missionMarkersMap.clear();

  filteredMapMissions.value.forEach((m: Mission) => {
    const latLng = getMissionLatLng(m);
    const isSelected = props.selectedMissionId === m.id;
    const icon = createMissionDivIcon(m.status, isSelected);

    const marker = L.marker(latLng, {
      icon,
      zIndexOffset: isSelected ? 1500 : 0,
    });

    const priorityLabel =
      m.priority === 'urgent'
        ? 'فوری و آنی'
        : m.priority === 'high'
          ? 'دارای اولویت'
          : 'عادی';

    const statusLabel =
      m.status === 'done'
        ? 'تکمیل‌شده'
        : m.status === 'pending_approval'
          ? 'در انتظار تأیید اتحادیه'
          : 'در حال انجام';

    const tooltipContent = `
      <div class="compact-mission-card" dir="rtl">
        <div class="cm-head">
          <div class="cm-inspector-wrap">
            <span class="cm-status-dot ${m.status}"></span>
            <strong class="cm-inspector">${m.inspector}</strong>
          </div>
          <span class="cm-code">کد ${fa(m.id)}</span>
        </div>
        <div class="cm-meta">
          <span class="cm-place">${m.place}</span>
          <span class="cm-sep">·</span>
          <span class="cm-type">${m.type || 'بازرسی نوبتی'}</span>
        </div>
        ${m.targetUnit ? `<div class="cm-target">صنف: <strong>${m.targetUnit}</strong></div>` : ''}
        ${m.simbaCode ? `<div class="cm-simba">کد سیمبا: <strong>${m.simbaCode}</strong></div>` : ''}
        <div class="cm-foot">
          <span class="cm-priority ${m.priority || 'normal'}">${priorityLabel}</span>
          <span class="cm-status ${m.status}">${statusLabel}</span>
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

    // کلیک روی مارکر با توقف انتشار رویداد برای جلوگیری قطعی از پرش صفحه
    marker.on('click', (e: L.LeafletMouseEvent) => {
      if (e.originalEvent) {
        L.DomEvent.stopPropagation(e.originalEvent);
        L.DomEvent.preventDefault(e.originalEvent);
      }
      emit('select-mission', m);
    });

    marker.addTo(group);
    missionMarkersMap.set(m.id, marker);
  });
}

function selectNeighborhood(name: string, center?: [number, number]): void {
  neighborhoodFilter.value = name;
  const targetCenter = center || ahvazNeighborhoods.find((item) => item.name === name)?.center;
  if (targetCenter && map) {
    map.flyTo(targetCenter, 14, { duration: 0.8 });
  }
}

function resetMapView(): void {
  neighborhoodFilter.value = 'all';
  statusFilter.value = 'all';
  searchQuery.value = '';
  if (map) {
    map.fitBounds(AHVAZ_BOUNDS, { padding: [15, 15] });
  }
}

function togglePolygons(): void {
  showNeighborhoodPolygons.value = !showNeighborhoodPolygons.value;
  renderNeighborhoodPolygons();
}

function toggleSideLegend(): void {
  showSideLegend.value = !showSideLegend.value;
  void nextTick(() => {
    if (map) {
      map.invalidateSize();
    }
  });
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

// واکنش به تغییر فیلترها
watch([filteredMapMissions, showNeighborhoodPolygons], () => {
  renderMissionMarkers();
  renderNeighborhoodPolygons();
});

watch(
  () => props.missions,
  () => {
    renderMissionMarkers();
    renderNeighborhoodPolygons();
  },
  { deep: true }
);

watch(
  () => props.selectedMissionId,
  (newId) => {
    renderMissionMarkers();
    if (!newId || !map) return;
    const targetMission = props.missions.find((m) => m.id === newId);
    if (targetMission) {
      const latLng = getMissionLatLng(targetMission);
      map.flyTo(latLng, 15, { duration: 0.8 });
      setTimeout(() => {
        const marker = missionMarkersMap.get(newId);
        if (marker) {
          marker.openTooltip();
        }
      }, 350);
    }
  }
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
    class="ahvaz-osm-wrapper"
    :style="{ height: props.height, minHeight: '440px' }"
    data-testid="ahvaz-osm-map"
  >
    <!-- بنر راهنمای نقشه حرارتی بازرس میدانی -->
    <div v-if="props.inspectorMode" class="inspector-heat-banner" dir="rtl">
      <div class="ihb-title-group">
        <Flame class="icon-sm text-warning" />
        <strong>نقشه حرارتی تراکم بازرسی‌های سازمانی: {{ props.inspectorName || 'بازرس میدانی' }}</strong>
      </div>
      <span class="ihb-desc">رنگ‌بندی حرارتی محلات بر پایه تراکم مأموریت‌های شما تنظیم شده است (کل: {{ fa(stats.total) }} واحد بازرسی)</span>
    </div>

    <!-- نوار فیلتر و ابزارهای جست‌وجو در بالای نقشه -->
    <div class="map-toolbar-panel">
      <!-- جست‌وجوی سریع روی نقشه -->
      <div class="filter-group search-group">
        <label class="toolbar-label">
          <Search class="icon-xxs" />
          <span>جست‌وجو:</span>
        </label>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="بازرس، محله، واحد صنفی..."
          class="toolbar-input"
          data-testid="map-search-input"
        />
      </div>

      <!-- انتخاب وضعیت مأموریت -->
      <div class="filter-group">
        <label class="toolbar-label">
          <Filter class="icon-xxs" />
          <span>وضعیت:</span>
        </label>
        <select
          v-model="statusFilter"
          class="toolbar-select"
          data-testid="map-status-filter"
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="active">در حال انجام (هشدار)</option>
          <option value="pending_approval">در انتظار تأیید اتحادیه</option>
          <option value="done">تکمیل‌شده (موفق)</option>
        </select>
      </div>

      <!-- انتخاب محله -->
      <div class="filter-group">
        <label class="toolbar-label">
          <MapPin class="icon-xxs" />
          <span>محله:</span>
        </label>
        <select
          v-model="neighborhoodFilter"
          class="toolbar-select"
          @change="onNeighborhoodSelect"
          data-testid="map-neighborhood-filter"
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

      <!-- دکمه نمایش / مخفی‌سازی حریم محلات -->
      <button
        type="button"
        :class="['toolbar-toggle-btn', { active: showNeighborhoodPolygons }]"
        @click="togglePolygons"
        data-testid="toggle-neighborhoods-btn"
        title="نمایش / مخفی‌سازی حریم واقعی محلات OpenStreetMap"
      >
        <Layers class="icon-xxs" />
        <span>حریم محله‌ها (OSM)</span>
      </button>

      <!-- دکمه باز و بسته کردن پنل راهنمای رنگ‌ها -->
      <button
        type="button"
        :class="['toolbar-toggle-btn', { active: showSideLegend }]"
        @click="toggleSideLegend"
        data-testid="toggle-side-legend-btn"
        title="نمایش / بستن راهنمای طیف رنگ‌های حرارتی در کنار نقشه"
      >
        <BookOpen class="icon-xxs" />
        <span>راهنمای رنگ‌ها</span>
      </button>

      <!-- دکمه بازنشانی نما -->
      <button
        type="button"
        class="toolbar-btn"
        @click="resetMapView"
        data-testid="reset-map-view-btn"
        title="بازنشانی نقشه و مرکزیت اهواز"
      >
        <RotateCcw class="icon-xxs" />
        <span>اهواز</span>
      </button>

      <!-- شمارنده زنده مأموریت‌ها -->
      <div class="map-stats-badge" dir="rtl">
        <span class="stat-bubble active" title="در حال انجام میدانی">
          {{ fa(stats.active) }} فعال
        </span>
        <span class="stat-bubble pending" title="در انتظار تأیید اتحادیه">
          {{ fa(stats.pending) }} انتظار
        </span>
        <span class="stat-bubble done" title="تکمیل و بایگانی‌شده">
          {{ fa(stats.done) }} تکمیل
        </span>
      </div>
    </div>

    <!-- بدنه اصلی نقشه: بستر نقشه به همراه پنل راهنمای اختصاصی در کنار آن -->
    <div class="map-body-layout">
      <!-- کانتینر نقشه Leaflet / OpenStreetMap -->
      <div ref="mapContainer" class="leaflet-map-canvas" />

      <!-- پنل راهنمای جامع کنار نقشه (راهنمای معنی رنگ‌های حرارتی و علائم) -->
      <aside
        v-if="showSideLegend"
        class="map-side-legend"
        data-testid="map-side-legend"
        dir="rtl"
      >
        <!-- سربرگ راهنما -->
        <div class="legend-header">
          <div class="legend-header-title">
            <Flame class="icon-xs text-primary" />
            <strong class="title-text">راهنمای طیف حرارتی و علائم</strong>
          </div>
          <button
            type="button"
            class="btn-close-legend"
            @click="toggleSideLegend"
            title="بستن راهنما"
          >
            <X class="icon-xxs" />
          </button>
        </div>

        <div class="legend-scroll-content">
          <!-- بخش ۱: راهنمای طیف رنگ‌های حرارتی محلات -->
          <div class="legend-section thermal-section">
            <h4 class="section-title">
              <span class="section-badge">۱</span>
              <span>طیف رنگ‌های حرارتی محله‌ها (تراکم مأموریت)</span>
            </h4>
            <div class="heat-spectrum-list">
              <div class="heat-row critical">
                <span class="heat-indicator critical" />
                <div class="heat-text">
                  <div class="heat-head">
                    <strong class="heat-title">قرمز:</strong>
                    <span>بیشترین مأموریت (بحرانی / پرکار)</span>
                  </div>
                  <p class="heat-desc">محله با بالاترین تمرکز و بار کاری مأموریت‌های بازرسی در اهواز.</p>
                </div>
              </div>

              <div class="heat-row busy">
                <span class="heat-indicator busy" />
                <div class="heat-text">
                  <div class="heat-head">
                    <strong class="heat-title">نارنجی:</strong>
                    <span>نسبتاً شلوغ (تراکم بالا)</span>
                  </div>
                  <p class="heat-desc">محله‌های دارای مأموریت‌های زیاد و فعالیت مستمر بازرسان.</p>
                </div>
              </div>

              <div class="heat-row normal">
                <span class="heat-indicator normal" />
                <div class="heat-text">
                  <div class="heat-head">
                    <strong class="heat-title">آبی:</strong>
                    <span>وضعیت عادی (متعادل)</span>
                  </div>
                  <p class="heat-desc">محله‌هایی که حجم بازرسی در آن‌ها متعادل و عادی است.</p>
                </div>
              </div>

              <div class="heat-row idle">
                <span class="heat-indicator idle" />
                <div class="heat-text">
                  <div class="heat-head">
                    <strong class="heat-title">سبز:</strong>
                    <span>بدون مأموریت (پاک و آرام)</span>
                  </div>
                  <p class="heat-desc">هیچ مأموریت فعالی در این محله وجود ندارد (تعداد مأموریت = ۰).</p>
                </div>
              </div>
            </div>
          </div>

          <!-- بخش ۲: راهنمای وضعیت مأموریت‌ها (نشانگرهای روی نقشه) -->
          <div class="legend-section">
            <h4 class="section-title">
              <span class="section-badge">۲</span>
              <span>وضعیت مأموریت‌های بازرسی (نقاط روی نقشه)</span>
            </h4>
            <div class="legend-list">
              <div
                class="legend-row clickable-filter"
                :class="{ active: statusFilter === 'active' }"
                @click="statusFilter = statusFilter === 'active' ? 'all' : 'active'"
                title="کلیک برای فیلتر مأموریت‌های فعال"
              >
                <div class="indicator-cell">
                  <span class="legend-circle active-circle" />
                </div>
                <div class="legend-text">
                  <div class="legend-label">
                    <strong class="color-name">کهربایی / نارنجی:</strong>
                    <span>در حال انجام میدانی</span>
                    <span class="count-tag active">{{ fa(stats.active) }}</span>
                  </div>
                  <p class="legend-desc">
                    مأموریت جاری در دست بازرس، دارای اخطار یا پیگیری فوری.
                  </p>
                </div>
              </div>

              <div
                class="legend-row clickable-filter"
                :class="{ active: statusFilter === 'pending_approval' }"
                @click="statusFilter = statusFilter === 'pending_approval' ? 'all' : 'pending_approval'"
                title="کلیک برای فیلتر مأموریت‌های در انتظار تأیید"
              >
                <div class="indicator-cell">
                  <span class="legend-circle pending-circle" />
                </div>
                <div class="legend-text">
                  <div class="legend-label">
                    <strong class="color-name">بنفش:</strong>
                    <span>در انتظار تأیید اتحادیه</span>
                    <span class="count-tag pending">{{ fa(stats.pending) }}</span>
                  </div>
                  <p class="legend-desc">
                    صورتجلسه ثبت شده و منتظر تایید رئیس اتحادیه صنف مربوطه است.
                  </p>
                </div>
              </div>

              <div
                class="legend-row clickable-filter"
                :class="{ active: statusFilter === 'done' }"
                @click="statusFilter = statusFilter === 'done' ? 'all' : 'done'"
                title="کلیک برای فیلتر مأموریت‌های تکمیل‌شده"
              >
                <div class="indicator-cell">
                  <span class="legend-circle done-circle" />
                </div>
                <div class="legend-text">
                  <div class="legend-label">
                    <strong class="color-name">سبز زمردی:</strong>
                    <span>تکمیل‌شده و بایگانی</span>
                    <span class="count-tag done">{{ fa(stats.done) }}</span>
                  </div>
                  <p class="legend-desc">
                    بازرسی نهایی شده، فرم A4 صادر شده و در بایگانی رسمی ثبت گردیده است.
                  </p>
                </div>
              </div>

              <div class="legend-row">
                <div class="indicator-cell">
                  <span class="legend-circle selected-circle" />
                </div>
                <div class="legend-text">
                  <div class="legend-label">
                    <strong class="color-name">آبی با هاله نور:</strong>
                    <span>مأموریت انتخابی فعال</span>
                  </div>
                  <p class="legend-desc">
                    مأموریتی که از فهرست جدول کلیک شده و روی نقشه هایلایت شده است.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- بخش ۳: فهرست محلات بر اساس بار حرارتی و حریم OpenStreetMap -->
          <div class="legend-section">
            <div class="section-title-wrap">
              <h4 class="section-title">
                <span class="section-badge">۳</span>
                <span>محله‌های اهواز (حریم‌های واقعی OSM)</span>
              </h4>
              <span class="sub-hint">کلیک = پرواز به محله</span>
            </div>

            <div class="neighborhoods-color-grid">
              <button
                v-for="n in rankedNeighborhoods"
                :key="n.id"
                type="button"
                :class="['neighborhood-color-card', { active: neighborhoodFilter === n.name }]"
                @click="selectNeighborhood(n.name, n.center)"
                :title="`متمرکز کردن نقشه روی ${n.name} (${n.region}) - وضعیت: ${getHeatForNeighborhood(n.name).label}`"
              >
                <div class="card-color-swatch" :style="{ backgroundColor: getHeatForNeighborhood(n.name).color }">
                  <span class="swatch-core" />
                </div>
                <div class="card-meta">
                  <span class="neighborhood-name">{{ n.name }}</span>
                  <span class="region-badge">{{ fa(n.region) }}</span>
                </div>
                <div class="card-count" :style="{ color: getHeatForNeighborhood(n.name).borderColor }">
                  {{ fa(neighborhoodStats[n.name]?.total || 0) }}
                </div>
              </button>
            </div>
          </div>

          <!-- بخش ۴: نقشه پایه OpenStreetMap -->
          <div class="legend-section base-layer-info">
            <div class="osm-info-card">
              <span class="osm-tag">حریم‌های رسمی OpenStreetMap</span>
              <p class="osm-desc">
                حریم‌های پلی‌گان هر محله بر اساس مرزهای رسمی اداری و هندسه واقعی OpenStreetMap اهواز ترسیم شده و رودخانه کارون به‌صورت بومی نمایش می‌یابد.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- نوار پایین نقشه: راهنمای سریع طیف حرارتی -->
    <div class="map-footer-bar">
      <div class="quick-status-indicators">
        <span class="footer-title">راهنمای حرارتی محله‌ها:</span>
        <div class="quick-item">
          <span class="heat-dot-sm critical" />
          <span>قرمز (بیشترین مأموریت)</span>
        </div>
        <div class="quick-item">
          <span class="heat-dot-sm busy" />
          <span>نارنجی (نسبتاً شلوغ)</span>
        </div>
        <div class="quick-item">
          <span class="heat-dot-sm normal" />
          <span>آبی (عادی)</span>
        </div>
        <div class="quick-item">
          <span class="heat-dot-sm idle" />
          <span>سبز (بدون مأموریت)</span>
        </div>
      </div>

      <div class="osm-attribution">
        سامانه GIS نظارت اصناف خوزستان · حریم‌های رسمی OpenStreetMap کلان‌شهر اهواز
      </div>
    </div>
  </div>
</template>

<style lang="scss">
/* استایل‌های سراسری المان‌های Leaflet و تولتیپ‌ها */
.leaflet-container {
  font-family: inherit;
  width: 100%;
  height: 100%;
  background-color: #f1f5f9;
  z-index: 1;
  outline: none !important;
}

.custom-mission-pin-wrapper {
  background: transparent;
  border: none;
}

.mission-spot-pin {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  .spot-core {
    width: 12px;
    height: 12px;
    border-radius: 9999px;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    z-index: 2;

    &.active {
      background-color: #f59e0b;
    }
    &.pending_approval {
      background-color: #a855f7;
    }
    &.done {
      background-color: #10b981;
    }
  }

  .spot-pulse {
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 9999px;
    opacity: 0.6;
    animation: spot-pulse-anim 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
    z-index: 1;

    &.active {
      background-color: rgba(245, 158, 11, 0.45);
    }
    &.pending_approval {
      background-color: rgba(168, 85, 247, 0.45);
    }
    &.done {
      display: none;
    }
  }

  &.is-selected-spot {
    z-index: 1000 !important;

    .spot-core {
      width: 16px;
      height: 16px;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 3px #0284c7, 0 4px 14px rgba(2, 132, 199, 0.7);
    }

    .spot-selected-glow {
      position: absolute;
      width: 36px;
      height: 36px;
      border-radius: 9999px;
      background: radial-gradient(circle, rgba(2, 132, 199, 0.5) 0%, rgba(2, 132, 199, 0) 72%);
      animation: spot-pulse-selected 1.2s ease-in-out infinite alternate;
      z-index: 1;
    }
  }
}

@keyframes spot-pulse-selected {
  0% {
    transform: scale(0.85);
    opacity: 0.5;
  }
  100% {
    transform: scale(1.4);
    opacity: 1;
  }
}

@keyframes spot-pulse-anim {
  0% {
    transform: scale(0.6);
    opacity: 0.9;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

.osm-custom-tooltip {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;

  &::before {
    display: none !important;
  }
}

/* کارت فشرده مأموریت در تولتیپ */
.compact-mission-card {
  background-color: var(--card, #ffffff);
  color: var(--foreground, #0f172a);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  padding: 0.45rem 0.55rem;
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

.cm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  border-bottom: 1px solid var(--border, #e2e8f0);
  padding-bottom: 0.25rem;
}

.cm-inspector-wrap {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
}

.cm-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 9999px;
  flex-shrink: 0;

  &.active {
    background-color: #f59e0b;
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25);
  }
  &.pending_approval {
    background-color: #a855f7;
    box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.25);
  }
  &.done {
    background-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
  }
}

.cm-inspector {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--foreground, #0f172a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cm-code {
  font-size: 0.625rem;
  font-family: monospace;
  font-weight: 700;
  color: var(--primary, #0284c7);
  background-color: oklch(from var(--primary, #0284c7) l c h / 10%);
  padding: 0.05rem 0.25rem;
  border-radius: var(--radius-sm, 4px);
}

.cm-meta {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--muted-foreground, #64748b);
  font-size: 0.625rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cm-place {
  font-weight: 600;
  color: var(--foreground, #0f172a);
}

.cm-target {
  font-size: 0.625rem;
  color: var(--muted-foreground, #64748b);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background-color: var(--muted, #f8fafc);
  padding: 0.1rem 0.3rem;
  border-radius: var(--radius-sm, 4px);

  strong {
    color: var(--foreground, #0f172a);
  }
}

.cm-simba {
  font-size: 0.625rem;
  color: #0284c7;
  background-color: rgba(2, 132, 199, 0.08);
  padding: 0.1rem 0.3rem;
  border-radius: var(--radius-sm, 4px);
}

.cm-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  border-top: 1px solid var(--border, #e2e8f0);
  padding-top: 0.25rem;
  margin-top: 0.1rem;
}

.cm-priority {
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.05rem 0.3rem;
  border-radius: var(--radius-sm, 4px);

  &.urgent {
    background-color: #fee2e2;
    color: #b91c1c;
  }
  &.high {
    background-color: #ffedd5;
    color: #c2410c;
  }
  &.normal {
    background-color: var(--muted, #f1f5f9);
    color: var(--muted-foreground, #64748b);
  }
}

.cm-status {
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.05rem 0.3rem;
  border-radius: var(--radius-sm, 4px);

  &.active {
    background-color: rgba(245, 158, 11, 0.15);
    color: #d97706;
  }
  &.pending_approval {
    background-color: rgba(168, 85, 247, 0.15);
    color: #9333ea;
  }
  &.done {
    background-color: rgba(16, 185, 129, 0.15);
    color: #059669;
  }
}

/* کارت فشرده اطلاعات محله در تولتیپ */
.compact-neighborhood-card {
  background-color: var(--card, #ffffff);
  color: var(--foreground, #0f172a);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  padding: 0.5rem 0.65rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
  font-family: inherit;
  width: 220px;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.6875rem;
  line-height: 1.35;
  pointer-events: none;
}

.cn-head {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.cn-color-bullet {
  width: 9px;
  height: 9px;
  border-radius: 9999px;
  flex-shrink: 0;
}

.cn-title {
  font-size: 0.8125rem;
  font-weight: 800;
}

.cn-region {
  font-size: 0.625rem;
  color: var(--muted-foreground, #64748b);
  margin-inline-start: auto;
  background-color: var(--muted, #f1f5f9);
  padding: 0.05rem 0.3rem;
  border-radius: var(--radius-sm, 4px);
}

.cn-heat-status {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.4rem;
  border-radius: var(--radius-sm, 4px);
  font-size: 0.625rem;

  .heat-dot {
    width: 6px;
    height: 6px;
    border-radius: 9999px;
  }
}

.cn-desc {
  font-size: 0.625rem;
  color: var(--muted-foreground, #64748b);
  margin: 0;
  line-height: 1.3;
}

.cn-stats {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.cn-pill {
  font-size: 0.5625rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm, 4px);

  &.total {
    background-color: var(--muted, #f1f5f9);
    color: var(--foreground, #0f172a);
  }
  &.active {
    background-color: rgba(245, 158, 11, 0.15);
    color: #d97706;
  }
  &.done {
    background-color: rgba(16, 185, 129, 0.15);
    color: #059669;
  }
}
</style>

<style scoped lang="scss">
.ahvaz-osm-wrapper {
  position: relative;
  width: 100%;
  background-color: var(--card, #ffffff);
  border-radius: var(--radius-lg, 12px);
  overflow: hidden;
  border: 1px solid var(--border, #e2e8f0);
  display: flex;
  flex-direction: column;

  .inspector-heat-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.65rem 1rem;
    background: linear-gradient(135deg, rgba(234, 88, 12, 0.08), rgba(245, 158, 11, 0.14));
    border-bottom: 1px solid rgba(245, 158, 11, 0.35);

    .ihb-title-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #c2410c;
      font-size: 0.875rem;
      font-weight: 700;
    }

    .ihb-desc {
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }
  }
}

/* نوار ابزار بالای نقشه */
.map-toolbar-panel {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  background-color: var(--card, #ffffff);
  border-bottom: 1px solid var(--border, #e2e8f0);
  padding-block: 0.5rem;
  padding-inline: 0.75rem;
  z-index: 10;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.search-group {
  min-width: 180px;
  flex: 1;
}

.toolbar-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground, #64748b);
  white-space: nowrap;
}

.toolbar-input {
  height: 1.875rem;
  width: 100%;
  border-radius: var(--radius-sm, 4px);
  border: 1px solid var(--border, #e2e8f0);
  background-color: var(--background, #f8fafc);
  color: var(--foreground, #0f172a);
  font-size: 0.6875rem;
  padding-inline: 0.5rem;
  transition: border-color 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--primary, #0284c7);
  }
}

.toolbar-select {
  height: 1.875rem;
  border-radius: var(--radius-sm, 4px);
  border: 1px solid var(--border, #e2e8f0);
  background-color: var(--background, #f8fafc);
  color: var(--foreground, #0f172a);
  font-size: 0.6875rem;
  padding-inline: 0.5rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--primary, #0284c7);
  }
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 1.875rem;
  border-radius: var(--radius-sm, 4px);
  border: 1px solid var(--border, #e2e8f0);
  background-color: var(--muted, #f1f5f9);
  color: var(--foreground, #0f172a);
  font-size: 0.6875rem;
  font-weight: 600;
  padding-inline: 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--card, #ffffff);
    border-color: var(--primary, #0284c7);
    color: var(--primary, #0284c7);
  }
}

.toolbar-toggle-btn {
  @extend .toolbar-btn;

  &.active {
    background-color: oklch(from var(--primary, #0284c7) l c h / 15%);
    border-color: var(--primary, #0284c7);
    color: var(--primary, #0284c7);
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

  &.active {
    background-color: rgba(245, 158, 11, 0.2);
    color: #d97706;
    border: 1px solid rgba(245, 158, 11, 0.35);
  }

  &.pending {
    background-color: rgba(168, 85, 247, 0.2);
    color: #9333ea;
    border: 1px solid rgba(168, 85, 247, 0.35);
  }

  &.done {
    background-color: rgba(16, 185, 129, 0.2);
    color: #059669;
    border: 1px solid rgba(16, 185, 129, 0.35);
  }
}

/* بستر اصلی نقشه و پنل راهنما کنار آن */
.map-body-layout {
  flex: 1;
  display: flex;
  position: relative;
  width: 100%;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 960px) {
    flex-direction: column;
  }
}

.leaflet-map-canvas {
  flex: 1;
  min-width: 0;
  height: 100%;
  min-height: 420px;
}

/* پنل راهنمای علائم و رنگ‌ها در کنار نقشه */
.map-side-legend {
  width: 330px;
  max-width: 100%;
  border-inline-start: 1px solid var(--border, #e2e8f0);
  background-color: var(--card, #ffffff);
  display: flex;
  flex-direction: column;
  z-index: 5;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.04);
  transition: width 0.2s ease;

  @media (max-width: 960px) {
    width: 100%;
    border-inline-start: none;
    border-top: 1px solid var(--border, #e2e8f0);
    max-height: 300px;
  }
}

.legend-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--border, #e2e8f0);
  background-color: var(--muted, #f8fafc);
}

.legend-header-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;

  .title-text {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--foreground, #0f172a);
  }
}

.btn-close-legend {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--radius-sm, 4px);
  border: 1px solid var(--border, #e2e8f0);
  background-color: var(--card, #ffffff);
  color: var(--muted-foreground, #64748b);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: var(--foreground, #0f172a);
    border-color: var(--primary, #0284c7);
  }
}

.legend-scroll-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.legend-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background-color: var(--card, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  padding: 0.5rem;

  &.thermal-section {
    border-color: rgba(239, 68, 68, 0.25);
    background: linear-gradient(180deg, rgba(239, 68, 68, 0.03) 0%, rgba(2, 132, 199, 0.02) 100%);
  }
}

.section-title-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--foreground, #0f172a);
}

.section-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border-radius: 9999px;
  background-color: oklch(from var(--primary, #0284c7) l c h / 15%);
  color: var(--primary, #0284c7);
  font-size: 0.5625rem;
  font-weight: 800;
}

.sub-hint {
  font-size: 0.5625rem;
  color: var(--primary, #0284c7);
  font-weight: 600;
}

/* لیست طیف رنگ‌های حرارتی */
.heat-spectrum-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.heat-row {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  padding: 0.35rem;
  border-radius: var(--radius-sm, 4px);
  border: 1px solid var(--border, #e2e8f0);
  background-color: var(--background, #f8fafc);

  &.critical {
    border-color: rgba(239, 68, 68, 0.3);
    background-color: rgba(239, 68, 68, 0.06);
  }
  &.busy {
    border-color: rgba(249, 115, 22, 0.3);
    background-color: rgba(249, 115, 22, 0.06);
  }
  &.normal {
    border-color: rgba(2, 132, 199, 0.3);
    background-color: rgba(2, 132, 199, 0.06);
  }
  &.idle {
    border-color: rgba(16, 185, 129, 0.3);
    background-color: rgba(16, 185, 129, 0.06);
  }
}

.heat-indicator {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  margin-top: 0.2rem;
  flex-shrink: 0;

  &.critical {
    background-color: #ef4444;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.35);
  }
  &.busy {
    background-color: #f97316;
    box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.35);
  }
  &.normal {
    background-color: #0284c7;
    box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.35);
  }
  &.idle {
    background-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.35);
  }
}

.heat-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.heat-head {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.6875rem;

  .heat-title {
    color: var(--foreground, #0f172a);
  }
}

.heat-desc {
  margin: 0;
  font-size: 0.5625rem;
  color: var(--muted-foreground, #64748b);
  line-height: 1.3;
}

.legend-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.legend-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.35rem;
  border-radius: var(--radius-sm, 4px);
  background-color: var(--background, #f8fafc);
  border: 1px solid transparent;
  transition: all 0.15s ease;

  &.clickable-filter {
    cursor: pointer;

    &:hover {
      background-color: oklch(from var(--primary, #0284c7) l c h / 8%);
      border-color: oklch(from var(--primary, #0284c7) l c h / 20%);
    }

    &.active {
      background-color: oklch(from var(--primary, #0284c7) l c h / 12%);
      border-color: var(--primary, #0284c7);
    }
  }
}

.indicator-cell {
  padding-top: 0.15rem;
  flex-shrink: 0;
}

.legend-circle {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  border: 1.5px solid #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);

  &.active-circle {
    background-color: #f59e0b;
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.35);
  }

  &.pending-circle {
    background-color: #a855f7;
    box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.35);
  }

  &.done-circle {
    background-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.35);
  }

  &.selected-circle {
    background-color: #0284c7;
    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.4);
  }
}

.legend-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.legend-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.6875rem;

  .color-name {
    color: var(--foreground, #0f172a);
  }
}

.count-tag {
  margin-inline-start: auto;
  font-size: 0.5625rem;
  font-weight: 700;
  padding-block: 0.05rem;
  padding-inline: 0.3rem;
  border-radius: 9999px;

  &.active {
    background-color: rgba(245, 158, 11, 0.15);
    color: #d97706;
  }
  &.pending {
    background-color: rgba(168, 85, 247, 0.15);
    color: #9333ea;
  }
  &.done {
    background-color: rgba(16, 185, 129, 0.15);
    color: #059669;
  }
}

.legend-desc {
  margin: 0;
  font-size: 0.625rem;
  color: var(--muted-foreground, #64748b);
  line-height: 1.35;
}

/* شبکه کارت‌های محلات اهواز با برچسب حرارتی */
.neighborhoods-color-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.3rem;
}

.neighborhood-color-card {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.35rem;
  border-radius: var(--radius-sm, 4px);
  border: 1px solid var(--border, #e2e8f0);
  background-color: var(--background, #f8fafc);
  cursor: pointer;
  text-align: right;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--primary, #0284c7);
    background-color: var(--card, #ffffff);
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }

  &.active {
    border-color: var(--primary, #0284c7);
    background-color: oklch(from var(--primary, #0284c7) l c h / 12%);
  }
}

.card-color-swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.15);
}

.card-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.neighborhood-name {
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--foreground, #0f172a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.region-badge {
  font-size: 0.5rem;
  color: var(--muted-foreground, #64748b);
}

.card-count {
  font-size: 0.625rem;
  font-weight: 800;
  background-color: var(--card, #ffffff);
  padding-block: 0.05rem;
  padding-inline: 0.3rem;
  border-radius: var(--radius-sm, 4px);
  border: 1px solid var(--border, #e2e8f0);
}

.base-layer-info {
  background-color: var(--muted, #f8fafc);
}

.osm-info-card {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.osm-tag {
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--primary, #0284c7);
}

.osm-desc {
  margin: 0;
  font-size: 0.5625rem;
  color: var(--muted-foreground, #64748b);
  line-height: 1.35;
}

/* نوار وضعیت پایین نقشه */
.map-footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  background-color: var(--card, #ffffff);
  border-top: 1px solid var(--border, #e2e8f0);
  padding-block: 0.4rem;
  padding-inline: 0.75rem;
  font-size: 0.6875rem;
  color: var(--muted-foreground, #64748b);
  flex-wrap: wrap;
}

.quick-status-indicators {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;

  .footer-title {
    font-weight: 700;
    color: var(--foreground, #0f172a);
    font-size: 0.625rem;
  }
}

.quick-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.625rem;
}

.heat-dot-sm {
  width: 7px;
  height: 7px;
  border-radius: 9999px;

  &.critical {
    background-color: #ef4444;
  }
  &.busy {
    background-color: #f97316;
  }
  &.normal {
    background-color: #0284c7;
  }
  &.idle {
    background-color: #10b981;
  }
}

.osm-attribution {
  font-size: 0.625rem;
  color: var(--muted-foreground, #64748b);
}

.icon-xxs {
  width: 0.75rem;
  height: 0.75rem;
}

.icon-xs {
  width: 0.875rem;
  height: 0.875rem;
}
</style>

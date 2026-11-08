import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('src/pages/LoginPage.vue'),
  },
  {
    path: '/',
    component: () => import('src/layouts/PanelLayout.vue'),
    children: [
      {
        path: 'dashboard',
        component: () => import('src/pages/DashboardPage.vue'),
      },
      {
        path: 'missions',
        component: () => import('src/pages/MissionsPage.vue'),
      },
      {
        path: 'missions/complaints',
        component: () => import('src/pages/SimbaComplaintsPage.vue'),
      },
      {
        path: 'missions/inspections',
        component: () => import('src/pages/UnitInspectionsPage.vue'),
      },
      {
        path: 'missions/inspections/warnings',
        component: () => import('src/pages/inspections/InspectorWarningsPage.vue'),
      },
      {
        path: 'missions/inspections/amaken',
        component: () => import('src/pages/inspections/InspectorAmakenPage.vue'),
      },
      {
        path: 'missions/inspections/seal',
        component: () => import('src/pages/inspections/InspectorSealPage.vue'),
      },
      {
        path: 'missions/inspections/dismissed',
        component: () => import('src/pages/inspections/InspectorDismissedPage.vue'),
      },
      {
        path: 'missions/inspections/unseal',
        component: () => import('src/pages/inspections/InspectorUnsealPage.vue'),
      },
      {
        path: 'missions/inspections/new',
        component: () => import('src/pages/inspections/RegisterFieldInspectionPage.vue'),
      },
      {
        path: 'unions',
        component: () => import('src/pages/UnionsManagementPage.vue'),
      },
      {
        path: 'warnings',
        component: () => import('src/pages/WarningsPage.vue'),
      },
      {
        path: 'bread',
        component: () => import('src/pages/BreadPage.vue'),
      },
      {
        path: 'specialized',
        component: () => import('src/pages/SpecializedHubPage.vue'),
      },
      {
        path: 'specialized/:slug',
        component: () => import('src/pages/SpecializedModulePage.vue'),
      },
      {
        path: 'risk',
        component: () => import('src/pages/RiskPage.vue'),
      },
      {
        path: 'reports',
        component: () => import('src/pages/ReportsPage.vue'),
      },
      {
        path: 'audit',
        component: () => import('src/pages/AuditPage.vue'),
      },
      {
        path: 'settings',
        component: () => import('src/pages/SettingsPage.vue'),
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    redirect: '/',
  },
];

export default routes;

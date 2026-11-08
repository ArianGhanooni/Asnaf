import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { UnionRegistryItem, UnionUserAccount, UnionCategory } from 'src/types/asnaf';
import { ahvazUnionsList, initialUnionUsers } from 'src/utils/unionsRegistry';

export const useUnionsStore = defineStore('unions', () => {
  const unions = ref<UnionRegistryItem[]>([...ahvazUnionsList]);
  const unionUsers = ref<UnionUserAccount[]>([...initialUnionUsers]);

  // Filters
  const searchQuery = ref('');
  const selectedCategory = ref<'all' | UnionCategory>('all');

  // Stats
  const totalUnions = computed(() => unions.value.length);
  const distributiveCount = computed(
    () => unions.value.filter((u) => u.category === 'distributive').length
  );
  const productiveCount = computed(
    () => unions.value.filter((u) => u.category === 'productive').length
  );
  const totalMembers = computed(() =>
    unions.value.reduce((acc, u) => acc + u.activeMembersCount, 0)
  );
  const totalWarnings = computed(() =>
    unions.value.reduce((acc, u) => acc + u.activeWarningsCount, 0)
  );
  const totalSealed = computed(() =>
    unions.value.reduce((acc, u) => acc + u.sealedCount, 0)
  );
  const totalUsers = computed(() => unionUsers.value.length);

  // Filtered Unions
  const filteredUnions = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    return unions.value.filter((u) => {
      const matchCat =
        selectedCategory.value === 'all' || u.category === selectedCategory.value;
      if (!matchCat) return false;

      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.code.toLowerCase().includes(q) ||
        u.presidentName.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        u.address.toLowerCase().includes(q)
      );
    });
  });

  function getUnionById(id: number): UnionRegistryItem | undefined {
    return unions.value.find((u) => u.id === id);
  }

  function getUnionByName(name: string): UnionRegistryItem | undefined {
    return unions.value.find(
      (u) => u.name.includes(name) || name.includes(u.name.replace('اتحادیه صنف ', ''))
    );
  }

  function getUsersForUnion(unionId: number): UnionUserAccount[] {
    return unionUsers.value.filter((u) => u.unionId === unionId);
  }

  function addUnionUser(payload: Omit<UnionUserAccount, 'id'>): UnionUserAccount {
    const newId =
      unionUsers.value.length > 0
        ? Math.max(...unionUsers.value.map((u) => u.id)) + 1
        : 1;
    const user: UnionUserAccount = {
      id: newId,
      ...payload,
    };
    unionUsers.value.unshift(user);

    // Update usersCount in union
    const targetUnion = unions.value.find((u) => u.id === payload.unionId);
    if (targetUnion) {
      // Create new object to maintain immutability
      const idx = unions.value.findIndex((u) => u.id === payload.unionId);
      if (idx !== -1) {
        unions.value[idx] = {
          ...targetUnion,
          usersCount: targetUnion.usersCount + 1,
        };
      }
    }
    return user;
  }

  function updateUnionUser(
    id: number,
    patch: Partial<UnionUserAccount>
  ): void {
    const idx = unionUsers.value.findIndex((u) => u.id === id);
    if (idx !== -1) {
      unionUsers.value[idx] = { ...unionUsers.value[idx], ...patch } as UnionUserAccount;
    }
  }

  function toggleUnionUserStatus(id: number): void {
    const user = unionUsers.value.find((u) => u.id === id);
    if (user) {
      user.isActive = !user.isActive;
    }
  }

  function deleteUnionUser(id: number): void {
    const user = unionUsers.value.find((u) => u.id === id);
    if (!user) return;
    const unionId = user.unionId;
    unionUsers.value = unionUsers.value.filter((u) => u.id !== id);

    // Update usersCount in union
    const targetUnion = unions.value.find((u) => u.id === unionId);
    if (targetUnion && targetUnion.usersCount > 0) {
      const idx = unions.value.findIndex((u) => u.id === unionId);
      if (idx !== -1) {
        unions.value[idx] = {
          ...targetUnion,
          usersCount: Math.max(0, targetUnion.usersCount - 1),
        };
      }
    }
  }

  function updateUnionUserPermissions(
    id: number,
    permissions: UnionUserAccount['permissions']
  ): void {
    const user = unionUsers.value.find((u) => u.id === id);
    if (user) {
      user.permissions = { ...permissions };
    }
  }

  function updateUnion(id: number, patch: Partial<UnionRegistryItem>): void {
    const idx = unions.value.findIndex((u) => u.id === id);
    const existing = unions.value[idx];
    if (idx !== -1 && existing) {
      let catLabel = existing.categoryLabel;
      if (patch.category) {
        catLabel = patch.category === 'distributive' ? 'توزیعی - خدماتی' : 'تولیدی - خدماتی';
      }
      unions.value[idx] = {
        ...existing,
        ...patch,
        categoryLabel: patch.categoryLabel || catLabel,
      } as UnionRegistryItem;
    }
  }

  function addUnion(payload: {
    name: string;
    category: UnionCategory;
    presidentName: string;
    phone: string;
    address: string;
  }): UnionRegistryItem {
    const newId =
      unions.value.length > 0
        ? Math.max(...unions.value.map((u) => u.id)) + 1
        : 1;
    const code = `UN-${newId + 100}`;
    const categoryLabel: 'توزیعی - خدماتی' | 'تولیدی - خدماتی' =
      payload.category === 'distributive' ? 'توزیعی - خدماتی' : 'تولیدی - خدماتی';

    const newUnion: UnionRegistryItem = {
      id: newId,
      code,
      name: payload.name,
      category: payload.category,
      categoryLabel,
      presidentName: payload.presidentName,
      phone: payload.phone,
      address: payload.address,
      activeMembersCount: 0,
      activeWarningsCount: 0,
      sealedCount: 0,
      usersCount: 0,
    };
    unions.value.unshift(newUnion);
    return newUnion;
  }

  function deleteUnion(id: number): void {
    const idx = unions.value.findIndex((u) => u.id === id);
    if (idx !== -1) {
      unions.value.splice(idx, 1);
      unionUsers.value = unionUsers.value.filter((u) => u.unionId !== id);
    }
  }

  return {
    unions,
    unionUsers,
    searchQuery,
    selectedCategory,
    totalUnions,
    distributiveCount,
    productiveCount,
    totalMembers,
    totalWarnings,
    totalSealed,
    totalUsers,
    filteredUnions,
    getUnionById,
    getUnionByName,
    getUsersForUnion,
    addUnionUser,
    updateUnionUser,
    deleteUnionUser,
    updateUnion,
    addUnion,
    deleteUnion,
    toggleUnionUserStatus,
    updateUnionUserPermissions,
  };
});

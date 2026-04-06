/**
 * Centralized UI state management using Zustand
 * Handles loading states, errors, modals, and notifications
 */

import { create } from 'zustand';

export const useUiStore = create((set) => ({
  // Global loading state
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  // Errors state
  errors: [],
  addError: (error) => set((state) => ({
    errors: [...state.errors, { id: Date.now(), message: error }],
  })),
  removeError: (id) => set((state) => ({
    errors: state.errors.filter((e) => e.id !== id),
  })),
  clearErrors: () => set({ errors: [] }),

  // Toast notifications
  toasts: [],
  addToast: (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    if (duration > 0) {
      setTimeout(() => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      })), duration);
    }
    return id;
  },
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),

  // Modal states
  modals: {},
  openModal: (modalName, data = null) => set((state) => ({
    modals: { ...state.modals, [modalName]: { open: true, data } },
  })),
  closeModal: (modalName) => set((state) => ({
    modals: { ...state.modals, [modalName]: { open: false, data: null } },
  })),
  closeAllModals: () => set({ modals: {} }),

  // Pagination state
  page: 1,
  pageSize: 20,
  totalItems: 0,
  setPage: (page) => set({ page }),
  setPageSize: (size) => set({ pageSize: size }),
  setTotalItems: (total) => set({ totalItems: total }),

  // Filters state
  filters: {},
  setFilters: (filters) => set({ filters }),
  addFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value },
  })),
  removeFilter: (key) => set((state) => {
    const newFilters = { ...state.filters };
    delete newFilters[key];
    return { filters: newFilters };
  }),
  clearFilters: () => set({ filters: {} }),

  // Sort state
  sortBy: null,
  sortOrder: 'asc',
  setSort: (sortBy, sortOrder = 'asc') => set({ sortBy, sortOrder }),

  // Selected items
  selectedItems: [],
  addSelected: (id) => set((state) => ({
    selectedItems: [...new Set([...state.selectedItems, id])],
  })),
  removeSelected: (id) => set((state) => ({
    selectedItems: state.selectedItems.filter((i) => i !== id),
  })),
  toggleSelected: (id) => set((state) => ({
    selectedItems: state.selectedItems.includes(id)
      ? state.selectedItems.filter((i) => i !== id)
      : [...state.selectedItems, id],
  })),
  setSelected: (items) => set({ selectedItems: items }),
  clearSelected: () => set({ selectedItems: [] }),

  // Search state
  search: '',
  setSearch: (search) => set({ search }),
}));

/**
 * Hook to show error toast and add to errors
 */
export const useErrorNotification = () => {
  const { addError, addToast } = useUiStore();

  return (message, autoNotify = true) => {
    addError(message);
    if (autoNotify) {
      addToast(message, 'error', 5000);
    }
  };
};

/**
 * Hook to show success toast
 */
export const useSuccessNotification = () => {
  const { addToast } = useUiStore();

  return (message, duration = 3000) => {
    addToast(message, 'success', duration);
  };
};

/**
 * Hook for loading state management
 */
export const useLoading = () => {
  const { isLoading, setLoading } = useUiStore();

  return {
    isLoading,
    withLoading: async (fn) => {
      try {
        setLoading(true);
        return await fn();
      } finally {
        setLoading(false);
      }
    },
  };
};

/**
 * Hook for modal management
 */
export const useModal = (modalName) => {
  const { modals, openModal, closeModal } = useUiStore();
  const modal = modals[modalName] || { open: false, data: null };

  return {
    isOpen: modal.open,
    data: modal.data,
    open: (data) => openModal(modalName, data),
    close: () => closeModal(modalName),
  };
};

/**
 * Hook for pagination
 */
export const usePagination = () => {
  const { page, pageSize, totalItems, setPage, setPageSize, setTotalItems } = useUiStore();

  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
    setPage,
    setPageSize,
    setTotalItems,
    goToPage: (p) => setPage(Math.max(1, Math.min(p, Math.ceil(totalItems / pageSize)))),
    nextPage: () => setPage(page + 1),
    prevPage: () => setPage(Math.max(1, page - 1)),
  };
};

/**
 * Hook for filtering
 */
export const useFiltering = () => {
  const { filters, setFilters, addFilter, removeFilter, clearFilters } = useUiStore();

  return {
    filters,
    setFilters,
    addFilter,
    removeFilter,
    clearFilters,
    hasFilters: Object.keys(filters).length > 0,
  };
};

/**
 * Hook for sorting
 */
export const useSorting = () => {
  const { sortBy, sortOrder, setSort } = useUiStore();

  return {
    sortBy,
    sortOrder,
    setSort,
    toggleSort: (newSortBy) => {
      if (sortBy === newSortBy) {
        // Toggle order
        setSort(newSortBy, sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        // New sort field
        setSort(newSortBy, 'asc');
      }
    },
  };
};

/**
 * Hook for selection management
 */
export const useSelection = () => {
  const { selectedItems, addSelected, removeSelected, toggleSelected, setSelected, clearSelected } = useUiStore();

  return {
    selectedItems,
    addSelected,
    removeSelected,
    toggleSelected,
    setSelected,
    clearSelected,
    hasSelection: selectedItems.length > 0,
    selectCount: selectedItems.length,
  };
};

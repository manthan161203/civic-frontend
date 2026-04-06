/**
 * Centralized UI state management for mobile app using Zustand
 * Handles loading states, errors, and notifications
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

  // Bottom sheet states
  bottomSheets: {},
  openBottomSheet: (sheetName, data = null) => set((state) => ({
    bottomSheets: { ...state.bottomSheets, [sheetName]: { open: true, data } },
  })),
  closeBottomSheet: (sheetName) => set((state) => ({
    bottomSheets: { ...state.bottomSheets, [sheetName]: { open: false, data: null } },
  })),

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

  // Search state
  search: '',
  setSearch: (search) => set({ search }),

  // Focus state (for managing input focus on mobile)
  focusedInput: null,
  setFocusedInput: (inputName) => set({ focusedInput: inputName }),
  clearFocus: () => set({ focusedInput: null }),
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
 * Hook to show info toast
 */
export const useInfoNotification = () => {
  const { addToast } = useUiStore();

  return (message, duration = 3000) => {
    addToast(message, 'info', duration);
  };
};

/**
 * Hook for loading state management
 */
export const useLoading = () => {
  const { isLoading, setLoading } = useUiStore();

  return {
    isLoading,
    setLoading,
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
 * Hook for modal management (for small modals/dialogs)
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
 * Hook for bottom sheet management (better for mobile)
 */
export const useBottomSheet = (sheetName) => {
  const { bottomSheets, openBottomSheet, closeBottomSheet } = useUiStore();
  const sheet = bottomSheets[sheetName] || { open: false, data: null };

  return {
    isOpen: sheet.open,
    data: sheet.data,
    open: (data) => openBottomSheet(sheetName, data),
    close: () => closeBottomSheet(sheetName),
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
    isFirstPage: page === 1,
    isLastPage: page >= Math.ceil(totalItems / pageSize),
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
 * Hook for search
 */
export const useSearch = () => {
  const { search, setSearch } = useUiStore();

  return {
    search,
    setSearch,
    clearSearch: () => setSearch(''),
    hasSearch: search.length > 0,
  };
};

/**
 * Hook for input focus management (mobile)
 */
export const useFocus = () => {
  const { focusedInput, setFocusedInput, clearFocus } = useUiStore();

  return {
    focusedInput,
    setFocusedInput,
    clearFocus,
    isFocused: (inputName) => focusedInput === inputName,
  };
};

/**
 * Component Performance Optimization Hooks
 * Provides utilities for memoization, debouncing, and performance monitoring
 */

import { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react';

/**
 * Advanced memo wrapper with custom comparison
 */
export const withMemo = (Component, isEqual) => {
  return memo(Component, isEqual);
};

/**
 * Hook for debouncing expensive operations
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook for throttling expensive operations
 */
export const useThrottle = (callback, delay = 300) => {
  const lastRun = useRef(Date.now());

  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = now;
    }
  }, [callback, delay]);
};

/**
 * Hook for performance monitoring
 */
export const usePerformance = (componentName) => {
  const mountTime = useRef(Date.now());

  useEffect(() => {
    const renderTime = Date.now() - mountTime.current;
    console.log(`⚡ ${componentName} rendered in ${renderTime}ms`);

    return () => {
      const unmountTime = Date.now() - mountTime.current;
      console.log(`⚡ ${componentName} lifecycle: ${unmountTime}ms`);
    };
  }, [componentName]);
};

/**
 * ⚡ OPTIMIZED: Form input handling with debouncing
 * Prevents lag when typing - only updates parent state after user stops typing
 * 
 * Usage:
 *   const [formData, setFormData] = useState({...})
 *   const formInput = useDebouncedFormInput(formData, setFormData, 200)
 *   
 *   <input {...formInput.bind('fieldName')} />
 */
export const useDebouncedFormInput = (formData, setFormData, delayMs = 200) => {
  const tempDataRef = useRef({ ...formData });
  const timeoutRef = useRef(null);

  const handleChange = useCallback((field) => (e) => {
    const value = e.target.value;
    
    // Update temporary data immediately (for input responsiveness)
    tempDataRef.current[field] = value;
    e.target.value = value;  // Keep input value updated

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce parent state update
    timeoutRef.current = setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }, delayMs);
  }, [setFormData, delayMs]);

  const bind = useCallback((field) => ({
    onChange: handleChange(field),
    defaultValue: formData[field] || ''
  }), [formData, handleChange]);

  return { bind, handleChange };
};

/**
 * Optimized list rendering with pagination
 */
export const usePaginatedList = (items, pageSize = 50) => {
  const [page, setPage] = useState(0);

  const paginatedItems = useMemo(() => {
    const start = page * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, page, pageSize]);

  const totalPages = Math.ceil(items.length / pageSize);

  const goToPage = useCallback((pageNum) => {
    setPage(Math.max(0, Math.min(pageNum, totalPages - 1)));
  }, [totalPages]);

  return {
    items: paginatedItems,
    page,
    totalPages,
    goToPage,
    hasNextPage: page < totalPages - 1,
    hasPrevPage: page > 0,
    nextPage: () => goToPage(page + 1),
    prevPage: () => goToPage(page - 1)
  };
};

/**
 * Hook for memoizing expensive calculations
 */
export const useMemoized = (factory, deps) => {
  const memoRef = useRef(null);
  const depsRef = useRef(deps);

  if (JSON.stringify(deps) !== JSON.stringify(depsRef.current)) {
    memoRef.current = factory();
    depsRef.current = deps;
  }

  return memoRef.current;
};

export default {
  withMemo,
  useDebounce,
  useThrottle,
  usePerformance,
  usePaginatedList,
  useMemoized,
  useDebouncedFormInput
};

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'parquetastic-theme';

/**
 * Custom hook for managing theme (light/dark mode)
 * - Automatically detects system preference
 * - Persists user choice in localStorage
 * - Applies the 'dark' class to document root
 */
export function useTheme() {
    const [theme, setThemeState] = useState(() => {
        // Check localStorage first
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'light' || stored === 'dark') {
                return stored;
            }
            // Fall back to system preference
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
        }
        return 'light';
    });

    // Apply theme to document
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    // Listen for system preference changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            // Only update if user hasn't explicitly set a preference
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                setThemeState(e.matches ? 'dark' : 'light');
            }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const setTheme = (newTheme) => {
        setThemeState(newTheme);
        localStorage.setItem(STORAGE_KEY, newTheme);
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return { theme, setTheme, toggleTheme };
}

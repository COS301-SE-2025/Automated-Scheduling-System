import { createContext } from 'react';

export type ThemeContextType = {
    darkMode: boolean;
    toggleDarkMode: () => void;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
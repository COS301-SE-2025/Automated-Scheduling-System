import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';

const mockLocalStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
	value: mockLocalStorage,
	writable: true
});

// Test component that uses the theme context
const TestComponent = () => {
	const { darkMode, toggleDarkMode } = useTheme();

	return (
		<div>
			<div data-testid="dark-mode">{darkMode ? 'dark' : 'light'}</div>
			<button data-testid="toggle-btn" onClick={toggleDarkMode}>
				Toggle Theme
			</button>
		</div>
	);
};

const renderWithThemeProvider = (component: React.ReactElement) => {
	return render(
		<ThemeProvider>
			{component}
		</ThemeProvider>
	);
};

describe('ThemeContext', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		document.documentElement.className = '';
	});

	afterEach(() => {
		vi.restoreAllMocks();
		document.documentElement.className = '';
	});

	describe('Initial State', () => {
		it('should initialize with light mode when no stored preference', () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			renderWithThemeProvider(<TestComponent />);

			expect(screen.getByTestId('dark-mode')).toHaveTextContent('light');
			expect(document.documentElement.classList.contains('dark')).toBe(false);
		});

		it('should initialize with dark mode when stored preference is true', () => {
			mockLocalStorage.getItem.mockReturnValue('true');

			renderWithThemeProvider(<TestComponent />);

			expect(screen.getByTestId('dark-mode')).toHaveTextContent('dark');
			expect(document.documentElement.classList.contains('dark')).toBe(true);
		});
	});

	describe('Theme Toggle', () => {
		it('should toggle from light to dark mode', () => {
			mockLocalStorage.getItem.mockReturnValue('false');

			renderWithThemeProvider(<TestComponent />);

			expect(screen.getByTestId('dark-mode')).toHaveTextContent('light');

			act(() => {
				screen.getByTestId('toggle-btn').click();
			});

			expect(screen.getByTestId('dark-mode')).toHaveTextContent('dark');
			expect(document.documentElement.classList.contains('dark')).toBe(true);
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith('darkMode', 'true');
		});

		it('should toggle from dark to light mode', () => {
			mockLocalStorage.getItem.mockReturnValue('true');

			renderWithThemeProvider(<TestComponent />);

			expect(screen.getByTestId('dark-mode')).toHaveTextContent('dark');
			expect(document.documentElement.classList.contains('dark')).toBe(true);

			act(() => {
				screen.getByTestId('toggle-btn').click();
			});

			expect(screen.getByTestId('dark-mode')).toHaveTextContent('light');
			expect(document.documentElement.classList.contains('dark')).toBe(false);
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith('darkMode', 'false');
		});
	});

	describe('localStorage Integration', () => {
		it('should read from localStorage on component mount', () => {
			mockLocalStorage.getItem.mockReturnValue('true');

			renderWithThemeProvider(<TestComponent />);

			expect(mockLocalStorage.getItem).toHaveBeenCalledWith('darkMode');
		});

		it('should save theme preference to localStorage when toggling', () => {
			mockLocalStorage.getItem.mockReturnValue('false');

			renderWithThemeProvider(<TestComponent />);

			act(() => {
				screen.getByTestId('toggle-btn').click();
			});

			expect(mockLocalStorage.setItem).toHaveBeenCalledWith('darkMode', 'true');
		});
	});
});
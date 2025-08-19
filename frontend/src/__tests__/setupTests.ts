import '@testing-library/jest-dom'
import { vi } from 'vitest';

class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

if (typeof (globalThis as any).ResizeObserver === 'undefined') {
	(globalThis as any).ResizeObserver = ResizeObserverMock;
}

vi.mock('../hooks/useAuth', () => ({
	useAuth: () => ({
		user: { role: 'Admin', name: 'Test User' },
		permissions: ['events', 'users', 'roles'],
		login: vi.fn(),
		logout: vi.fn(),
	}),
}));
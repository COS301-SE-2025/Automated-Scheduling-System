import '@testing-library/jest-dom'
class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

if (typeof (globalThis as any).ResizeObserver === 'undefined') {
	(globalThis as any).ResizeObserver = ResizeObserverMock;
}
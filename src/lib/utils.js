import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const CHECKOUT_CONTEXT_KEY = 'pharaohvault:checkout-context';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

const safeWindow = typeof window !== 'undefined' ? window : undefined;

export const persistCheckoutContext = (context = {}) => {
	if (!safeWindow) return;
	try {
		const payload = {
			...context,
			createdAt: Date.now(),
		};
		safeWindow.sessionStorage.setItem(CHECKOUT_CONTEXT_KEY, JSON.stringify(payload));
	} catch (error) {
		console.warn('Failed to persist checkout context', error);
	}
};

export const readCheckoutContext = () => {
	if (!safeWindow) return null;
	try {
		const raw = safeWindow.sessionStorage.getItem(CHECKOUT_CONTEXT_KEY);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch (error) {
		console.warn('Failed to read checkout context', error);
		return null;
	}
};

export const clearCheckoutContext = () => {
	if (!safeWindow) return;
	try {
		safeWindow.sessionStorage.removeItem(CHECKOUT_CONTEXT_KEY);
	} catch (error) {
		console.warn('Failed to clear checkout context', error);
	}
};
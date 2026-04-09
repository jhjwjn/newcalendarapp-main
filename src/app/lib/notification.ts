// Custom in-app notification system (replaces Sonner)

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();
let counter = 0;

function emit() {
  listeners.forEach(l => l([...items]));
}

function add(message: string, type: ToastType, duration = 3500): string {
  const id = `toast-${Date.now()}-${counter++}`;
  items = [...items, { id, message, type }];
  emit();
  if (type !== 'loading') {
    setTimeout(() => dismiss(id), duration);
  }
  return id;
}

export function dismiss(id: string) {
  items = items.filter(i => i.id !== id);
  emit();
}

export function subscribeToToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener([...items]);
  return () => listeners.delete(listener);
}

export const toast = {
  success: (msg: string) => add(msg, 'success'),
  error: (msg: string) => add(msg, 'error'),
  info: (msg: string) => add(msg, 'info'),
  loading: (msg: string) => add(msg, 'loading'),
  dismiss,
};

// Powered By Vistech Force
// Global action toast store — call toast("msg") from any client component

export type ToastType = "ok" | "bad" | "warn" | "info";
type ToastItem = { id: string; type: ToastType; msg: string };

let _toasts: ToastItem[] = [];
let _exiting: Set<string> = new Set();
const _subs = new Set<() => void>();
const _emit = () => _subs.forEach((f) => f());

const EXIT_MS = 280;

export function toast(msg: string, type: ToastType = "ok", duration = 4000) {
  const id = Math.random().toString(36).slice(2, 9);
  _toasts = [..._toasts, { id, type, msg }];
  _emit();
  setTimeout(() => {
    _exiting = new Set([..._exiting, id]);
    _emit();
    setTimeout(() => {
      _toasts = _toasts.filter((t) => t.id !== id);
      _exiting = new Set([..._exiting].filter((x) => x !== id));
      _emit();
    }, EXIT_MS);
  }, duration);
}

export function getToasts() { return _toasts; }
export function getExiting() { return _exiting; }
export function subscribe(fn: () => void) { _subs.add(fn); return () => { _subs.delete(fn); }; }

let openFn: ((opts?: any) => void) | null = null;
let closeFn: (() => void) | null = null;
let initialized = false;

export function setAppKitFunctions(open: (opts?: any) => void, close: () => void) {
  openFn = open;
  closeFn = close;
  initialized = true;
}

export function openAppKit(opts?: any) {
  if (openFn) {
    openFn(opts);
  } else {
    console.warn('AppKit not yet initialized');
  }
}

export function closeAppKit() {
  if (closeFn) {
    closeFn();
  }
}

export function isAppKitReady() {
  return initialized;
}

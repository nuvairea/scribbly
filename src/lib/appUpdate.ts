import { registerSW } from 'virtual:pwa-register';

export type UpdateCheckResult = 'available' | 'latest' | 'error';

type Listener = () => void;

let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | undefined;
let registration: ServiceWorkerRegistration | undefined;
let updateWaiting = false;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function initAppUpdates() {
  if (applyUpdate) return;
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateWaiting = true;
      notify();
    },
    onRegisteredSW(_url, reg) {
      registration = reg;
    },
  });
}

export function onUpdateAvailable(listener: Listener) {
  listeners.add(listener);
  if (updateWaiting) listener();
  return () => {
    listeners.delete(listener);
  };
}

export function reloadToUpdate() {
  void applyUpdate?.(true);
}

function waitForInstall(worker: ServiceWorker) {
  return new Promise<void>((resolve) => {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' || worker.state === 'redundant') resolve();
    });
  });
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (!registration) return 'error';
  try {
    await registration.update();
    if (registration.installing) await waitForInstall(registration.installing);
    if (registration.waiting) {
      updateWaiting = true;
      notify();
      return 'available';
    }
    return 'latest';
  } catch {
    return 'error';
  }
}

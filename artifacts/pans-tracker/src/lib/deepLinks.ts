/**
 * Deep-link / universal-link handler for Capacitor native builds.
 *
 * Registers a one-time `appUrlOpen` listener via @capacitor/app that fires
 * whenever the OS opens the app via a universal link, a custom URL scheme, or
 * a push-notification tap that carries a target URL.
 *
 * When a URL arrives the handler:
 *  1. Parses the path/search/hash out of the full URL.
 *  2. Pushes that path into the browser-history entry (wouter watches popstate).
 *  3. Dispatches a popstate event so wouter re-evaluates the current location
 *     and renders the matching route — without a full page reload.
 *
 * The guard on isNative() means the listener is never registered in the web
 * build, so the web routing path is completely untouched.
 */

import { isNative } from './platform';

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '');

export async function registerDeepLinkListener(): Promise<void> {
  if (!isNative()) return;

  const { App } = await import('@capacitor/app');

  App.addListener('appUrlOpen', (event) => {
    try {
      const url = new URL(event.url);
      const pathname = url.pathname || '/';
      const target = BASE_PATH + pathname + url.search + url.hash;

      window.history.pushState(null, '', target);
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    } catch {
      // Malformed or unrecognised URL — ignore and leave the current route.
    }
  });
}

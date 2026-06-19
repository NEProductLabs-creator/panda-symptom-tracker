/**
 * Platform helpers for features that differ between the web app and a Capacitor
 * native (iOS / Android) build.
 *
 * All Capacitor plugin imports are dynamic so the web bundle never fails when
 * Capacitor is not initialised — they only execute at runtime on native.
 */

/**
 * Returns true only when running inside a Capacitor native WebView.
 * Uses the global Capacitor bridge object directly (no static import needed)
 * so this function is synchronous and always safe to call on the web.
 */
export function isNative(): boolean {
  return (
    typeof window !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (window as any).Capacitor !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Capacitor.isNativePlatform() === true
  );
}

/**
 * Open a URL in an appropriate viewer.
 * - Web: new browser tab via window.open (same behaviour as target="_blank").
 * - Native: in-app browser via @capacitor/browser so the user stays inside
 *   the app and can easily return.
 *
 * Relative paths (e.g. "/terms") are resolved against the production domain on
 * native, where window.location.origin is "capacitor://localhost" and has no
 * meaning to an external browser.
 */
export async function openExternal(url: string): Promise<void> {
  if (!isNative()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const abs = url.startsWith('http')
    ? url
    : `https://panssymptomtracker.com${url}`;
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url: abs });
}

/**
 * Compose and send an email.
 * - Web: opens the OS mail client via a mailto: link in window.open.
 * - Native: opens the system share sheet pre-filled with subject + body
 *   (@capacitor/browser cannot open mailto: reliably in a WebView).
 */
export async function openMail(
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  if (!isNative()) {
    const mailto =
      `mailto:${encodeURIComponent(to)}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
    return;
  }
  const { Share } = await import('@capacitor/share');
  await Share.share({ title: subject, text: body, dialogTitle: 'Send via Mail' });
}

/** Convert a Blob to a bare base-64 string (no data: URL prefix). */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Print on web (using the existing @media print CSS) or write a file and open
 * the OS share sheet on native so the user can save or send the document.
 *
 * On web the blob argument is ignored — window.print() triggers the browser's
 * native print dialog which already respects the page's @media print styles.
 */
export async function printOrShare(filename: string, blob: Blob): Promise<void> {
  if (!isNative()) {
    window.print();
    return;
  }
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const base64Data = await blobToBase64(blob);
  const file = await Filesystem.writeFile({
    path: filename,
    data: base64Data,
    directory: Directory.Cache,
  });
  await Share.share({ url: file.uri, title: filename });
}

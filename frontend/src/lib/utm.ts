// Remembers where a visitor came from (utm_source / utm_medium / utm_campaign) for the
// rest of the visit, so website enquiries can be attributed to a LinkedIn post, a BNI
// QR code, etc. Storage access is wrapped because Safari Private Browsing can throw.
const KEY = 'vb_utm';

export function captureUtm(): void {
  try {
    const p = new URLSearchParams(window.location.search);
    const parts = ['utm_source', 'utm_medium', 'utm_campaign']
      .map(k => (p.get(k) || '').trim().slice(0, 60))
      .filter(Boolean);
    if (parts.length) sessionStorage.setItem(KEY, parts.join(' / '));
  } catch { /* ignore */ }
}

export function getUtm(): string {
  try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; }
}

export const DISABLED_SITES_KEY = 'atenaflow-disabled-sites';

export function normalizeSite(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return url.hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

export function normalizeSiteList(values: string[]): string[] {
  return [...new Set(values.map(normalizeSite).filter((site): site is string => Boolean(site)))];
}

export function isSiteDisabled(hostname: string, disabledSites: string[]): boolean {
  const current = hostname.toLowerCase().replace(/^www\./, '');
  return disabledSites.some((site) => current === site || current.endsWith(`.${site}`));
}

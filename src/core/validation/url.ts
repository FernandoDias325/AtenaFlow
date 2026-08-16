export function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /^(javascript|data|file):/i.test(trimmed)) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
      return null;
    }
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
    const isLocalhost = hostname === 'localhost';
    const isIpv4 =
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) &&
      hostname.split('.').every((part) => Number(part) <= 255);
    const isIpv6 = hostname.includes(':');
    const isDomain =
      /^(?=.{1,253}$)(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z\d](?:[a-z\d-]{0,61}[a-z\d])$/i.test(
        hostname
      );
    if (!isLocalhost && !isIpv4 && !isIpv6 && !isDomain) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

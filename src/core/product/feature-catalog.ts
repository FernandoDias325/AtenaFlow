/** Áreas públicas que precisam permanecer documentadas no manual. */
export const PRODUCT_FEATURE_IDS = [
  'navigation',
  'scripts',
  'categories',
  'bulk-actions',
  'variables',
  'site-popup',
  'field-capture',
  'duplicates',
  'links',
  'reminders',
  'notepad',
  'statistics',
  'trash',
  'backup',
  'appearance',
  'privacy',
  'troubleshooting'
] as const;

export type ProductFeatureId = (typeof PRODUCT_FEATURE_IDS)[number];

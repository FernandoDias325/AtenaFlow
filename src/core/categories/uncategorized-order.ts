export const UNCATEGORIZED_CATEGORY_ID = '__uncategorized__';
export const UNCATEGORIZED_ORDER_KEY = 'atenaflow-uncategorized-order';

export function buildCategoryOrder(categoryIds: string[], savedPosition: number): string[] {
  const position = Math.min(
    Math.max(Number.isFinite(savedPosition) ? Math.trunc(savedPosition) : 0, 0),
    categoryIds.length
  );
  const order = [...categoryIds];
  order.splice(position, 0, UNCATEGORIZED_CATEGORY_ID);
  return order;
}

export function moveCategoryOrder(
  order: string[],
  fromIndex: number,
  toIndex: number
): { categoryIds: string[]; uncategorizedPosition: number } | null {
  if (fromIndex < 0 || fromIndex >= order.length || toIndex < 0 || toIndex >= order.length) {
    return null;
  }
  const moved = [...order];
  const current = moved[fromIndex];
  moved[fromIndex] = moved[toIndex] as string;
  moved[toIndex] = current as string;
  return {
    categoryIds: moved.filter((id) => id !== UNCATEGORIZED_CATEGORY_ID),
    uncategorizedPosition: moved.indexOf(UNCATEGORIZED_CATEGORY_ID)
  };
}

export function isUncategorized(
  categoryId: string | null,
  validCategoryIds: ReadonlySet<string>
): boolean {
  return categoryId === null || !validCategoryIds.has(categoryId);
}

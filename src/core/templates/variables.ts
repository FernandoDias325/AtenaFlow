export function extractTemplateVariables(template: string): string[] {
  const variables: string[] = [];
  const seen = new Set<string>();
  for (const match of template.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) {
    const name = match[1]?.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      variables.push(name);
    }
  }
  return variables;
}

export function renderTemplateVariables(template: string, values: Record<string, string>): string {
  const normalizedTemplate = template.replace(/\r\n?/g, '\n');
  return normalizedTemplate.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (original, rawName: string) => {
    const name = rawName.trim();
    return Object.prototype.hasOwnProperty.call(values, name)
      ? (values[name] ?? '').replace(/\r\n?/g, '\n')
      : original;
  });
}

export function captureTextFromField(element: HTMLElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    const selected = start !== end ? element.value.slice(start, end) : '';
    return (selected || element.value).trim();
  }
  if (element.isContentEditable) {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? '';
    if (selectedText && selection?.anchorNode && element.contains(selection.anchorNode)) {
      return selectedText;
    }
    return (element.innerText || element.textContent || '').trim();
  }
  return '';
}

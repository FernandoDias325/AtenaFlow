const ALLOWED_TAGS = new Set([
  'A',
  'B',
  'BLOCKQUOTE',
  'BR',
  'BUTTON',
  'CODE',
  'DIV',
  'EM',
  'I',
  'LI',
  'MARK',
  'OL',
  'P',
  'PRE',
  'S',
  'SPAN',
  'STRIKE',
  'STRONG',
  'TABLE',
  'TBODY',
  'TD',
  'TH',
  'THEAD',
  'TR',
  'U',
  'UL'
]);

const SAFE_CLASSES = new Set(['notepad-code-block', 'copy-code-btn']);

function isSafeHref(value: string): boolean {
  const trimmed = value.trim();
  return /^(https?:|mailto:|tel:)/i.test(trimmed) || trimmed.startsWith('#');
}

function cleanStyle(element: HTMLElement): void {
  const alignment = element.style.textAlign;
  const background = element.style.backgroundColor.toLowerCase().replace(/\s/g, '');
  element.removeAttribute('style');

  if (['left', 'center', 'right', 'justify'].includes(alignment)) {
    element.style.textAlign = alignment;
  }
  if (['#fef08a', 'rgb(254,240,138)', 'transparent'].includes(background)) {
    element.style.backgroundColor = background;
  }
}

/** Remove marcação e estilos externos, mantendo apenas a formatação usada pelo editor. */
export function sanitizeNotepadHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  for (const element of [...doc.body.querySelectorAll('*')]) {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      if (
        ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH'].includes(element.tagName)
      ) {
        element.remove();
      } else {
        element.replaceWith(...element.childNodes);
      }
      continue;
    }

    const htmlElement = element as HTMLElement;
    cleanStyle(htmlElement);

    for (const attribute of [...element.attributes]) {
      if (attribute.name === 'style') {
        continue;
      }
      if (attribute.name === 'href' && element.tagName === 'A' && isSafeHref(attribute.value)) {
        continue;
      }
      if (attribute.name === 'class') {
        const safe = attribute.value.split(/\s+/).filter((name) => SAFE_CLASSES.has(name));
        if (safe.length > 0) {
          element.setAttribute('class', safe.join(' '));
          continue;
        }
      }
      if (
        attribute.name === 'contenteditable' &&
        element.tagName === 'BUTTON' &&
        attribute.value === 'false'
      ) {
        continue;
      }
      element.removeAttribute(attribute.name);
    }

    if (element.tagName === 'BUTTON' && !element.classList.contains('copy-code-btn')) {
      element.replaceWith(...element.childNodes);
      continue;
    }

    if (element.tagName === 'A') {
      element.setAttribute('rel', 'noopener noreferrer');
    }
  }

  return doc.body.innerHTML;
}

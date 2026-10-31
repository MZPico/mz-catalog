// The little list that drops out of a device when you click the part that
// takes something: a bay, a grille, a chip's label. One list serves every
// device, so a choice of file, a switch and a plain action all look alike.

export type Item =
  | { radio: string; on: boolean; pick: () => void }    // one of several; choosing closes the list
  | { check: string; on: boolean; pick: () => void }    // a switch; the list stays open
  | { action: string; pick: () => void }                // do it and close
  | { note: string }
  | 'sep';

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Open the list under `anchor`; `build` is asked again after every switch. */
export function popup(anchor: HTMLElement, build: () => Item[]): void {
  document.querySelector('.dev-menu')?.remove();
  const home = (anchor.closest('.dev, .mzcmt') as HTMLElement | null) ?? anchor.parentElement!;
  const box = document.createElement('div');
  box.className = 'dev-menu';
  home.append(box);

  const away = (e: PointerEvent) => { if (!box.contains(e.target as Node)) close(); };
  const close = () => { box.remove(); document.removeEventListener('pointerdown', away); };

  const render = () => {
    box.innerHTML = build().map((item) => {
      if (item === 'sep') return '<hr>';
      if ('note' in item) return `<p class="meta">${esc(item.note)}</p>`;
      if ('action' in item) return `<button type="button" data-k="a">${esc(item.action)}</button>`;
      const [mark, label] = 'radio' in item ? [item.on ? '●' : '○', item.radio] : [item.on ? '☑' : '☐', item.check];
      return `<button type="button" data-k="${'radio' in item ? 'r' : 'c'}"><i>${mark}</i>${esc(label)}</button>`;
    }).join('');
    const items = build().filter((i) => i !== 'sep' && !('note' in i)) as Exclude<Item, 'sep' | { note: string }>[];
    box.querySelectorAll<HTMLButtonElement>('button').forEach((b, i) => {
      b.addEventListener('click', () => {
        items[i].pick();
        if (b.dataset.k === 'c') render(); else close();
      });
    });
  };
  render();
  setTimeout(() => document.addEventListener('pointerdown', away), 0);
}

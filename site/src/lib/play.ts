// Where a title is played: its native browser build when meta.yaml names one (`play:`, e.g. BomberNet
// compiled to WebAssembly at /bombernet/: not localized, it is the game itself), else the emulator's
// page for it in the reader's language. query (e.g. `?file=x.mzf`) only for the emulator.
export function playHref(d: { slug: string; play?: string }, p: (path: string) => string, query = ''): string {
  return d.play ? d.play : p(`/play/${d.slug}/`) + query;
}

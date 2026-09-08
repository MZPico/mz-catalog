// Machine identity. The prose (intro, spec labels and values, software note)
// lives in the i18n dictionaries under `machineInfo`.
export interface Machine {
  id: 'mz-700' | 'mz-800' | 'mz-1500';
  name: string;
  years: string;
}

export const machines: Machine[] = [
  { id: 'mz-700', name: 'Sharp MZ-700', years: '1982' },
  { id: 'mz-800', name: 'Sharp MZ-800', years: '1984' },
];

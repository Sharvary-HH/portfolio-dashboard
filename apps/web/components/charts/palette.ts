export const SECTOR_RAMP = {
  light: ['#612634', '#7f3947', '#9b4c5b', '#b26875', '#c48792', '#d4a6b0'],
  dark: ['#f0c8ce', '#e4a3ac', '#d4808d', '#bf6472', '#a34d5c', '#833c49'],
} as const;

export const CHART_INK = {
  light: { axis: '#6f6157', grid: '#e8dcd7', surface: '#ffffff', gain: '#137333', loss: '#c0271d' },
  dark: { axis: '#b9a99d', grid: '#3b3129', surface: '#241d18', gain: '#4ade80', loss: '#f87171' },
} as const;

export type ChartMode = keyof typeof SECTOR_RAMP;

export function rampStep(mode: ChartMode, index: number): string {
  const steps = SECTOR_RAMP[mode];
  return steps[Math.min(index, steps.length - 1)] as string;
}

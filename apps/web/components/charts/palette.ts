export const SECTOR_RAMP = {
  light: ['#0a3a38', '#125552', '#1a706d', '#268c88', '#45a7a3', '#79c2be'],
  dark: ['#a9dbd8', '#7ec6c2', '#57b0ac', '#369a96', '#237f7c', '#155f5c'],
} as const;

export const CHART_INK = {
  light: { axis: '#5a6a70', grid: '#dbdbdb', surface: '#ffffff', gain: '#137333', loss: '#c0271d' },
  dark: { axis: '#a8b7bb', grid: '#2a3d43', surface: '#16242a', gain: '#4ade80', loss: '#f87171' },
} as const;

export type ChartMode = keyof typeof SECTOR_RAMP;

export function rampStep(mode: ChartMode, index: number): string {
  const steps = SECTOR_RAMP[mode];
  return steps[Math.min(index, steps.length - 1)] as string;
}

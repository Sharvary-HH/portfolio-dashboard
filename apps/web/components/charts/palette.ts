export const SECTOR_HUES = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'],
} as const;

export const CHART_INK = {
  light: { axis: '#5b6068', grid: '#dddcd5', surface: '#ffffff', gain: '#0b7a55', loss: '#b4331f' },
  dark: { axis: '#9aa1ad', grid: '#262a32', surface: '#14171d', gain: '#3ecf8e', loss: '#ff7a68' },
} as const;

export type ChartMode = keyof typeof SECTOR_HUES;

export function hueFor(mode: ChartMode, index: number): string {
  const hues = SECTOR_HUES[mode];
  return hues[index % hues.length] as string;
}

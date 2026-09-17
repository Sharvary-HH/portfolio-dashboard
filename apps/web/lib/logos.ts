const COMPANY_SITES: Record<string, string> = {
  'hdfc-bank': 'hdfcbank.com',
  'bajaj-finance': 'bajajfinserv.in',
  'icici-bank': 'icicibank.com',
  'bajaj-housing': 'bajajhousingfinance.in',
  'affle-india': 'affle.com',
  'lti-mindtree': 'ltimindtree.com',
  'kpit-tech': 'kpit.com',
  'tata-tech': 'tatatechnologies.com',
  'bls-e-services': 'blseservices.com',
  tanla: 'tanla.com',
  dmart: 'dmart.in',
  'tata-consumer': 'tataconsumer.com',
  pidilite: 'pidilite.com',
  'tata-power': 'tatapower.com',
  'kpi-green': 'kpigreenenergy.com',
  suzlon: 'suzlon.com',
  gensol: 'gensol.in',
  'hariom-pipes': 'hariompipes.com',
  astral: 'astralpipes.com',
  polycab: 'polycab.com',
  'clean-science': 'cleanscience.co.in',
  'deepak-nitrite': 'godeepak.com',
  'fine-organic': 'fineorganics.com',
  gravita: 'gravitaindia.com',
  'sbi-life': 'sbilife.co.in',
};

export function logoSources(holdingId: string): string[] {
  const domain = COMPANY_SITES[holdingId];
  if (!domain) return [];

  return [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
}

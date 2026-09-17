import { Dashboard } from '@/components/dashboard/Dashboard';
import { fetchInitialPortfolio } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const initialData = await fetchInitialPortfolio();
  return <Dashboard initialData={initialData} />;
}

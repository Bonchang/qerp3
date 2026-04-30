import { InstrumentDetailWorkspace } from '@/components/instrument-detail-workspace';

export default async function InstrumentDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;

  return <InstrumentDetailWorkspace symbol={symbol} />;
}

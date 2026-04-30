export function getInstrumentDetailHref(symbol: string | null | undefined): string | null {
  const normalizedSymbol = symbol?.trim().toUpperCase() ?? '';

  if (!normalizedSymbol) {
    return null;
  }

  return `/instruments/${encodeURIComponent(normalizedSymbol)}`;
}
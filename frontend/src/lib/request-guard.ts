export interface SymbolRequestToken {
  requestId: number;
  symbol: string;
}

export interface SymbolRequestGuard {
  begin: (symbol: string) => SymbolRequestToken;
  reset: () => void;
  isCurrent: (token: SymbolRequestToken) => boolean;
}

export function createSymbolRequestGuard(): SymbolRequestGuard {
  let currentRequestId = 0;
  let currentSymbol = '';

  return {
    begin(symbol) {
      currentRequestId += 1;
      currentSymbol = symbol;

      return {
        requestId: currentRequestId,
        symbol,
      };
    },
    reset() {
      currentRequestId += 1;
      currentSymbol = '';
    },
    isCurrent(token) {
      return token.requestId === currentRequestId && token.symbol === currentSymbol;
    },
  };
}

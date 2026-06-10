export type TokenDetails = {
  contract: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logo: string;
  balance: string;
  coinKey: string;
  price: number | null;
  balanceSlot?: number;
  allowanceSlot?: number;
  verified?: boolean;
  permit?: {
    eip2612?: {
      supported: boolean;
    };
    permit2?: {
      supported: boolean;
    };
  };
};

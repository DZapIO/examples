import {
  DZapClient,
  HexString,
  TradeBuildTxnRequestData,
  TradeQuotesRequest,
  TradeQuotesResponse,
} from "@dzapio/sdk";

/** Viem wallet client or ethers Signer accepted by the DZap SDK. */
export type DZapSigner = Parameters<
  ReturnType<typeof DZapClient.getInstance>["sign"]
>[0]["signer"];

/** Input for quoting and executing a swap or cross-chain bridge. */
export type TradeParams = {
  fromChain: number;
  toChain: number;
  srcToken: HexString;
  destToken: HexString;
  amount: string;
  slippage: number;
  account: HexString;
  srcDecimals?: number;
  destDecimals?: number;
};

/** Trade leg without protocol — protocol is attached after quoting. */
export type TradeRequestData = Omit<TradeBuildTxnRequestData, "protocol">;

/** Best quote for the recommended provider on a token pair. */
export type SelectedTradeQuote = NonNullable<
  NonNullable<TradeQuotesResponse[string]["quoteRates"]>[string]
>;

export type QuoteResult = {
  quote: SelectedTradeQuote;
  protocol: string;
};

/** Optional filters passed through to `getTradeQuotes`. */
export type TradeQuoteOptions = Pick<
  TradeQuotesRequest,
  "dexes" | "bridges" | "filter" | "gasless"
>;

/** How the user authorizes the source token before a gas-backed trade. */
export type TradeApprovalMode = "default" | "permit2";

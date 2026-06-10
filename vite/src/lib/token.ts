import { type TokenInfo } from "@dzapio/sdk";
import { zeroAddress } from "viem";
import { TokenDetails } from "../types/token";
import { dZap } from "./client";

export async function fetchUserBalances(
  chainId: number,
  account: string
): Promise<TokenInfo[]> {
  const response = await dZap.getBalances(chainId, account);
  return Object.values(response).filter((token) => BigInt(token.balance) > 0n);
}

export async function fetchChainTokens(
  chainId: number,
  account?: string
): Promise<TokenInfo[]> {
  const response = await dZap.getAllTokens(chainId, undefined, account);
  return Object.values(response as Record<string, TokenInfo>);
}

export const fetchTokenDetails = async (
  tokenAddress: string,
  chainId: number
): Promise<TokenDetails> => {
  const response = await fetch(
    `https://staging.dzap.io/v1/token/details?tokenAddress=${tokenAddress}&chainId=${chainId}`
  );
  const data = await response.json();
  return data;
};

export const isGaslessSupportedToken = async (
  tokenAddress: string,
  chainId: number
): Promise<boolean> => {
  // native token does not support gasless
  if (tokenAddress === zeroAddress) return false;

  const tokenDetails = await fetchTokenDetails(tokenAddress, chainId);

  return Boolean(
    tokenDetails &&
      Number.isInteger(tokenDetails.allowanceSlot) &&
      tokenDetails.verified &&
      tokenDetails.permit?.eip2612?.supported
  );
};

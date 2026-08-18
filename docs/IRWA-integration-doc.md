# DZap Zap In — Integration Guide for IncomRWA

This guide describes how to integrate DZap's **Zap In** so your users can deposit
**any token** — held on Base or on another chain — directly into an **IncomRWA
reward vault** in a single transaction. DZap handles the swap and, where needed,
the bridge, and deposits the resulting position into the vault for you.

The guide targets the DZap SDK **`@dzapio/sdk@2.0.39`**.

---

## What you need to know up front

- **Vaults live on Base only** (`chainId 8453`). The zap **destination** chain is
  therefore always Base. The **source** token may be on Base (a same-chain zap)
  or on any other supported chain (a cross-chain zap into the Base vault).
- **A vault is the zap destination.** Each IncomRWA vault is registered with DZap
  as a zap pool under the provider id **`incomrwa`**. The `destToken` of every
  zap-in request is simply the vault address.
- **Source token authorization uses Permit2.** Before a zap moves an ERC-20, the
  user grants a Permit2 allowance (once) and signs a `PermitSingle`. Native
  source assets (ETH) skip both steps.
- **No API key is required** for the zap methods used here. You call them
  directly on the SDK client.

The IncomRWA vaults DZap supports on Base:

```ts
// chainIds.base === 8453
export const incomRwaVaults: { [chainId: number]: HexString[] } = {
  8453: [
    "0x775D5061C477B1564f2d957C4791bcC089F3D0D7", // 7 Day Pool
    "0xeaC3106ea514393F4F2dc0f3829826aEf809f097", // 7 Day Pool
    "0xe0367F9CC855dE4Be02AD554a5f9D3758BB16c8A", // IncomRWA 7 Days Reward Pool
    "0x456fbb766BDCf2612602Cc15b9EECfcBA83520a5", // IncomRWA 30 Days Reward Pool
    "0x6B025e8F3A76573D9D411Be4B12E2c6BBd56f75f", // 30 Day Pool
    "0xC815dF321CA6079B76A563e313462781c0396822", // 45 Day Pool
    "0x18B3be6313673336A48D3a9f4522AA62CDC5a34f", // 60 Day Pool
    "0x5C1BeAc829aAB316A6Cd3690f756f83a05dA31ED", // 90 Day Pool
    "0x9e39337907553d2408009EF1C164FfA783Da721c", // 90 Day Pool
    "0x7Ff696989129B25f291758b67081D54f9C86622C", // 120 Day Pool
    "0x66581Ebda13F1a3444A42551aC63e142Ba3FDe31", // 90 Summer Day Pool
    "0x40b834CA8E2E233F07AC0a7aAaC5CdC6EB550fCd", // 120 Day Pool #2
  ],
};
```

---

## The flow at a glance

```
1. QUOTE (read-only)
   getZapQuote(request)  →  show the user what they will receive

2. EXECUTE (wallet-signed, on the SOURCE chain)
   getAllowance(Permit2)  →  approve(Permit2) if needed
   sign(PermitSingle)     →  permitData
   buildZapTxn({ ...request, permitData })  →  steps
   zap({ request, steps, signer })          →  txnHash

3. TRACK (read-only, important for cross-chain)
   getZapTxnStatus({ chainId: srcChainId, txnHash })  →  PENDING / COMPLETED / ...
```

The entire route executes from a **single user transaction** on the source chain.

---

## 1. Set up the SDK client

Install the SDK alongside `viem` (the SDK is signer-agnostic and works with a
viem `WalletClient` or an ethers v5 `Signer`):

```bash
pnpm add @dzapio/sdk@2.0.39 viem
```

`DZapClient.getInstance()` returns a process-wide singleton. The only argument
that matters for zaps is an optional map of fallback RPC URLs per chain, which
improves the reliability of on-chain reads such as allowance lookups and
balances:

```ts
import { DZapClient } from "@dzapio/sdk";
import { base } from "viem/chains";

export const dZap = DZapClient.getInstance(undefined, {
  // Base is required. Add any chains you accept as zap sources.
  [base.id]: ["https://mainnet.base.org"],
});
```

You are responsible for connecting the user's wallet and producing a signer. The
only hard requirement from DZap's side is that, at execution time, the signer is
connected to the **source chain** of the zap (the chain the source token lives
on). If you need a reference for wallet connection and signer setup, see DZap's
example repository: https://github.com/DZapIO/examples

---

## 2. Build the request

A zap-in is described by a single request object. You construct it directly from
the user's selection — the vault address (from your `incomRwaVaults` list) as the
`destToken`, the source token and amount as chosen by the user. The same object
is used for the quote and for execution.

To populate the user's "pay with" options, you can list their balances on the
source chain with `dZap.getBalances(chainId, account)`. The native asset is
represented by the zero address.

```ts
import type { HexString } from "@dzapio/sdk";

const request = {
  srcChainId, // chain the source token is on (8453 for same-chain)
  srcToken, // source token address (zero address = native ETH)
  amount, // source amount, in the token's smallest unit (wei)

  destChainId: 8453, // Base — the vault chain
  destToken: vaultAddress, // the IncomRWA vault address

  account, // the connected user
  recipient: account, // who receives the vault position
  refundee: account, // who receives any dust / refund
  slippage: 1, // percent (1 = 1%)
};
```

Field reference (`ZapBuildTxnRequest`):

```ts
type ZapBuildTxnRequest = {
  srcChainId: number; // source chain
  srcToken: string; // source token (zero address = native)
  amount?: string; // source amount in smallest unit
  destChainId: number; // 8453 (Base)
  destToken: string; // IncomRWA vault address
  account: string; // connected user
  recipient: string; // receives the vault position
  refundee: string; // receives dust / refunds
  slippage: number; // percent, e.g. 1
  permitData?: string; // Permit2 signature (added before execution)
  integrator?: { id: string; feeBps: number; wallet: string };
  allowedBridges?: string[];
  allowedDexes?: string[];
};
```

---

## 3. Get a quote

Pass the request straight to `getZapQuote`. This is read-only — no wallet
interaction — so call it whenever the user's input changes and show them the
expected result before they commit.

```ts
import type { ZapQuoteResponse } from "@dzapio/sdk";

const quote: ZapQuoteResponse = await dZap.getZapQuote(request);
```

```ts
type ZapQuoteResponse = {
  output: { asset; amount; amountUSD; minAmount }[]; // what the user receives
  dust: { asset; amount; amountUSD; minAmount }[]; // leftover returned to refundee
  approvalData: { callTo; approveTo; amount }[];
  path: ZapPath[]; // route breakdown (swap / bridge / deposit)
};
```

`amount` values are in the output token's smallest unit — format with viem's
`formatUnits(amount, asset.decimals)` for display.

---

## 4. Execute the zap

Execution is the only part that prompts the wallet, and it all happens on the
**source chain**. Make sure the signer is connected to `request.srcChainId`
before you start.

The sequence is: ensure a Permit2 allowance → sign a `PermitSingle` → build the
route → execute it. Native source assets skip the allowance and signature.

```ts
import {
  ApprovalModes,
  HexString,
  PermitTypes,
  Services,
  TxnStatus,
} from "@dzapio/sdk";
import { type WalletClient, zeroAddress } from "viem";
import type { Signer as EthersSigner } from "ethers";

// viem WalletClient or ethers v5 Signer, connected to request.srcChainId
type Signer = WalletClient | EthersSigner;

const isNativeSource = (req: typeof request) => req.srcToken === zeroAddress;

export async function executeZap(signer: Signer, req: typeof request) {
  let permitData: HexString | undefined;

  if (!isNativeSource(req)) {
    const tokens = [
      { address: req.srcToken as HexString, amount: req.amount! },
    ];

    // 1. Ensure a Permit2 allowance, approving once if it is insufficient.
    const { data } = await dZap.getAllowance({
      chainId: req.srcChainId,
      sender: req.account as HexString,
      service: Services.zap,
      tokens,
      mode: ApprovalModes.PermitSingle,
    });

    const current = data[req.srcToken];
    if (!current || current.allowance < BigInt(req.amount!)) {
      const approval = await dZap.approve({
        chainId: req.srcChainId,
        service: Services.zap,
        signer,
        tokens,
        mode: ApprovalModes.PermitSingle,
      });
      if (approval.status !== TxnStatus.success) {
        throw new Error(`Permit2 approval failed (code ${approval.code})`);
      }
    }

    // 2. Sign a Permit2 PermitSingle and capture the encoded permit data.
    const signed = await dZap.sign({
      chainId: req.srcChainId,
      sender: req.account as HexString,
      service: Services.zap,
      signer,
      tokens,
      permitType: PermitTypes.PermitSingle,
    });
    if (signed.status !== TxnStatus.success || !("tokens" in signed)) {
      throw new Error(`Permit2 signature failed (code ${signed.code})`);
    }
    permitData = signed.tokens[0]?.permitData;
    if (!permitData)
      throw new Error("Permit2 signature returned no permit data");
  }

  // 3. Build the executable route, then 4. execute it.
  const fullRequest = { ...req, permitData };
  const route = await dZap.buildZapTxn(fullRequest);
  return dZap.zap({ request: fullRequest, steps: route.steps, signer });
}
```

`zap()` resolves to a success object carrying a `txnHash`, or a failure object
carrying an `error`:

```ts
const result = await executeZap(signer, request);

if (result.status === TxnStatus.success && "txnHash" in result) {
  // result.txnHash — submitted on the source chain
} else {
  // "error" in result — surface to the user; user rejections land here too
}
```

---

## 5. Track the zap (`getZapTxnStatus`)

`zap()` returns as soon as the user's transaction is submitted on the source
chain. What happens next depends on the route:

- **Same-chain (Base → Base):** the swap and the vault deposit happen in that one
  transaction, so the position exists as soon as it confirms.
- **Cross-chain (e.g. Arbitrum → Base):** the source transaction only initiates
  the route. The bridge leg and the final deposit into the vault on Base settle
  **asynchronously**, usually seconds to a few minutes later. The user's funds
  are in flight during this window, so you should track status rather than treat
  submission as completion.

Poll `getZapTxnStatus` with the **source** chain id and the `txnHash` from
`zap()`:

```ts
import type { ZapStatusResponse } from "@dzapio/sdk";

const status: ZapStatusResponse = await dZap.getZapTxnStatus({
  chainId: srcChainId, // the chain the user signed on — not necessarily Base
  txnHash,
});
```

```ts
type ZapStatusResponse = {
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  account: string;
  recipient: string;
  input: { asset; amount; amountUSD }[]; // what went in
  output: { asset; amount; amountUSD }[]; // what the user ultimately received
  steps: ZapStatusStep[]; // per-leg progress (swap / bridge / deposit)
  timestamp: number; // started
  completedAt: number; // settled (0 until done)
};
```

| `status`    | Meaning                                               | Suggested UX                                     |
| ----------- | ----------------------------------------------------- | ------------------------------------------------ |
| `PENDING`   | Route in progress (commonly the bridge leg).          | Keep polling; show an in-progress state.         |
| `COMPLETED` | Vault position credited to `recipient`.               | Show success; render `output`.                   |
| `FAILED`    | Route could not complete.                             | Surface the failure.                             |
| `REFUNDED`  | Funds returned to `refundee` (e.g. far-side failure). | Tell the user they were refunded, not deposited. |

A simple poller that stops on a terminal state:

```ts
async function waitForZap(
  srcChainId: number,
  txnHash: string,
  { intervalMs = 5000, timeoutMs = 600_000 } = {}
): Promise<ZapStatusResponse> {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const status = await dZap.getZapTxnStatus({ chainId: srcChainId, txnHash });
    if (status.status !== "PENDING") return status;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
```

Because you may accept cross-chain sources, we recommend always routing the
post-submit experience through `getZapTxnStatus` keyed on
`(srcChainId, txnHash)`. For same-chain zaps the first poll typically already
returns `COMPLETED`, so a single code path covers both.

---

## 6. Integrator fee (optional)

If IncomRWA wants to take a fee on top of zaps, set the optional `integrator`
field on the request. Coordinate the `id` and `feeBps` with the DZap team.

```ts
const request = {
  // ...request fields...
  integrator: {
    id: "incomrwa", // your integrator id
    feeBps: 20, // e.g. 20 bps = 0.20%
    wallet: IRWA_FEE_WALLET, // address that receives the fee
  },
};
```

---

## 7. SDK methods used

All methods are called on the `DZapClient` singleton.

| Method                                                           | Purpose                              | Wallet?         |
| ---------------------------------------------------------------- | ------------------------------------ | --------------- |
| `getBalances(chainId, account)`                                  | source-token balances                | no              |
| `getZapQuote(request)`                                           | expected output / route preview      | no              |
| `getAllowance({ chainId, sender, tokens, service, mode })`       | read Permit2 allowance               | no              |
| `approve({ chainId, signer, tokens, service, mode })`            | set Permit2 allowance                | yes             |
| `sign({ chainId, sender, signer, tokens, service, permitType })` | sign `PermitSingle` → `permitData`   | yes (off-chain) |
| `buildZapTxn(request)`                                           | build the executable route (`steps`) | no              |
| `zap({ request, steps, signer })`                                | execute the route → `txnHash`        | yes             |
| `getZapTxnStatus({ chainId, txnHash })`                          | track a submitted zap                | no              |

Enums: `Services.zap`, `ApprovalModes.PermitSingle`, `PermitTypes.PermitSingle`,
`TxnStatus.success`.

---

## 8. Notes and edge cases

- **Be on the source chain at execution.** The allowance, the Permit2 signature,
  and the zap transaction all happen on `request.srcChainId`. Switch the signer
  there before calling `executeZap`.
- **Native source token.** When `srcToken` is the zero address (or `amount` is
  empty) the approve and sign steps are skipped — the value is sent with the zap
  transaction. Do not attempt Permit2 on native assets.
- **`amount` is in the smallest unit (wei)**, not a decimal string. Convert from
  user input with viem's `parseUnits(input, token.decimals)`.
- **Slippage** is a percent number (e.g. `1` = 1%). Cross-chain and swap legs can
  move; expose a sensible default and let users adjust.
- **Dust / refunds.** Any leftover input is returned to `refundee`. `quote.dust`
  shows what to expect — display it so the user isn't surprised.
- **User rejection.** `approve`, `sign`, and `zap` return a non-`success`
  `TxnStatus` (or throw) when the user rejects. Treat these as recoverable and
  allow a retry.
- **Allowlist as the source of truth.** If the set of supported vaults changes,
  keep your `incomRwaVaults` allowlist as the authority for what you surface, and
  reconcile periodically with us.

---

For anything not covered here — additional vaults, integrator fees, or questions
on any endpoint — reach out to the DZap team.

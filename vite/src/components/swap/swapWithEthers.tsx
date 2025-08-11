import { ApprovalModes, DZapClient, Services } from "@dzapio/sdk";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { useState } from "react";
const dZap = DZapClient.getInstance();

const SwapWithEthers = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");

  const swapTokens = async () => {
    setIsLoading(true);
    setStatus("Initializing swap...");

    // we recommend using viem, example available in src/components/swap/swapWithViem.tsx
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const userAddress = await signer.getAddress();
    console.log(userAddress);

    try {
      setStatus("Getting quote...");

      // 1. Get quote
      const quote = await dZap.getTradeQuotes({
        integratorId: "dzap",
        fromChain: 8453,
        data: [
          {
            amount: "4547751223259",
            srcToken: "0x4200000000000000000000000000000000000006",
            srcDecimals: 18,
            destToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            destDecimals: 6,
            toChain: 8453,
            slippage: 2,
          },
        ],
        account: userAddress,
      });

      // Get the best route
      const pairKey = Object.keys(quote)[0];
      const recommendedSource = quote[pairKey].recommendedSource;
      const bestQuote = quote[pairKey].quoteRates[recommendedSource];

      console.log("Quote received:", bestQuote);
      setStatus("Quote received, checking allowance...");

      // 2. Check if approval is needed
      const allowanceCheck = await dZap.getAllowance({
        chainId: 8453,
        sender: userAddress,
        tokens: [
          {
            address: "0x4200000000000000000000000000000000000006",
            amount: BigInt("4547751223259"),
          },
        ],
        service: Services.trade,
        mode: ApprovalModes.Default,
      });

      const tokenApprovalData =
        allowanceCheck.data["0x4200000000000000000000000000000000000006"];

      console.log(allowanceCheck.data);

      // 3. Approve if needed
      if (tokenApprovalData.approvalNeeded) {
        setStatus("Approval required, requesting approval...");
        await dZap.approve({
          chainId: 8453,
          signer,
          tokens: [
            {
              address: "0x4200000000000000000000000000000000000006",
              amount: BigInt("4547751223259"),
            },
          ],
          service: Services.trade,
          mode: ApprovalModes.Default,
        });
      }

      setStatus("Executing trade...");

      // 5. Execute transaction
      const result = await dZap.trade({
        request: {
          integratorId: "dzap",
          fromChain: 8453,
          sender: userAddress,
          refundee: userAddress,
          data: [
            {
              amount: bestQuote.srcAmount,
              srcToken: bestQuote.srcToken.address,
              srcDecimals: bestQuote.srcToken.decimals,
              destToken: bestQuote.destToken.address,
              destDecimals: bestQuote.destToken.decimals,
              toChain: 8453,
              selectedRoute: recommendedSource,
              recipient: userAddress,
              slippage: 2,
            },
          ],
        },
        signer,
      });

      if (result.status === "success" && result.txnHash) {
        console.log("Transaction successful:", result.txnHash);
        setStatus(`Transaction successful: ${result.txnHash}`);
      } else {
        console.error("Transaction failed:", result.error);
        setStatus(`Transaction failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Transaction failed:", error);
      // setStatus(`Transaction failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // header with connect button
    <>
      <div className="flex items-center justify-center bg-gray-100">
        <ConnectButton />
      </div>
      <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          DZap Token Swap
        </h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Swap WETH to USDC on Base Chain
          </p>
        </div>

        <button
          onClick={swapTokens}
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
          }`}
        >
          {isLoading ? "Processing..." : "Execute Swap"}
        </button>

        {status && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50 border">
            <p className="text-sm text-gray-700 break-words">{status}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default SwapWithEthers;

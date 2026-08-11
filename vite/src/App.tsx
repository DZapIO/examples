import { useState } from "react";
import Borrow from "./components/borrow";
import Gasless from "./components/trade-gasless-viem";
import TradeGasEthers from "./components/trade-gas-ethers";
import TradeGasViem from "./components/trade-gas-viem";
import ZapIn from "./components/zap-in";
import ZapOut from "./components/zap-out";

type Page =
  | "gasless"
  | "trade-gas-viem"
  | "trade-gas-ethers"
  | "zap-in"
  | "zap-out"
  | "borrow";

const PAGES: { id: Page; label: string }[] = [
  { id: "gasless", label: "Trade Gasless" },
  { id: "trade-gas-viem", label: "Trade Gas" },
  { id: "zap-in", label: "Zap In" },
  { id: "zap-out", label: "Zap Out" },
  { id: "borrow", label: "Borrow" },
];

const App = () => {
  const [page, setPage] = useState<Page>("gasless");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-wrap gap-2 justify-center">
          {PAGES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPage(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                page === id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="py-6">
        {page === "gasless" && <Gasless />}
        {page === "trade-gas-viem" && <TradeGasViem />}
        {page === "trade-gas-ethers" && <TradeGasEthers />}
        {page === "zap-in" && <ZapIn />}
        {page === "zap-out" && <ZapOut />}
        {page === "borrow" && <Borrow />}
      </main>
    </div>
  );
};

export default App;

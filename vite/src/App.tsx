import { useState } from "react";
import Gasless from "./components/trade-gasless-viem";
import TradeGasEthers from "./components/trade-gas-ethers";
import TradeGasViem from "./components/trade-gas-viem";

type Page = "gasless" | "trade-gas-viem" | "trade-gas-ethers";

const PAGES: { id: Page; label: string }[] = [
  { id: "gasless", label: "Gasless" },
  { id: "trade-gas-viem", label: "Trade Gas (Viem)" },
  { id: "trade-gas-ethers", label: "Trade Gas (Ethers)" },
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
      </main>
    </div>
  );
};

export default App;

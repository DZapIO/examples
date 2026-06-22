import { getChainLogo } from "../../lib/chainMeta";
import Avatar from "./Avatar";

type ChainIconRowProps = {
  chains: readonly { id: number; name: string }[];
  selectedChainId: number;
  onSelect: (chainId: number) => void;
};

/** Row of chain logos with the chain name beneath each (the chain switcher). */
const ChainIconRow = ({
  chains,
  selectedChainId,
  onSelect,
}: ChainIconRowProps) => (
  <div className="flex gap-1 overflow-x-auto pb-1 pt-3">
    {chains.map((chain) => {
      const selected = chain.id === selectedChainId;
      return (
        <button
          key={chain.id}
          type="button"
          onClick={() => onSelect(chain.id)}
          aria-pressed={selected}
          className="flex w-16 shrink-0 flex-col items-center gap-1.5 focus:outline-none"
        >
          <span
            className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition ${
              selected ? "border-blue-600" : "border-transparent"
            }`}
          >
            <span className="absolute -top-2 z-10 rounded-full bg-emerald-100 px-1.5 text-[9px] font-semibold leading-4 text-emerald-700">
              Zap
            </span>
            <Avatar
              src={getChainLogo(chain.id)}
              alt={chain.name}
              size={40}
            />
          </span>
          <span
            className={`text-center text-[11px] leading-tight transition-colors ${
              selected ? "font-semibold text-gray-900" : "text-gray-500"
            }`}
          >
            {chain.name}
          </span>
        </button>
      );
    })}
  </div>
);

export default ChainIconRow;

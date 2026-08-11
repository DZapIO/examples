import type { useBorrowSelection } from "../../hooks/useBorrowSelection";
import { SUPPORTED_CHAINS } from "../../lib/chains";

type BorrowFormProps = {
  selection: ReturnType<typeof useBorrowSelection>;
  disabled?: boolean;
};

const fieldLabelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500";
const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800";

/** Collateral position (+ amount to withdraw) and the asset to borrow against it. */
const BorrowForm = ({ selection, disabled = false }: BorrowFormProps) => (
  <fieldset className="space-y-4" disabled={disabled}>
    <div>
      <label className={fieldLabelClass} htmlFor="borrow-chain">
        Chain
      </label>
      <select
        id="borrow-chain"
        className={inputClass}
        value={selection.chainId}
        onChange={(event) => selection.setChainId(Number(event.target.value))}
      >
        {SUPPORTED_CHAINS.map((chain) => (
          <option key={chain.id} value={chain.id}>
            {chain.name}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className={fieldLabelClass} htmlFor="collateral-token">
        Collateral position (e.g. Aave aToken address)
      </label>
      <input
        id="collateral-token"
        type="text"
        placeholder="0x..."
        value={selection.collateralToken}
        onChange={(event) => selection.setCollateralToken(event.target.value)}
        className={inputClass}
      />
    </div>

    <div>
      <label className={fieldLabelClass} htmlFor="collateral-amount">
        Amount to withdraw (smallest unit)
      </label>
      <input
        id="collateral-amount"
        type="text"
        inputMode="numeric"
        placeholder="1000000000000000000"
        value={selection.collateralAmount}
        onChange={(event) => selection.setCollateralAmount(event.target.value)}
        className={inputClass}
      />
    </div>

    <div>
      <label className={fieldLabelClass} htmlFor="borrow-token">
        Asset to borrow
      </label>
      <input
        id="borrow-token"
        type="text"
        placeholder="0x..."
        value={selection.borrowToken}
        onChange={(event) => selection.setBorrowToken(event.target.value)}
        className={inputClass}
      />
    </div>
  </fieldset>
);

export default BorrowForm;

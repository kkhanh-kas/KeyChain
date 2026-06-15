// Map raw ethers / contract-revert errors to short, human-readable messages.
// ethers v6 decodes known custom errors into `err.revert.name`; wallet
// rejections and gas shortfalls come through as `err.code`.

interface EthersError {
  code?: string;
  shortMessage?: string;
  reason?: string;
  revert?: { name?: string };
  message?: string;
}

export function friendlyError(err: unknown): string {
  const e = (err ?? {}) as EthersError;

  if (e.code === "ACTION_REJECTED") return "Transaction rejected in your wallet.";
  if (e.code === "INSUFFICIENT_FUNDS") return "Not enough ETH to cover gas.";

  switch (e.revert?.name) {
    case "ERC20InsufficientBalance":
      return "Not enough KEY — buy more KEY first.";
    case "ERC20InsufficientAllowance":
      return "KEY allowance too low — approve and try again.";
    case "AccessControlUnauthorizedAccount":
      return "This wallet isn't allowed to do that.";
  }

  return e.shortMessage || e.reason || e.message || "Something went wrong.";
}

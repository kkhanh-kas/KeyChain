// Generates a deterministic-ish hardware fingerprint on the client, sent to
// ActivationContract.activateLicense() to bind a license to a machine.
// Generation is off-chain (client); storage + verification are on-chain. A
// production DRM system would use native OS APIs — here we use browser signals
// for a stable-enough fingerprint. [De Alwis et al., 2023] — nonce-based
// activation verification.

export async function generateMachineHash(): Promise<string> {
  const signals = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency?.toString() ?? "unknown",
  ];

  const raw = signals.join("|");
  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return "0x" + hashHex;
}

/**
 * Machine Hash Generation
 *
 * Generates a deterministic-ish hardware fingerprint on the client side.
 * This hash is sent to ActivationContract.activateLicense() to bind
 * a license to a specific machine.
 *
 * On-chain / Off-chain boundary:
 *   - machineHash generation: OFF-CHAIN (client)
 *   - machineHash storage + verification: ON-CHAIN (ActivationContract)
 *
 * In a production DRM system this would use native OS APIs.
 * For this research prototype, we use browser-available signals
 * to produce a stable-enough fingerprint for demo purposes.
 *
 * [De Alwis et al., 2023] - nonce-based activation verification
 */

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

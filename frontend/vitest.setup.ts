// jsdom lacks WebCrypto's subtle API that machineHash relies on; back it with
// Node's implementation so crypto.subtle.digest works under test.
import { webcrypto } from "node:crypto";

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

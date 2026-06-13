// Client helpers for uploading to IPFS via the server-side /api/pinata route.
// The Pinata JWT stays on the server; the browser only ever talks to our own
// route, which returns the resulting ipfs:// URI.

// Upload a cover image and return its ipfs:// URI.
export async function uploadFile(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  return post(body);
}

// Upload a metadata object as JSON and return its ipfs:// URI.
export async function uploadJson(data: object): Promise<string> {
  const body = new FormData();
  body.append("json", JSON.stringify(data));
  return post(body);
}

async function post(body: FormData): Promise<string> {
  const res = await fetch("/api/pinata", { method: "POST", body });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "IPFS upload failed");
  return data.uri as string;
}

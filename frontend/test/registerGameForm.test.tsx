import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ToastProvider } from "@/providers/ToastProvider";
import { parseKey } from "@/lib/format";

const { uploadFileMock, uploadJsonMock } = vi.hoisted(() => ({
  uploadFileMock: vi.fn(),
  uploadJsonMock: vi.fn(),
}));

vi.mock("@/lib/pinata", () => ({
  uploadFile: uploadFileMock,
  uploadJson: uploadJsonMock,
}));

vi.mock("@/providers/WalletProvider", () => ({
  useWallet: () => ({ address: "0xVendor" }),
}));

import { RegisterGameForm } from "@/components/vendor/RegisterGameForm";

function renderForm(onSubmit: (...args: unknown[]) => Promise<unknown>) {
  render(
    <ToastProvider>
      <RegisterGameForm onSubmit={onSubmit} pending={false} />
    </ToastProvider>
  );
}

function fill() {
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Celadon Drift" } });
  fireEvent.change(screen.getByLabelText("Price (KEY)"), { target: { value: "300" } });
  fireEvent.change(screen.getByLabelText("Royalty (%)"), { target: { value: "5" } });
  fireEvent.change(screen.getByLabelText("Genre"), { target: { value: "Racing" } });
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: "A quiet racer." } });
  const file = new File(["x"], "cover.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Cover image"), { target: { files: [file] } });
  return file;
}

beforeEach(() => {
  uploadFileMock.mockReset();
  uploadJsonMock.mockReset();
});

afterEach(cleanup);

describe("RegisterGameForm upload flow", () => {
  it("uploads the cover, builds metadata, and submits the metadata uri", async () => {
    uploadFileMock.mockResolvedValue("ipfs://bafyCover");
    uploadJsonMock.mockResolvedValue("ipfs://bafyMeta");
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(onSubmit);

    const file = fill();
    fireEvent.click(screen.getByRole("button", { name: /register game/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());

    expect(uploadFileMock).toHaveBeenCalledWith(file);
    expect(uploadJsonMock).toHaveBeenCalledWith({
      name: "Celadon Drift",
      description: "A quiet racer.",
      image: "ipfs://bafyCover",
      attributes: { genre: "Racing", vendor: "0xVendor", royaltyBps: 500 },
    });
    expect(onSubmit).toHaveBeenCalledWith("Celadon Drift", parseKey("300"), 500, "ipfs://bafyMeta");
  });

  it("surfaces an error toast and does not submit when the upload fails", async () => {
    uploadFileMock.mockRejectedValue(new Error("PINATA_JWT not configured"));
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    fill();
    fireEvent.click(screen.getByRole("button", { name: /register game/i }));

    expect(await screen.findByText("PINATA_JWT not configured")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

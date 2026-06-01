# KeyChain — Deploy Pipeline

## Tổng quan kiến trúc contract

```
KeyCoin (ERC-20)
    └─► GameStore (primary market)
            └─► GameToken (ERC-1155 license NFT)
                    └─► ActivationContract
                    └─► Marketplace (secondary market)
        └─► GamePass (subscription)
```

**6 contracts, thứ tự deploy phụ thuộc nghiêm ngặt** — deploy sai thứ tự sẽ fail constructor.

---

## Bước 1 — Chuẩn bị keys (3 keys cần thiết)

| Key | Nguồn | Dùng để |
|-----|-------|---------|
| `ALCHEMY_API_KEY` | dashboard.alchemy.com | RPC endpoint Sepolia |
| `DEPLOYER_PRIVATE_KEY` | MetaMask export | Ký transaction deploy |
| `ETHERSCAN_API_KEY` | etherscan.io/myapikey | Verify source code on-chain |

Xem hướng dẫn chi tiết trong `blockchain/.env.template`.

```bash
cd blockchain
cp .env.template .env
# Điền 3 keys vào .env
```

---

## Bước 2 — Cài dependencies & compile

```bash
cd blockchain
npm install
npm run compile
# → artifacts/ và typechain-types/ được tạo ra
```

Kiểm tra compile thành công:
```bash
ls artifacts/contracts/
# phải thấy: KeyCoin.sol  GameToken.sol  GameStore.sol
#            ActivationContract.sol  Marketplace.sol  GamePass.sol
```

---

## Bước 3 — Test local trước khi deploy Sepolia

```bash
# Chạy toàn bộ test suite
npm run test

# Xem gas cost ước tính
npm run test -- --reporter gas

# Deploy thử local (không tốn ETH)
npm run deploy:local
```

---

## Bước 4 — Deploy lên Sepolia

```bash
npm run deploy:sepolia
```

Output mẫu:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  KeyChain deploy  |  network: sepolia
  Deployer         |  0xYourAddress...
  Balance          |  0.08 ETH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  KeyCoin             → 0xAaaa...
✅  GameToken           → 0xBbbb...
✅  GameStore           → 0xCccc...
✅  ActivationContract  → 0xDddd...
✅  Marketplace         → 0xEeee...
✅  GamePass            → 0xFfff...

🔧  Wiring roles…
✅  MINTER_ROLE → GameStore

📄  Addresses saved → deployments/sepolia.json
```

Addresses tự động lưu vào `blockchain/deployments/sepolia.json`.

---

## Bước 5 — Copy ABI sang Frontend

```bash
npm run copy-abi
# Script: blockchain/scripts/copy-abi.sh
# → Copy artifacts JSON vào frontend/src/abi/
```

Sau đó uncomment ABI imports trong `frontend/src/lib/contracts.ts`.

---

## Bước 6 — Cấu hình Frontend

Tạo `frontend/.env.local` từ output của deploy:

```env
NEXT_PUBLIC_ALCHEMY_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

NEXT_PUBLIC_KEYCOIN_ADDRESS=0x...
NEXT_PUBLIC_GAMETOKEN_ADDRESS=0x...
NEXT_PUBLIC_GAMESTORE_ADDRESS=0x...
NEXT_PUBLIC_ACTIVATION_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_GAMEPASS_ADDRESS=0x...
```

> Deploy script tự in sẵn đoạn này — chỉ cần copy-paste.

---

## Bước 7 — Verify contracts trên Etherscan (tùy chọn nhưng nên làm)

```bash
npm run verify
```

Sau khi verify, người dùng có thể đọc/gọi contract trực tiếp trên
`https://sepolia.etherscan.io/address/0x...#code`.

---

## Bước 8 — Seed data (demo)

```bash
# Grant VENDOR_ROLE cho một địa chỉ, đăng ký vài game mẫu
npm run setup-roles
npm run seed
```

---

## Checklist trước deploy

- [ ] `npm run test` pass 100%
- [ ] `.env` có đủ 3 keys
- [ ] Deployer wallet có ≥ 0.05 ETH Sepolia
- [ ] `npm run compile` không có warning
- [ ] Review `KEYCOIN_RATE` trong `deploy.ts` phù hợp tokenomics

---

## Lưu ý bảo mật

- **Không commit `.env`** — đã có trong `.gitignore`
- Dùng ví riêng cho deploy testnet, **không dùng ví chứa tài sản thật**
- Trước mainnet: chuyển `DEFAULT_ADMIN_ROLE` sang multisig (Gnosis Safe),
  revoke quyền admin của deployer wallet

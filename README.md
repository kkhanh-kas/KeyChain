# KeyChain - BẢNG PHÂN CÔNG VÀ TIMELINE
**Hạn nộp: 18/06/2026 | Bắt đầu: 28/05/2026**

---

## Tổng Quan Phân Công

| Người | Vai trò | Code | Report |
|---|---|---|---|
| **Uyên Khánh** | Smart Contracts + Frontend + Backend | 6 smart contracts, toàn bộ frontend, API routes, **deploy lên Sepolia** | Chương 5.4, 5.5, 5.2 |
| **Công Danh** | Unit Tests (Core) | Tests: KeyCoin, GameToken, GameStore | Chương 2.3, Chương 6.1.1 (3 contracts) |
| **Tấn Phát** | Unit Tests (Advanced) | Tests: ActivationContract, Marketplace, GamePass | Chương 4.2, 4.3, Chương 6.1.1 (3 contracts), 6.3 |
| **Phước Tình** | Integration Tests + DevOps | Integration tests (3 kịch bản), deploy scripts. **Deploy Sepolia do Uyên Khánh chạy** → Phước Tình chỉ pull về test E2E + chụp screenshots | Chương 5.1, 5.3, 6.1.2, 6.2 |
| **Mỹ Khánh** | Research + System Analysis | Không | Chương 1, 2, 3 |
| **Hoài Nam** | Design + Evaluation + Review | Không | Chương 4, 5.2, 6.4, 7 |
---



## Chi Tiết Từng Người


### Uyên Khánh: Smart Contracts + Frontend + Backend

**Code**

| Hạng mục | File | Ưu tiên |
|---|---|---|
| KeyCoin.sol | ERC-20, buyKeyCoin, setRate, withdraw | 🔴 Đầu tiên |
| GameToken.sol | ERC-1155, ERC-2981, mint, royaltyInfo, uri | 🔴 Đầu tiên |
| GameStore.sol | Catalog, purchaseLicense, RBAC | 🔴 Thứ hai |
| ActivationContract.sol | Hardware hash binding, activate/deactivate | 🟡 Thứ ba |
| Marketplace.sol | List, buy, auto-royalty, activation reset | 🟡 Thứ ba |
| GamePass.sol | Subscribe, renew, expiry check | 🟢 Cuối cùng |
| Frontend (all pages) | Landing, Store, Library, Marketplace, Vendor Portal | 🟡 Song song với contracts |
| API Routes | Pinata upload, IPFS resolver | 🟢 Sau khi có contracts |
| Hooks + Providers | useWallet, useGameStore, useActivation, ... | 🟢 Sau khi contracts xong |
| Deploy + roles | `deploy:sepolia` → `setup-roles` → `seed` → `verify` | 🟢 Cuối, trước demo |

---

### Công Danh: Unit Tests (Core Contracts)

**Code**
- `KeyCoin.test.ts` : buyKeyCoin, setRate, role restrictions, edge cases
- `GameToken.test.ts` : mint, royaltyInfo, uri, role restrictions
- `GameStore.test.ts` : registerGame, purchaseLicense, catalog query
- Mục tiêu: statement coverage ≥ 95%

> Bắt đầu viết ngay sau khi Uyên Khánh commit interface của 3 contracts đầu. Không cần implementation hoàn chỉnh.

---

### Tấn Phát: Unit Tests (Advanced Contracts)

**Code**
- `ActivationContract.test.ts` : activate, deactivate, machineHash binding, ownership verification, double-activation prevention
- `Marketplace.test.ts` : listLicense, buyLicense, royalty distribution, activation reset
- `GamePass.test.ts` : subscribe, renew, expiry, expired renewal
- Mục tiêu: branch coverage ≥ 80%

> Phải test royalty split và state transitions. Cần đọc kỹ Marketplace.sol và ActivationContract.sol.

---

### Phước Tình: Integration Tests + DevOps

**Code**
- `happy-path.test.ts` : ETH → KEY → mua game → activate → xác nhận
- `secondary-market.test.ts` : mua → activate → list → người khác mua → royalty tự động → activation reset
- `game-pass.test.ts` : subscribe → hết hạn → renew
- `deploy.ts`, `setup-roles.ts`, `seed-games.ts`, `verify.ts`, `copy-abi.sh` (scripts đã viết xong)
- **Deploy Sepolia do Uyên Khánh chạy.** Phước Tình: pull code về, trỏ frontend vào địa chỉ đã deploy, test E2E trên trình duyệt + ví thật, chụp screenshots.

> Chạy toàn bộ hệ thống end-to-end. Nhận từ Uyên Khánh: `sepolia.json` (6 địa chỉ) + link Etherscan đã verify + lệnh deploy đã chạy (để viết Chương 5.3/6.2).

---

### Mỹ Khánh: Research + System Analysis

**Code:** Không

**Report**
- Chương 1: Toàn bộ (bối cảnh, lý do chọn đề tài, mục tiêu, phạm vi, cấu trúc báo cáo)
- Chương 2: Toàn bộ (blockchain, Ethereum, smart contract, các chuẩn ERC, RBAC trên blockchain, quản lý bản quyền kỹ thuật số)
- Chương 3: Toàn bộ (mô hình nghiệp vụ, use case diagram, BPMN, customer/vendor/admin journeys, so sánh với giải pháp hiện tại)


---

### Hoài Nam: Review Tổng

**Code:** Không

**Report**
- Chương 4: Toàn bộ (kiến trúc tổng thể, state machine [phối hợp B], RBAC [phối hợp B], thiết kế smart contract, sequence diagrams, thiết kế frontend)
- Chương 5.2: Mô tả 6 smart contracts kèm code snippets minh họa
- Chương 6.4: Đánh giá tổng hợp
- Chương 7: Toàn bộ (kết quả đạt được, hạn chế, hướng phát triển, kết luận)

---

## Timeline 21 Ngày

```
Tuần 1        28/05 (T5) → 01/06 (CN)      Nền tảng
Tuần 2        02/06 (T2) → 08/06 (CN)      Core + Song song
Tuần 3        09/06 (T2) → 15/06 (CN)      Hoàn thiện
Buffer        16/06 (T2) → 18/06 (T4)      Nộp
```

---

### Tuần 1 (28/05 – 01/06): Nền tảng

| Người | Việc cần làm | Deadline nội bộ |
|---|---|---|
| **Uyên Khánh** | Viết KeyCoin.sol + GameToken.sol. Commit interface (function signatures + events) lên repo. Setup Hardhat project. | **31/05** |
| **Công Danh** | Setup test environment. Bắt đầu viết tests cho KeyCoin + GameToken ngay khi F commit interface. | 01/06 |
| **Tấn Phát** | Đọc kỹ outline Chương 4.2 + 4.3. Phác thảo state machine và sơ đồ RBAC. | 01/06 |
| **Phước Tình** | Setup deploy pipeline, viết deploy.ts skeleton, chuẩn bị Alchemy RPC + Etherscan key. | 01/06 |
| **Mỹ Khánh** | Viết draft Chương 1 hoàn chỉnh. Bắt đầu Chương 2.1 + 2.2. | 01/06 |
| **Hoài Nam** | Viết draft Chương 4.1 (kiến trúc tổng thể) dựa trên project structure. Phác thảo sequence diagrams. | 01/06 |

---

### Tuần 2 (02/06 – 08/06): Core + Song song

| Người | Việc cần làm | Deadline nội bộ |
|---|---|---|
| **Uyên Khánh** | Viết GameStore.sol + ActivationContract.sol. Bắt đầu frontend với mock data (Landing, Store, Library pages). | **04/06** |
| **Công Danh** | Hoàn thiện tests KeyCoin + GameToken. Bắt đầu tests GameStore. | 05/06 |
| **Tấn Phát** | Bắt đầu tests ActivationContract khi Khánh commit interface. Viết Chương 4.2 + 4.3. | 05/06 |
| **Phước Tình** | Viết setup-roles.ts + seed-games.ts. Bắt đầu integration test skeleton. | 06/06 |
| **Mỹ Khánh** | Hoàn thiện Chương 2 toàn bộ. Bắt đầu Chương 3. | 05/06 |
| **Hoài Nam** | Hoàn thiện Chương 4. Bắt đầu Chương 5.2 (mô tả contracts). | 05/06 |

---

### Tuần 3 (09/06 – 15/06): Hoàn thiện

| Người | Việc cần làm | Deadline nội bộ |
|---|---|---|
| **Uyên Khánh** | Viết Marketplace.sol + GamePass.sol. Hoàn thiện frontend (Marketplace, Vendor Portal). Swap mock data → real hooks. Viết Pinata API routes. | **09/06** |
| **Công Danh** | Hoàn thiện tất cả unit tests. Chạy coverage report. Viết Chương 2.3 + 6.1.1. | 11/06 |
| **Tấn Phát** | Hoàn thiện tất cả unit tests. Chạy Slither. Viết Chương 6.1.1 (phần B) + 6.3. | 11/06 |
| **Phước Tình** | Hoàn thiện integration tests. Deploy lên Sepolia. Verify trên Etherscan. Chụp screenshots. Viết Chương 5.3 + 6.1.2 + 6.2. | 11/06 |
| **Mỹ Khánh** | Hoàn thiện Chương 3. Viết phần 5.1 (phần D). | 11/06 |
| **Hoài Nam** | Viết Chương 6.4 + 7. **Bắt đầu review + format tổng toàn bộ report ngay khi nhận draft.** | 11/06 |

---

### Buffer (16/06 – 18/06): Nộp bài

| Ngày | Việc |
|---|---|
| **16/06 (T2)** | Hoàn thiện format word + Làm canva |
| **17/06 (T3)** | Check tổng |
| **18/06 (T4)** | Nộp. |

---


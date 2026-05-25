#!/bin/bash
# Copy compiled ABIs from Hardhat artifacts to frontend/src/abi/
# Run from blockchain/ directory after `npx hardhat compile`

CONTRACTS=("KeyCoin" "GameToken" "GameStore" "ActivationContract" "Marketplace" "GamePass")
ABI_DIR="../frontend/src/abi"

mkdir -p "$ABI_DIR"

for contract in "${CONTRACTS[@]}"; do
  ARTIFACT="artifacts/contracts/${contract}.sol/${contract}.json"
  if [ -f "$ARTIFACT" ]; then
    node -e "
      const artifact = require('./${ARTIFACT}');
      const fs = require('fs');
      fs.writeFileSync('${ABI_DIR}/${contract}.json', JSON.stringify(artifact.abi, null, 2));
      console.log('  ✓ ${contract}.json');
    "
  else
    echo "  ✗ ${contract} — not compiled yet"
  fi
done

echo ""
echo "ABI files written to ${ABI_DIR}/"

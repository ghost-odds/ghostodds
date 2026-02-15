#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "Building GhostOdds program..."
cargo-build-sbf --manifest-path programs/ghostodds/Cargo.toml --tools-version v1.52

echo "Deploying to $(solana config get | grep 'RPC URL' | awk '{print $3}')..."
solana program deploy target/deploy/ghostodds.so \
  --keypair target/deploy/ghostodds-keypair.json \
  --program-id target/deploy/ghostodds-keypair.json

PROGRAM_ID=$(solana address -k target/deploy/ghostodds-keypair.json)
echo "Deployed program: $PROGRAM_ID"
echo "$PROGRAM_ID" > programs/ghostodds/program-id.txt
echo "Done."

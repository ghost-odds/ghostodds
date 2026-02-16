/**
 * GhostOdds Devnet Setup Script
 *
 * Initializes the platform and creates test markets on Solana devnet.
 *
 * Prerequisites:
 * - Solana CLI configured for devnet
 * - Keypair at ~/.config/solana/id.json with devnet SOL
 * - Program deployed to FU64EotiwqACVJ9hyhH6XA9iiqQKmWjmPTUmSF1i3ar9
 *
 * Usage:
 *   npx ts-node scripts/setup-devnet.ts
 */

import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { AnchorProvider, Program, BN, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("FU64EotiwqACVJ9hyhH6XA9iiqQKmWjmPTUmSF1i3ar9");
const DEVNET_URL = "https://api.devnet.solana.com";

// Minimal IDL for setup
const IDL = {
  version: "0.1.0",
  name: "ghostodds",
  address: "FU64EotiwqACVJ9hyhH6XA9iiqQKmWjmPTUmSF1i3ar9",
  metadata: { address: "FU64EotiwqACVJ9hyhH6XA9iiqQKmWjmPTUmSF1i3ar9" },
  instructions: [
    {
      name: "initializePlatform",
      accounts: [
        { name: "platform", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "treasury", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "feeBps", type: "u16" }],
    },
    {
      name: "createMarket",
      accounts: [
        { name: "platform", isMut: true, isSigner: false },
        { name: "market", isMut: true, isSigner: false },
        { name: "yesMint", isMut: true, isSigner: false },
        { name: "noMint", isMut: true, isSigner: false },
        { name: "collateralMint", isMut: false, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "authorityCollateral", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "rent", isMut: false, isSigner: false },
      ],
      args: [
        { name: "question", type: "string" },
        { name: "description", type: "string" },
        { name: "category", type: "string" },
        { name: "resolutionSource", type: "string" },
        { name: "resolutionValue", type: { option: "u64" } },
        { name: "resolutionOperator", type: "u8" },
        { name: "expiresAt", type: "i64" },
        { name: "initialLiquidity", type: "u64" },
      ],
    },
  ],
  accounts: [
    {
      name: "Platform",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "marketCount", type: "u64" },
          { name: "totalVolume", type: "u64" },
          { name: "feeBps", type: "u16" },
          { name: "treasury", type: "publicKey" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "Market",
      type: {
        kind: "struct",
        fields: [
          { name: "marketId", type: "u64" },
          { name: "authority", type: "publicKey" },
          { name: "question", type: "string" },
          { name: "description", type: "string" },
          { name: "category", type: "string" },
          { name: "collateralMint", type: "publicKey" },
          { name: "yesMint", type: "publicKey" },
          { name: "noMint", type: "publicKey" },
          { name: "vault", type: "publicKey" },
          { name: "yesAmount", type: "u64" },
          { name: "noAmount", type: "u64" },
          { name: "totalLiquidity", type: "u64" },
          { name: "volume", type: "u64" },
          { name: "resolutionSource", type: "string" },
          { name: "resolutionValue", type: { option: "u64" } },
          { name: "resolutionOperator", type: "u8" },
          { name: "createdAt", type: "i64" },
          { name: "expiresAt", type: "i64" },
          { name: "lockTime", type: "i64" },
          { name: "resolvedAt", type: { option: "i64" } },
          { name: "outcome", type: { option: "bool" } },
          { name: "status", type: "u8" },
          { name: "feeBps", type: "u16" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  errors: [],
} as const;

function loadKeypair(): Keypair {
  const keyPath = path.join(process.env.HOME || "~", ".config/solana/id.json");
  const raw = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function getPlatformPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("platform")], PROGRAM_ID);
}

function getMarketPDA(marketId: number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(marketId));
  return PublicKey.findProgramAddressSync([Buffer.from("market"), buf], PROGRAM_ID);
}

function getYesMintPDA(marketId: number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(marketId));
  return PublicKey.findProgramAddressSync([Buffer.from("yes_mint"), buf], PROGRAM_ID);
}

function getNoMintPDA(marketId: number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(marketId));
  return PublicKey.findProgramAddressSync([Buffer.from("no_mint"), buf], PROGRAM_ID);
}

function getVaultPDA(marketId: number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(marketId));
  return PublicKey.findProgramAddressSync([Buffer.from("vault"), buf], PROGRAM_ID);
}

async function main() {
  const connection = new Connection(DEVNET_URL, "confirmed");
  const keypair = loadKeypair();
  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new Program(IDL as any, provider);

  console.log("Authority:", keypair.publicKey.toBase58());

  const [platformPDA] = getPlatformPDA();

  // Check if platform exists
  let platform: any = null;
  try {
    platform = await program.account.platform.fetch(platformPDA);
    console.log("Platform already initialized, market count:", platform.marketCount.toString());
  } catch {
    console.log("Initializing platform...");

    // Create a USDC-like mint for devnet testing
    const usdcMint = await createMint(connection, keypair, keypair.publicKey, null, 6);
    console.log("Created devnet USDC mint:", usdcMint.toBase58());

    // Create treasury token account
    const treasuryAta = await getOrCreateAssociatedTokenAccount(
      connection, keypair, usdcMint, keypair.publicKey
    );
    console.log("Treasury ATA:", treasuryAta.address.toBase58());

    // Initialize platform with 2% fee
    await program.methods
      .initializePlatform(200)
      .accounts({
        platform: platformPDA,
        authority: keypair.publicKey,
        treasury: treasuryAta.address,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    platform = await program.account.platform.fetch(platformPDA);
    console.log("Platform initialized!");

    // Mint some USDC to authority for market creation
    await mintTo(connection, keypair, usdcMint, treasuryAta.address, keypair, 10_000_000_000); // 10K USDC
    console.log("Minted 10,000 USDC to authority");

    // Save the USDC mint for reference
    const envPath = path.join(__dirname, "../app/.env.local");
    const envContent = `NEXT_PUBLIC_USDC_MINT=${usdcMint.toBase58()}\nNEXT_PUBLIC_PROGRAM_ID=${PROGRAM_ID.toBase58()}\nNEXT_PUBLIC_RPC_URL=${DEVNET_URL}\n`;
    fs.writeFileSync(envPath, envContent);
    console.log("Saved .env.local with USDC mint");
  }

  const currentCount = new BN(platform.marketCount.toString()).toNumber();
  console.log(`\nCurrent market count: ${currentCount}`);

  // Read the USDC mint from env or platform
  let usdcMint: PublicKey;
  const envPath = path.join(__dirname, "../app/.env.local");
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, "utf-8");
    const match = env.match(/NEXT_PUBLIC_USDC_MINT=(\S+)/);
    if (match) {
      usdcMint = new PublicKey(match[1]);
    } else {
      console.log("No USDC mint in .env.local, creating one...");
      usdcMint = await createMint(connection, keypair, keypair.publicKey, null, 6);
      fs.appendFileSync(envPath, `NEXT_PUBLIC_USDC_MINT=${usdcMint.toBase58()}\n`);
    }
  } else {
    usdcMint = await createMint(connection, keypair, keypair.publicKey, null, 6);
    fs.writeFileSync(envPath, `NEXT_PUBLIC_USDC_MINT=${usdcMint.toBase58()}\nNEXT_PUBLIC_PROGRAM_ID=${PROGRAM_ID.toBase58()}\nNEXT_PUBLIC_RPC_URL=${DEVNET_URL}\n`);
  }

  console.log("USDC Mint:", usdcMint.toBase58());

  // Ensure authority has USDC
  const authorityAta = await getOrCreateAssociatedTokenAccount(
    connection, keypair, usdcMint, keypair.publicKey
  );
  const balance = Number(authorityAta.amount) / 1_000_000;
  console.log(`Authority USDC balance: ${balance}`);

  if (balance < 1000) {
    console.log("Minting more USDC...");
    await mintTo(connection, keypair, usdcMint, authorityAta.address, keypair, 10_000_000_000);
    console.log("Minted 10,000 USDC");
  }

  // Define test markets
  const markets = [
    {
      question: "Will SOL be above $200 on April 1?",
      description: "Resolves YES if Pyth SOL/USD >= $200 at April 1 00:00 UTC.",
      category: "Crypto",
      resolutionSource: "Pyth: SOL/USD",
      resolutionValue: new BN(200_000_000), // $200 with 6 decimals
      resolutionOperator: 0,
      expiresAt: Math.floor(Date.now() / 1000) + 86400 * 45,
      liquidity: new BN(500_000_000), // 500 USDC
    },
    {
      question: "Will BTC exceed $100K by May 2026?",
      description: "Resolves YES if Pyth BTC/USD >= $100,000 before May 1.",
      category: "Crypto",
      resolutionSource: "Pyth: BTC/USD",
      resolutionValue: new BN(100_000_000_000), // $100K
      resolutionOperator: 0,
      expiresAt: Math.floor(Date.now() / 1000) + 86400 * 75,
      liquidity: new BN(1_000_000_000), // 1000 USDC
    },
    {
      question: "Will ETH reach $5K this quarter?",
      description: "Resolves YES if Pyth ETH/USD >= $5,000 before Q2 2026.",
      category: "Crypto",
      resolutionSource: "Pyth: ETH/USD",
      resolutionValue: new BN(5_000_000_000), // $5K
      resolutionOperator: 0,
      expiresAt: Math.floor(Date.now() / 1000) + 86400 * 60,
      liquidity: new BN(750_000_000), // 750 USDC
    },
    {
      question: "Will Solana DeFi TVL exceed $15B?",
      description: "Resolves based on manual authority check of DefiLlama data.",
      category: "DeFi",
      resolutionSource: "DefiLlama",
      resolutionValue: null,
      resolutionOperator: 0,
      expiresAt: Math.floor(Date.now() / 1000) + 86400 * 30,
      liquidity: new BN(300_000_000), // 300 USDC
    },
    {
      question: "Will SOL flip ETH in daily DEX volume?",
      description: "Resolves YES if Solana DEX daily vol > Ethereum on any day.",
      category: "DeFi",
      resolutionSource: "DefiLlama DEX",
      resolutionValue: null,
      resolutionOperator: 0,
      expiresAt: Math.floor(Date.now() / 1000) + 86400 * 90,
      liquidity: new BN(500_000_000), // 500 USDC
    },
  ];

  for (let i = 0; i < markets.length; i++) {
    const m = markets[i];
    const marketId = currentCount + i;

    // Check if market already exists
    const [marketPDA] = getMarketPDA(marketId);
    try {
      await program.account.market.fetch(marketPDA);
      console.log(`Market #${marketId} already exists, skipping.`);
      continue;
    } catch {
      // Doesn't exist, create it
    }

    const [yesMintPDA] = getYesMintPDA(marketId);
    const [noMintPDA] = getNoMintPDA(marketId);
    const [vaultPDA] = getVaultPDA(marketId);

    console.log(`\nCreating market #${marketId}: "${m.question}"`);

    try {
      const tx = await program.methods
        .createMarket(
          m.question,
          m.description,
          m.category,
          m.resolutionSource,
          m.resolutionValue,
          m.resolutionOperator,
          new BN(m.expiresAt),
          m.liquidity
        )
        .accounts({
          platform: platformPDA,
          market: marketPDA,
          yesMint: yesMintPDA,
          noMint: noMintPDA,
          collateralMint: usdcMint,
          vault: vaultPDA,
          authorityCollateral: authorityAta.address,
          authority: keypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      console.log(`  Created! Tx: ${tx}`);
    } catch (e: any) {
      console.error(`  Failed: ${e.message || e}`);
    }
  }

  console.log("\nSetup complete!");
  console.log(`Total markets: ${currentCount + markets.length}`);
  console.log(`\nUpdate app/.env.local NEXT_PUBLIC_USDC_MINT if needed: ${usdcMint.toBase58()}`);
}

main().catch(console.error);

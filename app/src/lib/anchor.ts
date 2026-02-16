import { Program, AnchorProvider, BN, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { IDL } from "./idl";

export const PROGRAM_ID = new PublicKey("FU64EotiwqACVJ9hyhH6XA9iiqQKmWjmPTUmSF1i3ar9");
export const DEVNET_URL = "https://api.devnet.solana.com";

// Devnet USDC mint — set via NEXT_PUBLIC_USDC_MINT env var or fallback
export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

export interface OnChainMarket {
  publicKey: PublicKey;
  marketId: number;
  authority: PublicKey;
  question: string;
  description: string;
  category: string;
  collateralMint: PublicKey;
  yesMint: PublicKey;
  noMint: PublicKey;
  vault: PublicKey;
  yesAmount: BN;
  noAmount: BN;
  totalLiquidity: BN;
  volume: BN;
  resolutionSource: string;
  resolutionValue: BN | null;
  resolutionOperator: number;
  createdAt: BN;
  expiresAt: BN;
  lockTime: BN;
  resolvedAt: BN | null;
  outcome: boolean | null;
  status: number;
  feeBps: number;
  bump: number;
}

export interface OnChainPlatform {
  authority: PublicKey;
  marketCount: BN;
  totalVolume: BN;
  feeBps: number;
  treasury: PublicKey;
  bump: number;
}

export interface OnChainPosition {
  user: PublicKey;
  marketId: number;
  yesTokens: BN;
  noTokens: BN;
  totalDeposited: BN;
  totalWithdrawn: BN;
  bump: number;
}

// PDA derivations
export function getPlatformPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("platform")], PROGRAM_ID);
}

export function getMarketPDA(marketId: number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(marketId));
  return PublicKey.findProgramAddressSync([Buffer.from("market"), buf], PROGRAM_ID);
}

export function getYesMintPDA(marketId: number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(marketId));
  return PublicKey.findProgramAddressSync([Buffer.from("yes_mint"), buf], PROGRAM_ID);
}

export function getNoMintPDA(marketId: number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(marketId));
  return PublicKey.findProgramAddressSync([Buffer.from("no_mint"), buf], PROGRAM_ID);
}

export function getVaultPDA(marketId: number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(marketId));
  return PublicKey.findProgramAddressSync([Buffer.from("vault"), buf], PROGRAM_ID);
}

export function getPositionPDA(marketId: number, user: PublicKey): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(marketId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), buf, user.toBuffer()],
    PROGRAM_ID
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getProgram(provider: AnchorProvider): any {
  return new Program(IDL as unknown as Idl, provider);
}

// Fetch all markets
export async function fetchAllMarkets(connection: Connection): Promise<OnChainMarket[]> {
  const provider = new AnchorProvider(connection, {} as never, { commitment: "confirmed" });
  const program = getProgram(provider);
  
  try {
    const accounts = await program.account.market.all();
    return accounts.map((a: any) => ({
      publicKey: a.publicKey,
      ...(a.account as unknown as Omit<OnChainMarket, "publicKey">),
    }));
  } catch {
    return [];
  }
}

// Fetch single market
export async function fetchMarket(connection: Connection, marketId: number): Promise<OnChainMarket | null> {
  const provider = new AnchorProvider(connection, {} as never, { commitment: "confirmed" });
  const program = getProgram(provider);
  const [marketPDA] = getMarketPDA(marketId);
  
  try {
    const account = await program.account.market.fetch(marketPDA);
    return {
      publicKey: marketPDA,
      ...(account as unknown as Omit<OnChainMarket, "publicKey">),
    };
  } catch {
    return null;
  }
}

// Fetch platform
export async function fetchPlatform(connection: Connection): Promise<OnChainPlatform | null> {
  const provider = new AnchorProvider(connection, {} as never, { commitment: "confirmed" });
  const program = getProgram(provider);
  const [platformPDA] = getPlatformPDA();
  
  try {
    const account = await program.account.platform.fetch(platformPDA);
    return account as unknown as OnChainPlatform;
  } catch {
    return null;
  }
}

// Fetch user positions for all markets
export async function fetchUserPositions(
  connection: Connection,
  user: PublicKey
): Promise<(OnChainPosition & { marketPublicKey: PublicKey })[]> {
  const provider = new AnchorProvider(connection, {} as never, { commitment: "confirmed" });
  const program = getProgram(provider);

  try {
    const accounts = await program.account.userPosition.all([
      { memcmp: { offset: 8, bytes: user.toBase58() } },
    ]);
    return accounts.map((a: any) => {
      const pos = a.account as unknown as OnChainPosition;
      const [marketPDA] = getMarketPDA(typeof pos.marketId === "number" ? pos.marketId : new BN(pos.marketId).toNumber());
      return { ...pos, marketPublicKey: marketPDA };
    });
  } catch {
    return [];
  }
}

// Helper to ensure ATA exists, returns instruction if needed
function ensureATA(
  owner: PublicKey,
  mint: PublicKey,
  payer: PublicKey
): { address: PublicKey; instruction: ReturnType<typeof createAssociatedTokenAccountInstruction> | null } {
  const address = getAssociatedTokenAddressSync(mint, owner, true);
  // We'll check on-chain in the transaction builder, but for now return the address
  return { address, instruction: null };
}

// Buy outcome
export async function buyOutcome(
  provider: AnchorProvider,
  marketId: number,
  amount: number, // in USDC (human readable, e.g. 10.5)
  isYes: boolean,
  slippageBps: number = 500 // 5% default
): Promise<string> {
  const program = getProgram(provider);
  const user = provider.wallet.publicKey;

  const [platformPDA] = getPlatformPDA();
  const [marketPDA] = getMarketPDA(marketId);
  const [yesMintPDA] = getYesMintPDA(marketId);
  const [noMintPDA] = getNoMintPDA(marketId);
  const [vaultPDA] = getVaultPDA(marketId);
  const [positionPDA] = getPositionPDA(marketId, user);

  // Fetch platform for treasury
  const platform = await fetchPlatform(provider.connection);
  if (!platform) throw new Error("Platform not initialized");

  // Fetch market for collateral mint
  const market = await fetchMarket(provider.connection, marketId);
  if (!market) throw new Error("Market not found");

  const amountLamports = new BN(Math.floor(amount * 1_000_000));
  
  // Calculate expected output for slippage
  const feeBps = market.feeBps;
  const feeAmount = amountLamports.mul(new BN(feeBps)).add(new BN(9999)).div(new BN(10000));
  const inputAfterFee = amountLamports.sub(feeAmount);
  
  const yesAmt = new BN(market.yesAmount.toString());
  const noAmt = new BN(market.noAmount.toString());
  const [inputReserve, outputReserve] = isYes ? [noAmt, yesAmt] : [yesAmt, noAmt];
  const k = inputReserve.mul(outputReserve);
  const newInputReserve = inputReserve.add(inputAfterFee);
  const newOutputReserve = k.div(newInputReserve);
  const expectedOut = outputReserve.sub(newOutputReserve);
  const minOut = expectedOut.mul(new BN(10000 - slippageBps)).div(new BN(10000));

  // Token accounts
  const userCollateral = getAssociatedTokenAddressSync(market.collateralMint, user);
  const userYesTokens = getAssociatedTokenAddressSync(yesMintPDA, user);
  const userNoTokens = getAssociatedTokenAddressSync(noMintPDA, user);
  const treasury = platform.treasury;

  // Build pre-instructions for ATAs that might not exist
  const preIxs = [];
  const ataChecks = [
    { mint: yesMintPDA, address: userYesTokens },
    { mint: noMintPDA, address: userNoTokens },
  ];
  for (const { mint, address } of ataChecks) {
    const info = await provider.connection.getAccountInfo(address);
    if (!info) {
      preIxs.push(createAssociatedTokenAccountInstruction(user, address, user, mint));
    }
  }

  const tx = await program.methods
    .buyOutcome(amountLamports, isYes, minOut)
    .accounts({
      market: marketPDA,
      platform: platformPDA,
      yesMint: yesMintPDA,
      noMint: noMintPDA,
      vault: vaultPDA,
      treasury,
      userCollateral,
      userYesTokens,
      userNoTokens,
      userPosition: positionPDA,
      user,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions(preIxs)
    .rpc();

  return tx;
}

// Sell outcome
export async function sellOutcome(
  provider: AnchorProvider,
  marketId: number,
  tokenAmount: number, // token amount in human readable
  isYes: boolean,
  slippageBps: number = 500
): Promise<string> {
  const program = getProgram(provider);
  const user = provider.wallet.publicKey;

  const [platformPDA] = getPlatformPDA();
  const [marketPDA] = getMarketPDA(marketId);
  const [yesMintPDA] = getYesMintPDA(marketId);
  const [noMintPDA] = getNoMintPDA(marketId);
  const [vaultPDA] = getVaultPDA(marketId);
  const [positionPDA] = getPositionPDA(marketId, user);

  const platform = await fetchPlatform(provider.connection);
  if (!platform) throw new Error("Platform not initialized");

  const market = await fetchMarket(provider.connection, marketId);
  if (!market) throw new Error("Market not found");

  const amountLamports = new BN(Math.floor(tokenAmount * 1_000_000));

  // Calculate min collateral out
  const yesAmt = new BN(market.yesAmount.toString());
  const noAmt = new BN(market.noAmount.toString());
  const [inputReserve, outputReserve] = isYes ? [yesAmt, noAmt] : [noAmt, yesAmt];
  const k = inputReserve.mul(outputReserve);
  const newInputReserve = inputReserve.add(amountLamports);
  const newOutputReserve = k.div(newInputReserve);
  const collateralBeforeFee = outputReserve.sub(newOutputReserve);
  const fee = collateralBeforeFee.mul(new BN(market.feeBps)).add(new BN(9999)).div(new BN(10000));
  const expectedOut = collateralBeforeFee.sub(fee);
  const minOut = expectedOut.mul(new BN(10000 - slippageBps)).div(new BN(10000));

  const userCollateral = getAssociatedTokenAddressSync(market.collateralMint, user);
  const userYesTokens = getAssociatedTokenAddressSync(yesMintPDA, user);
  const userNoTokens = getAssociatedTokenAddressSync(noMintPDA, user);

  const tx = await program.methods
    .sellOutcome(amountLamports, isYes, minOut)
    .accounts({
      market: marketPDA,
      platform: platformPDA,
      yesMint: yesMintPDA,
      noMint: noMintPDA,
      vault: vaultPDA,
      treasury: platform.treasury,
      userCollateral,
      userYesTokens,
      userNoTokens,
      userPosition: positionPDA,
      user,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  return tx;
}

// Redeem winnings
export async function redeemWinnings(
  provider: AnchorProvider,
  marketId: number
): Promise<string> {
  const program = getProgram(provider);
  const user = provider.wallet.publicKey;

  const [marketPDA] = getMarketPDA(marketId);
  const [yesMintPDA] = getYesMintPDA(marketId);
  const [noMintPDA] = getNoMintPDA(marketId);
  const [vaultPDA] = getVaultPDA(marketId);
  const [positionPDA] = getPositionPDA(marketId, user);

  const market = await fetchMarket(provider.connection, marketId);
  if (!market) throw new Error("Market not found");

  const userCollateral = getAssociatedTokenAddressSync(market.collateralMint, user);
  const userYesTokens = getAssociatedTokenAddressSync(yesMintPDA, user);
  const userNoTokens = getAssociatedTokenAddressSync(noMintPDA, user);

  const tx = await program.methods
    .redeemWinnings()
    .accounts({
      market: marketPDA,
      yesMint: yesMintPDA,
      noMint: noMintPDA,
      vault: vaultPDA,
      userCollateral,
      userYesTokens,
      userNoTokens,
      userPosition: positionPDA,
      user,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  return tx;
}

// Create market (admin only)
export async function createMarket(
  provider: AnchorProvider,
  question: string,
  description: string,
  category: string,
  resolutionSource: string,
  resolutionValue: number | null, // price in USD, e.g. 250 → 250_000_000 (6 decimals)
  resolutionOperator: number, // 0=>=, 1=<=, 2===
  expiresAt: number, // unix timestamp
  initialLiquidity: number // in USDC human readable
): Promise<string> {
  const program = getProgram(provider);
  const authority = provider.wallet.publicKey;

  const [platformPDA] = getPlatformPDA();
  
  // We need to know the current market_count to derive the right PDA
  const platform = await fetchPlatform(provider.connection);
  if (!platform) throw new Error("Platform not initialized");
  
  const marketId = new BN(platform.marketCount.toString()).toNumber();
  const [marketPDA] = getMarketPDA(marketId);
  const [yesMintPDA] = getYesMintPDA(marketId);
  const [noMintPDA] = getNoMintPDA(marketId);
  const [vaultPDA] = getVaultPDA(marketId);

  const authorityCollateral = getAssociatedTokenAddressSync(USDC_MINT, authority);

  const resVal = resolutionValue !== null ? new BN(Math.floor(resolutionValue * 1_000_000)) : null;
  const liquidityLamports = new BN(Math.floor(initialLiquidity * 1_000_000));

  const tx = await program.methods
    .createMarket(
      question,
      description,
      category,
      resolutionSource,
      resVal,
      resolutionOperator,
      new BN(expiresAt),
      liquidityLamports
    )
    .accounts({
      platform: platformPDA,
      market: marketPDA,
      yesMint: yesMintPDA,
      noMint: noMintPDA,
      collateralMint: USDC_MINT,
      vault: vaultPDA,
      authorityCollateral,
      authority,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  return tx;
}

// Helper: compute prices from AMM reserves
export function computePrices(yesAmount: BN, noAmount: BN): { yesPrice: number; noPrice: number } {
  const yes = parseFloat(yesAmount.toString());
  const no = parseFloat(noAmount.toString());
  const total = yes + no;
  if (total === 0) return { yesPrice: 0.5, noPrice: 0.5 };
  // In CPMM: yes_price = no_reserve / (yes_reserve + no_reserve)
  return {
    yesPrice: no / total,
    noPrice: yes / total,
  };
}

// Helper: convert BN token amount to human readable
export function toHuman(amount: BN | number, decimals: number = 6): number {
  const val = typeof amount === "number" ? amount : parseFloat(amount.toString());
  return val / Math.pow(10, decimals);
}

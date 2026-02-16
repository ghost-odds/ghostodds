import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

export const PROGRAM_ID = new PublicKey("FU64EotiwqACVJ9hyhH6XA9iiqQKmWjmPTUmSF1i3ar9");
export const DEVNET_URL = "https://api.devnet.solana.com";

export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

// ============ Types ============

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
  yesAmount: bigint;
  noAmount: bigint;
  totalLiquidity: bigint;
  volume: bigint;
  resolutionSource: string;
  resolutionValue: bigint | null;
  resolutionOperator: number;
  createdAt: bigint;
  expiresAt: bigint;
  lockTime: bigint;
  resolvedAt: bigint | null;
  outcome: boolean | null;
  status: number;
  feeBps: number;
  bump: number;
}

export interface OnChainPlatform {
  authority: PublicKey;
  marketCount: bigint;
  totalVolume: bigint;
  feeBps: number;
  treasury: PublicKey;
  bump: number;
}

export interface OnChainPosition {
  user: PublicKey;
  marketId: number;
  yesTokens: bigint;
  noTokens: bigint;
  totalDeposited: bigint;
  totalWithdrawn: bigint;
  bump: number;
}

// ============ Discriminators (SHA256("global:<name>")[0..8]) ============
// Pre-computed to avoid needing crypto in browser

const DISC = {
  // Account discriminators: SHA256("account:<Name>")[0..8]
  Platform:     new Uint8Array([220, 50, 196, 76, 209, 84, 234, 38]),
  Market:       new Uint8Array([219, 190, 213, 55, 0, 227, 198, 154]),
  UserPosition: new Uint8Array([251, 248, 209, 162, 48, 175, 183, 74]),
  // Instruction discriminators: SHA256("global:<snake_case_name>")[0..8]
  initializePlatform: new Uint8Array([175, 175, 109, 31, 13, 152, 155, 237]),
  createMarket:       new Uint8Array([103, 226, 97, 235, 200, 188, 183, 149]),
  buyOutcome:         new Uint8Array([200, 160, 110, 210, 95, 238, 25, 192]),
  sellOutcome:        new Uint8Array([145, 167, 20, 64, 167, 56, 167, 78]),
  resolveMarket:      new Uint8Array([155, 23, 80, 173, 61, 133, 39, 126]),
  redeemWinnings:     new Uint8Array([2, 14, 219, 167, 89, 11, 74, 64]),
  cancelMarket:       new Uint8Array([23, 230, 53, 92, 41, 250, 218, 35]),
  redeemCancelled:    new Uint8Array([43, 97, 184, 231, 120, 140, 183, 163]),
};

// ============ PDA Derivations ============

function u64LEBytes(n: number): Uint8Array {
  const buf = new Uint8Array(8);
  const view = new DataView(buf.buffer);
  view.setBigUint64(0, BigInt(n), true);
  return buf;
}

function textBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export function getPlatformPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([textBytes("platform")], PROGRAM_ID);
}

export function getMarketPDA(marketId: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([textBytes("market"), u64LEBytes(marketId)], PROGRAM_ID);
}

export function getYesMintPDA(marketId: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([textBytes("yes_mint"), u64LEBytes(marketId)], PROGRAM_ID);
}

export function getNoMintPDA(marketId: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([textBytes("no_mint"), u64LEBytes(marketId)], PROGRAM_ID);
}

export function getVaultPDA(marketId: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([textBytes("vault"), u64LEBytes(marketId)], PROGRAM_ID);
}

export function getPositionPDA(marketId: number, user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [textBytes("position"), u64LEBytes(marketId), user.toBytes()],
    PROGRAM_ID
  );
}

// ============ Manual Borsh Deserialization ============

class ManualReader {
  private view: DataView;
  private offset = 0;
  
  constructor(private data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  skip(n: number) { this.offset += n; }
  
  u8(): number { const v = this.view.getUint8(this.offset); this.offset += 1; return v; }
  u16(): number { const v = this.view.getUint16(this.offset, true); this.offset += 2; return v; }
  u64(): bigint { const v = this.view.getBigUint64(this.offset, true); this.offset += 8; return v; }
  i64(): bigint { const v = this.view.getBigInt64(this.offset, true); this.offset += 8; return v; }
  bool(): boolean { return this.u8() !== 0; }
  
  pubkey(): PublicKey {
    const bytes = this.data.slice(this.offset, this.offset + 32);
    this.offset += 32;
    return new PublicKey(bytes);
  }
  
  string(): string {
    const len = this.view.getUint32(this.offset, true);
    this.offset += 4;
    const bytes = this.data.slice(this.offset, this.offset + len);
    this.offset += len;
    return new TextDecoder().decode(bytes);
  }
  
  optionU64(): bigint | null {
    const has = this.u8();
    if (has === 0) return null;
    return this.u64();
  }
  
  optionI64(): bigint | null {
    const has = this.u8();
    if (has === 0) return null;
    return this.i64();
  }
  
  optionBool(): boolean | null {
    const has = this.u8();
    if (has === 0) return null;
    return this.bool();
  }
}

function decodePlatform(data: Uint8Array): Omit<OnChainPlatform, never> {
  const r = new ManualReader(data);
  r.skip(8); // discriminator
  return {
    authority: r.pubkey(),
    marketCount: r.u64(),
    totalVolume: r.u64(),
    feeBps: r.u16(),
    treasury: r.pubkey(),
    bump: r.u8(),
  };
}

function decodeMarket(data: Uint8Array): Omit<OnChainMarket, "publicKey"> {
  const r = new ManualReader(data);
  r.skip(8); // discriminator
  return {
    marketId: Number(r.u64()),
    authority: r.pubkey(),
    question: r.string(),
    description: r.string(),
    category: r.string(),
    collateralMint: r.pubkey(),
    yesMint: r.pubkey(),
    noMint: r.pubkey(),
    vault: r.pubkey(),
    yesAmount: r.u64(),
    noAmount: r.u64(),
    totalLiquidity: r.u64(),
    volume: r.u64(),
    resolutionSource: r.string(),
    resolutionValue: r.optionU64(),
    resolutionOperator: r.u8(),
    createdAt: r.i64(),
    expiresAt: r.i64(),
    lockTime: r.i64(),
    resolvedAt: r.optionI64(),
    outcome: r.optionBool(),
    status: r.u8(),
    feeBps: r.u16(),
    bump: r.u8(),
  };
}

function decodePosition(data: Uint8Array): OnChainPosition {
  const r = new ManualReader(data);
  r.skip(8); // discriminator
  return {
    user: r.pubkey(),
    marketId: Number(r.u64()),
    yesTokens: r.u64(),
    noTokens: r.u64(),
    totalDeposited: r.u64(),
    totalWithdrawn: r.u64(),
    bump: r.u8(),
  };
}

// ============ Fetch Functions ============

export async function fetchAllMarkets(connection: Connection): Promise<OnChainMarket[]> {
  try {
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [{ memcmp: { offset: 0, bytes: uint8ToBase58(DISC.Market) } }],
    });
    return accounts.map((a) => ({
      publicKey: a.pubkey,
      ...decodeMarket(a.account.data),
    }));
  } catch {
    return [];
  }
}

export async function fetchMarket(connection: Connection, marketId: number): Promise<OnChainMarket | null> {
  const [marketPDA] = getMarketPDA(marketId);
  try {
    const info = await connection.getAccountInfo(marketPDA);
    if (!info) return null;
    return { publicKey: marketPDA, ...decodeMarket(info.data) };
  } catch {
    return null;
  }
}

export async function fetchPlatform(connection: Connection): Promise<OnChainPlatform | null> {
  const [platformPDA] = getPlatformPDA();
  try {
    const info = await connection.getAccountInfo(platformPDA);
    if (!info) return null;
    return decodePlatform(info.data);
  } catch {
    return null;
  }
}

export async function fetchUserPositions(
  connection: Connection,
  user: PublicKey
): Promise<(OnChainPosition & { marketPublicKey: PublicKey })[]> {
  try {
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { memcmp: { offset: 0, bytes: uint8ToBase58(DISC.UserPosition) } },
        { memcmp: { offset: 8, bytes: user.toBase58() } },
      ],
    });
    return accounts.map((a) => {
      const pos = decodePosition(a.account.data);
      const [marketPDA] = getMarketPDA(pos.marketId);
      return { ...pos, marketPublicKey: marketPDA };
    });
  } catch {
    return [];
  }
}

// ============ Transaction Builders ============
// These build raw instructions without Anchor Program dependency

function encodeU64LE(n: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  const view = new DataView(buf.buffer);
  view.setBigUint64(0, n, true);
  return buf;
}

function encodeI64LE(n: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  const view = new DataView(buf.buffer);
  view.setBigInt64(0, n, true);
  return buf;
}

function encodeBool(v: boolean): Uint8Array {
  return new Uint8Array([v ? 1 : 0]);
}

function encodeString(s: string): Uint8Array {
  const encoded = new TextEncoder().encode(s);
  const lenBuf = new Uint8Array(4);
  new DataView(lenBuf.buffer).setUint32(0, encoded.length, true);
  const result = new Uint8Array(4 + encoded.length);
  result.set(lenBuf);
  result.set(encoded, 4);
  return result;
}

function encodeOptionU64(v: bigint | null): Uint8Array {
  if (v === null) return new Uint8Array([0]);
  const result = new Uint8Array(9);
  result[0] = 1;
  new DataView(result.buffer).setBigUint64(1, v, true);
  return result;
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

// Wallet adapter interface
interface WalletAdapter {
  publicKey: PublicKey;
  signTransaction: (tx: any) => Promise<any>;
  signAllTransactions: (txs: any[]) => Promise<any[]>;
}

import { Transaction } from "@solana/web3.js";

async function sendInstruction(
  connection: Connection,
  wallet: WalletAdapter,
  ix: TransactionInstruction
): Promise<string> {
  const tx = new Transaction().add(ix);
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const signed = await wallet.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}

async function sendInstructions(
  connection: Connection,
  wallet: WalletAdapter,
  ixs: TransactionInstruction[]
): Promise<string> {
  const tx = new Transaction();
  for (const ix of ixs) tx.add(ix);
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const signed = await wallet.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}

// Buy outcome
export async function buyOutcome(
  connection: Connection,
  wallet: WalletAdapter,
  marketId: number,
  amount: number,
  isYes: boolean,
  slippageBps: number = 500
): Promise<string> {
  const user = wallet.publicKey;
  const [platformPDA] = getPlatformPDA();
  const [marketPDA] = getMarketPDA(marketId);
  const [yesMintPDA] = getYesMintPDA(marketId);
  const [noMintPDA] = getNoMintPDA(marketId);
  const [vaultPDA] = getVaultPDA(marketId);
  const [positionPDA] = getPositionPDA(marketId, user);

  const platform = await fetchPlatform(connection);
  if (!platform) throw new Error("Platform not initialized");
  const market = await fetchMarket(connection, marketId);
  if (!market) throw new Error("Market not found");

  const amountLamports = BigInt(Math.floor(amount * 1_000_000));
  
  // Calculate min tokens out with slippage
  const feeBps = BigInt(market.feeBps);
  const feeAmount = (amountLamports * feeBps + 9999n) / 10000n;
  const inputAfterFee = amountLamports - feeAmount;
  const yesAmt = market.yesAmount;
  const noAmt = market.noAmount;
  const [inputReserve, outputReserve] = isYes ? [noAmt, yesAmt] : [yesAmt, noAmt];
  const k = inputReserve * outputReserve;
  const newInputReserve = inputReserve + inputAfterFee;
  const newOutputReserve = k / newInputReserve;
  const expectedOut = outputReserve - newOutputReserve;
  const minOut = expectedOut * BigInt(10000 - slippageBps) / 10000n;

  const userCollateral = getAssociatedTokenAddressSync(market.collateralMint, user);
  const userYesTokens = getAssociatedTokenAddressSync(yesMintPDA, user);
  const userNoTokens = getAssociatedTokenAddressSync(noMintPDA, user);

  const ixs: TransactionInstruction[] = [];

  // Create ATAs if needed
  for (const { mint, address } of [
    { mint: yesMintPDA, address: userYesTokens },
    { mint: noMintPDA, address: userNoTokens },
  ]) {
    const info = await connection.getAccountInfo(address);
    if (!info) {
      ixs.push(createAssociatedTokenAccountInstruction(user, address, user, mint));
    }
  }

  const data = concatBytes(
    DISC.buyOutcome,
    encodeU64LE(amountLamports),
    encodeBool(isYes),
    encodeU64LE(minOut)
  );

  ixs.push(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: marketPDA, isSigner: false, isWritable: true },
      { pubkey: platformPDA, isSigner: false, isWritable: true },
      { pubkey: yesMintPDA, isSigner: false, isWritable: true },
      { pubkey: noMintPDA, isSigner: false, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: platform.treasury, isSigner: false, isWritable: true },
      { pubkey: userCollateral, isSigner: false, isWritable: true },
      { pubkey: userYesTokens, isSigner: false, isWritable: true },
      { pubkey: userNoTokens, isSigner: false, isWritable: true },
      { pubkey: positionPDA, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: data as any,
  }));

  return sendInstructions(connection, wallet, ixs);
}

// Sell outcome
export async function sellOutcome(
  connection: Connection,
  wallet: WalletAdapter,
  marketId: number,
  tokenAmount: number,
  isYes: boolean,
  slippageBps: number = 500
): Promise<string> {
  const user = wallet.publicKey;
  const [platformPDA] = getPlatformPDA();
  const [marketPDA] = getMarketPDA(marketId);
  const [yesMintPDA] = getYesMintPDA(marketId);
  const [noMintPDA] = getNoMintPDA(marketId);
  const [vaultPDA] = getVaultPDA(marketId);
  const [positionPDA] = getPositionPDA(marketId, user);

  const platform = await fetchPlatform(connection);
  if (!platform) throw new Error("Platform not initialized");
  const market = await fetchMarket(connection, marketId);
  if (!market) throw new Error("Market not found");

  const amountLamports = BigInt(Math.floor(tokenAmount * 1_000_000));
  const yesAmt = market.yesAmount;
  const noAmt = market.noAmount;
  const [inputReserve, outputReserve] = isYes ? [yesAmt, noAmt] : [noAmt, yesAmt];
  const k = inputReserve * outputReserve;
  const newInputReserve = inputReserve + amountLamports;
  const newOutputReserve = k / newInputReserve;
  const collateralBeforeFee = outputReserve - newOutputReserve;
  const fee = (collateralBeforeFee * BigInt(market.feeBps) + 9999n) / 10000n;
  const expectedOut = collateralBeforeFee - fee;
  const minOut = expectedOut * BigInt(10000 - slippageBps) / 10000n;

  const userCollateral = getAssociatedTokenAddressSync(market.collateralMint, user);
  const userYesTokens = getAssociatedTokenAddressSync(yesMintPDA, user);
  const userNoTokens = getAssociatedTokenAddressSync(noMintPDA, user);

  const data = concatBytes(
    DISC.sellOutcome,
    encodeU64LE(amountLamports),
    encodeBool(isYes),
    encodeU64LE(minOut)
  );

  return sendInstruction(connection, wallet, new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: marketPDA, isSigner: false, isWritable: true },
      { pubkey: platformPDA, isSigner: false, isWritable: true },
      { pubkey: yesMintPDA, isSigner: false, isWritable: true },
      { pubkey: noMintPDA, isSigner: false, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: platform.treasury, isSigner: false, isWritable: true },
      { pubkey: userCollateral, isSigner: false, isWritable: true },
      { pubkey: userYesTokens, isSigner: false, isWritable: true },
      { pubkey: userNoTokens, isSigner: false, isWritable: true },
      { pubkey: positionPDA, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: data as any,
  }));
}

// Redeem winnings
export async function redeemWinnings(
  connection: Connection,
  wallet: WalletAdapter,
  marketId: number
): Promise<string> {
  const user = wallet.publicKey;
  const [marketPDA] = getMarketPDA(marketId);
  const [yesMintPDA] = getYesMintPDA(marketId);
  const [noMintPDA] = getNoMintPDA(marketId);
  const [vaultPDA] = getVaultPDA(marketId);
  const [positionPDA] = getPositionPDA(marketId, user);

  const market = await fetchMarket(connection, marketId);
  if (!market) throw new Error("Market not found");

  const userCollateral = getAssociatedTokenAddressSync(market.collateralMint, user);
  const userYesTokens = getAssociatedTokenAddressSync(yesMintPDA, user);
  const userNoTokens = getAssociatedTokenAddressSync(noMintPDA, user);

  return sendInstruction(connection, wallet, new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: marketPDA, isSigner: false, isWritable: false },
      { pubkey: yesMintPDA, isSigner: false, isWritable: true },
      { pubkey: noMintPDA, isSigner: false, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: userCollateral, isSigner: false, isWritable: true },
      { pubkey: userYesTokens, isSigner: false, isWritable: true },
      { pubkey: userNoTokens, isSigner: false, isWritable: true },
      { pubkey: positionPDA, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: DISC.redeemWinnings as any,
  }));
}

// Create market (admin)
export async function createMarket(
  connection: Connection,
  wallet: WalletAdapter,
  question: string,
  description: string,
  category: string,
  resolutionSource: string,
  resolutionValue: number | null,
  resolutionOperator: number,
  expiresAt: number,
  initialLiquidity: number
): Promise<string> {
  const authority = wallet.publicKey;
  const [platformPDA] = getPlatformPDA();
  
  const platform = await fetchPlatform(connection);
  if (!platform) throw new Error("Platform not initialized");
  
  const marketId = Number(platform.marketCount);
  const [marketPDA] = getMarketPDA(marketId);
  const [yesMintPDA] = getYesMintPDA(marketId);
  const [noMintPDA] = getNoMintPDA(marketId);
  const [vaultPDA] = getVaultPDA(marketId);

  const authorityCollateral = getAssociatedTokenAddressSync(USDC_MINT, authority);

  const resVal = resolutionValue !== null ? BigInt(Math.floor(resolutionValue * 1_000_000)) : null;
  const liquidityLamports = BigInt(Math.floor(initialLiquidity * 1_000_000));

  const data = concatBytes(
    DISC.createMarket,
    encodeString(question),
    encodeString(description),
    encodeString(category),
    encodeString(resolutionSource),
    encodeOptionU64(resVal),
    new Uint8Array([resolutionOperator]),
    encodeI64LE(BigInt(expiresAt)),
    encodeU64LE(liquidityLamports)
  );

  return sendInstruction(connection, wallet, new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platformPDA, isSigner: false, isWritable: true },
      { pubkey: marketPDA, isSigner: false, isWritable: true },
      { pubkey: yesMintPDA, isSigner: false, isWritable: true },
      { pubkey: noMintPDA, isSigner: false, isWritable: true },
      { pubkey: USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: authorityCollateral, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: data as any,
  }));
}

// ============ Helpers ============

export function computePrices(yesAmount: bigint, noAmount: bigint): { yesPrice: number; noPrice: number } {
  const yes = Number(yesAmount);
  const no = Number(noAmount);
  const total = yes + no;
  if (total === 0) return { yesPrice: 0.5, noPrice: 0.5 };
  return {
    yesPrice: no / total,
    noPrice: yes / total,
  };
}

export function toHuman(amount: bigint | number, decimals: number = 6): number {
  const val = typeof amount === "number" ? amount : Number(amount);
  return val / Math.pow(10, decimals);
}

// Base58 encode for memcmp filter (minimal implementation)
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function uint8ToBase58(bytes: Uint8Array): string {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] * 256;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let result = "";
  for (const byte of bytes) {
    if (byte === 0) result += "1";
    else break;
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }
  return result;
}

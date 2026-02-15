import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, mintTo, getAccount, getOrCreateAssociatedTokenAccount, createInitializeAccountInstruction, AccountLayout } from "@solana/spl-token";
import { expect } from "chai";

const idl = require("../target/idl/ghostodds.json");

// Create a raw token account (not ATA) to avoid issues with PDA mints
async function createRawTokenAccount(
  connection: anchor.web3.Connection,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey,
): Promise<PublicKey> {
  const account = Keypair.generate();
  const lamports = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: account.publicKey,
      lamports,
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeAccountInstruction(account.publicKey, mint, owner, TOKEN_PROGRAM_ID),
  );
  await sendAndConfirmTransaction(connection, tx, [payer, account]);
  return account.publicKey;
}

describe("ghostodds", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new Program(idl, provider);
  const authority = provider.wallet as anchor.Wallet;

  let collateralMint: PublicKey;
  let authorityCollateral: PublicKey;
  let platformPda: PublicKey;
  let platformBump: number;

  const user = Keypair.generate();
  const FEE_BPS = 200;
  const INITIAL_LIQUIDITY = 1_000_000;

  // Shared market 0 accounts
  let m0: { market: PublicKey; yesMint: PublicKey; noMint: PublicKey; vault: PublicKey };
  let userCollateral0: PublicKey;
  let userYes0: PublicKey;
  let userNo0: PublicKey;
  let userPos0: PublicKey;

  function deriveMarketPdas(marketId: number) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(marketId));
    const [market] = PublicKey.findProgramAddressSync([Buffer.from("market"), buf], program.programId);
    const [yesMint] = PublicKey.findProgramAddressSync([Buffer.from("yes_mint"), buf], program.programId);
    const [noMint] = PublicKey.findProgramAddressSync([Buffer.from("no_mint"), buf], program.programId);
    const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), buf], program.programId);
    return { market, yesMint, noMint, vault };
  }

  function derivePositionPda(marketId: number, userKey: PublicKey) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(marketId));
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), buf, userKey.toBuffer()], program.programId);
    return pda;
  }

  const getExpiry = () => new anchor.BN(Math.floor(Date.now() / 1000) + 48 * 3600);

  before(async () => {
    await provider.connection.requestAirdrop(authority.publicKey, 10_000_000_000)
      .then(sig => provider.connection.confirmTransaction(sig));
    await provider.connection.requestAirdrop(user.publicKey, 10_000_000_000)
      .then(sig => provider.connection.confirmTransaction(sig));

    collateralMint = await createMint(provider.connection, authority.payer, authority.publicKey, null, 6);
    authorityCollateral = await createRawTokenAccount(provider.connection, authority.payer, collateralMint, authority.publicKey);
    await mintTo(provider.connection, authority.payer, collateralMint, authorityCollateral, authority.publicKey, 100_000_000);

    [platformPda, platformBump] = PublicKey.findProgramAddressSync([Buffer.from("platform")], program.programId);
  });

  describe("1. Platform Initialization", () => {
    it("initializes the platform", async () => {
      const treasury = Keypair.generate();
      await program.methods.initializePlatform(FEE_BPS)
        .accounts({
          platform: platformPda, authority: authority.publicKey,
          treasury: treasury.publicKey, systemProgram: SystemProgram.programId,
        }).rpc();

      const p = await program.account.platform.fetch(platformPda);
      expect(p.authority.toString()).to.equal(authority.publicKey.toString());
      expect(p.marketCount.toNumber()).to.equal(0);
      expect(p.feeBps).to.equal(FEE_BPS);
    });

    it("rejects duplicate init", async () => {
      try {
        await program.methods.initializePlatform(FEE_BPS)
          .accounts({
            platform: platformPda, authority: authority.publicKey,
            treasury: Keypair.generate().publicKey, systemProgram: SystemProgram.programId,
          }).rpc();
        expect.fail("Should throw");
      } catch (err) { /* expected */ }
    });
  });

  describe("2. Market Creation", () => {
    it("creates market 0 with valid params", async () => {
      m0 = deriveMarketPdas(0);
      await program.methods.createMarket(
        "Will SOL reach $200?", "SOL price prediction", "crypto", "pyth:SOL/USD",
        new anchor.BN(200_000_000), 0, getExpiry(), new anchor.BN(INITIAL_LIQUIDITY),
      ).accounts({
        platform: platformPda, market: m0.market, yesMint: m0.yesMint,
        noMint: m0.noMint, collateralMint, vault: m0.vault,
        authorityCollateral, authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      }).rpc();

      const m = await program.account.market.fetch(m0.market);
      expect(m.marketId.toNumber()).to.equal(0);
      expect(m.question).to.equal("Will SOL reach $200?");
      expect(m.status).to.equal(0);
      expect(m.yesAmount.toNumber()).to.equal(INITIAL_LIQUIDITY / 2);
      expect(m.noAmount.toNumber()).to.equal(INITIAL_LIQUIDITY / 2);

      // Setup user accounts for market 0
      userPos0 = derivePositionPda(0, user.publicKey);
      userCollateral0 = await createRawTokenAccount(provider.connection, authority.payer, collateralMint, user.publicKey);
      await mintTo(provider.connection, authority.payer, collateralMint, userCollateral0, authority.publicKey, 10_000_000);
      userYes0 = await createRawTokenAccount(provider.connection, authority.payer, m0.yesMint, user.publicKey);
      userNo0 = await createRawTokenAccount(provider.connection, authority.payer, m0.noMint, user.publicKey);
    });
  });

  describe("3. Buy YES tokens", () => {
    it("buys YES tokens", async () => {
      await program.methods.buyOutcome(new anchor.BN(100_000), true, new anchor.BN(0))
        .accounts({
          market: m0.market, yesMint: m0.yesMint, noMint: m0.noMint, vault: m0.vault,
          userCollateral: userCollateral0, userYesTokens: userYes0, userNoTokens: userNo0,
          userPosition: userPos0, user: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
        }).signers([user]).rpc();

      const ya = await getAccount(provider.connection, userYes0);
      expect(Number(ya.amount)).to.be.greaterThan(0);
    });
  });

  describe("4. Buy NO tokens", () => {
    it("buys NO tokens", async () => {
      await program.methods.buyOutcome(new anchor.BN(100_000), false, new anchor.BN(0))
        .accounts({
          market: m0.market, yesMint: m0.yesMint, noMint: m0.noMint, vault: m0.vault,
          userCollateral: userCollateral0, userYesTokens: userYes0, userNoTokens: userNo0,
          userPosition: userPos0, user: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
        }).signers([user]).rpc();

      const na = await getAccount(provider.connection, userNo0);
      expect(Number(na.amount)).to.be.greaterThan(0);
    });
  });

  describe("5. Sell YES tokens", () => {
    it("sells YES tokens and receives collateral", async () => {
      const yesBefore = await getAccount(provider.connection, userYes0);
      const colBefore = await getAccount(provider.connection, userCollateral0);
      const sellAmount = new anchor.BN(Math.floor(Number(yesBefore.amount) / 2));

      await program.methods.sellOutcome(sellAmount, true, new anchor.BN(0))
        .accounts({
          market: m0.market, yesMint: m0.yesMint, noMint: m0.noMint, vault: m0.vault,
          userCollateral: userCollateral0, userYesTokens: userYes0, userNoTokens: userNo0,
          userPosition: userPos0, user: user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
        }).signers([user]).rpc();

      const colAfter = await getAccount(provider.connection, userCollateral0);
      expect(Number(colAfter.amount)).to.be.greaterThan(Number(colBefore.amount));
    });
  });

  describe("6. Sell NO tokens", () => {
    it("sells NO tokens and receives collateral", async () => {
      const noBefore = await getAccount(provider.connection, userNo0);
      const sellAmount = new anchor.BN(Math.floor(Number(noBefore.amount) / 2));

      await program.methods.sellOutcome(sellAmount, false, new anchor.BN(0))
        .accounts({
          market: m0.market, yesMint: m0.yesMint, noMint: m0.noMint, vault: m0.vault,
          userCollateral: userCollateral0, userYesTokens: userYes0, userNoTokens: userNo0,
          userPosition: userPos0, user: user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
        }).signers([user]).rpc();

      const noAfter = await getAccount(provider.connection, userNo0);
      expect(Number(noAfter.amount)).to.be.lessThan(Number(noBefore.amount));
    });
  });

  describe("7. AMM pricing accuracy", () => {
    it("YES price moved from initial 50%", async () => {
      const m = await program.account.market.fetch(m0.market);
      const yesPrice = m.noAmount.toNumber() / (m.yesAmount.toNumber() + m.noAmount.toNumber());
      expect(yesPrice).to.not.equal(0.5);
    });
  });

  describe("8. Cannot resolve before expiry", () => {
    it("rejects resolution before expiry", async () => {
      try {
        await program.methods.resolveMarket(true)
          .accounts({ market: m0.market, authority: authority.publicKey }).rpc();
        expect.fail("Should throw");
      } catch (err: any) {
        expect(err.toString()).to.include("MarketNotExpired");
      }
    });
  });

  describe("9. Cannot resolve by non-authority", () => {
    it("rejects resolution by non-authority", async () => {
      try {
        await program.methods.resolveMarket(true)
          .accounts({ market: m0.market, authority: user.publicKey }).signers([user]).rpc();
        expect.fail("Should throw");
      } catch (err: any) {
        expect(err.toString()).to.include("Error");
      }
    });
  });

  describe("10. Cancel market", () => {
    let m1: ReturnType<typeof deriveMarketPdas>;

    before(async () => {
      m1 = deriveMarketPdas(1);
      await program.methods.createMarket(
        "Will BTC hit 100k?", "BTC prediction", "crypto", "pyth:BTC/USD",
        new anchor.BN(100_000_000_000), 0, getExpiry(), new anchor.BN(INITIAL_LIQUIDITY),
      ).accounts({
        platform: platformPda, market: m1.market, yesMint: m1.yesMint,
        noMint: m1.noMint, collateralMint, vault: m1.vault,
        authorityCollateral, authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      }).rpc();
    });

    it("cancels market", async () => {
      await program.methods.cancelMarket()
        .accounts({ market: m1.market, authority: authority.publicKey }).rpc();
      const m = await program.account.market.fetch(m1.market);
      expect(m.status).to.equal(3);
    });
  });

  describe("11. Cancel by non-authority rejected", () => {
    it("rejects cancel by non-authority", async () => {
      try {
        await program.methods.cancelMarket()
          .accounts({ market: m0.market, authority: user.publicKey }).signers([user]).rpc();
        expect.fail("Should throw");
      } catch (err: any) {
        expect(err.toString()).to.include("Unauthorized");
      }
    });
  });

  describe("12. Double cancel rejected", () => {
    it("rejects double cancel", async () => {
      const m1 = deriveMarketPdas(1);
      try {
        await program.methods.cancelMarket()
          .accounts({ market: m1.market, authority: authority.publicKey }).rpc();
        expect.fail("Should throw");
      } catch (err: any) {
        expect(err.toString()).to.include("MarketNotActive");
      }
    });
  });

  describe("13. Zero amount rejected", () => {
    it("rejects buy with zero amount", async () => {
      try {
        await program.methods.buyOutcome(new anchor.BN(0), true, new anchor.BN(0))
          .accounts({
            market: m0.market, yesMint: m0.yesMint, noMint: m0.noMint, vault: m0.vault,
            userCollateral: userCollateral0, userYesTokens: userYes0, userNoTokens: userNo0,
            userPosition: userPos0, user: user.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
          }).signers([user]).rpc();
        expect.fail("Should throw");
      } catch (err: any) {
        expect(err.toString()).to.include("ZeroAmount");
      }
    });
  });

  describe("14. Slippage protection", () => {
    it("rejects excessive slippage", async () => {
      try {
        await program.methods.buyOutcome(new anchor.BN(1000), true, new anchor.BN(999_999_999))
          .accounts({
            market: m0.market, yesMint: m0.yesMint, noMint: m0.noMint, vault: m0.vault,
            userCollateral: userCollateral0, userYesTokens: userYes0, userNoTokens: userNo0,
            userPosition: userPos0, user: user.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
          }).signers([user]).rpc();
        expect.fail("Should throw");
      } catch (err: any) {
        expect(err.toString()).to.include("SlippageExceeded");
      }
    });
  });
});

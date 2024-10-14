import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenTransfer } from "../target/types/token_transfer";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
} from "@solana/spl-token";
import { assert } from "chai";

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  VersionedMessage,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

describe("token-transfer", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TokenTransfer as Program<TokenTransfer>;

  let mint: anchor.web3.PublicKey;
  let fromTokenAccount: anchor.web3.PublicKey;
  let toTokenAccount: anchor.web3.PublicKey;
  let fromWallet: Keypair;
  let toWallet: Keypair;

  const amount = new anchor.BN(1000000);

  async function requestAirdrop(connection: Connection, publicKey: PublicKey) {
    const airdropSignature = await connection.requestAirdrop(
      publicKey,
      LAMPORTS_PER_SOL
    );
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      {
        signature: airdropSignature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );
  }

  before(async () => {
    // Generate two new keypairs
    fromWallet = Keypair.generate();
    toWallet = Keypair.generate();

    // Request SOL for both wallets
    await requestAirdrop(provider.connection, fromWallet.publicKey);
    await requestAirdrop(provider.connection, toWallet.publicKey);

    // let latestBlock = await provider.connection.getLatestBlockhash();
    // // Wait for the airdrop transactions to confirm
    // await provider.connection.confirmTransaction(
    //   latestBlock.blockhash,
    //   "confirmed"
    // );
  });

  it("Initialize test state", async () => {
    mint = await createMint(
      provider.connection,
      fromWallet,
      fromWallet.publicKey,
      null,
      6
    );

    fromTokenAccount = await createAccount(
      provider.connection,
      fromWallet,
      mint,
      fromWallet.publicKey
    );

    toTokenAccount = await createAccount(
      provider.connection,
      toWallet,
      mint,
      toWallet.publicKey
    );

    await mintTo(
      provider.connection,
      fromWallet,
      mint,
      fromTokenAccount,
      fromWallet,
      1000000
    );
  });

  it("Transfer tokens", async () => {
    await program.methods
      .transferToken(amount)
      .accounts({
        from: fromTokenAccount,
        to: toTokenAccount,
        authority: fromWallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([fromWallet])
      .rpc();

    const fromBalance = await provider.connection.getTokenAccountBalance(
      fromTokenAccount
    );
    const toBalance = await provider.connection.getTokenAccountBalance(
      toTokenAccount
    );

    assert.equal(fromBalance.value.amount, "0");
    assert.equal(toBalance.value.amount, "1000000");
  });
});

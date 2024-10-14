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

describe("token-transfer", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TokenTransfer as Program<TokenTransfer>;

  let mint: anchor.web3.PublicKey;
  let fromTokenAccount: anchor.web3.PublicKey;
  let toTokenAccount: anchor.web3.PublicKey;

  const amount = new anchor.BN(1000000);

  it("Initialize test state", async () => {
    mint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      6
    );

    fromTokenAccount = await createAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      provider.wallet.publicKey
    );

    toTokenAccount = await createAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      provider.wallet.publicKey
    );

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      fromTokenAccount,
      provider.wallet.payer,
      1000000
    );
  });

  it("Transfer tokens", async () => {
    await program.methods
      .transferToken(amount)
      .accounts({
        from: fromTokenAccount,
        to: toTokenAccount,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
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

import { BN } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { connection, keypair } from "../constants/constants";
import {
  MIGRATED_FEE_RECIPIENT,
  MIGRATED_FEE_RECIPIENT_ATA,
  MIGRATED_GLOBAL,
  MIGRATED_PUMP_PROGRAM,
  migratedPumpProgram,
} from "../constants/pumpfun/migrated";
import { calculateMinTokensOut } from "./calculate-tokens";

export async function swapMigrated({
  tokenAddress,
  amount,
  side,
  poolAuthority,
}: {
  tokenAddress: string;
  amount: bigint;
  side: "buy" | "sell";
  poolAuthority: PublicKey;
}) {
  const txn = new Transaction();
  const tokenAddressPublicKey = new PublicKey(tokenAddress);
  const wSolMint = new PublicKey("So11111111111111111111111111111111111111112");

  txn.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 225000 }));
  txn.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 4444444 }));

  const accountInfo = await connection.getAccountInfo(tokenAddressPublicKey);
  if (!accountInfo) {
    throw new Error("Mint account not found.");
  }
  const ownerProgramId = accountInfo.owner.toBase58();

  const tokenAta = getAssociatedTokenAddressSync(
    tokenAddressPublicKey,
    keypair.publicKey,
    false,
    new PublicKey(ownerProgramId),
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const ataInfo = await connection.getAccountInfo(tokenAta);

  if (side === "buy") {
    if (!ataInfo) {
      txn.add(
        createAssociatedTokenAccountIdempotentInstruction(
          keypair.publicKey,
          tokenAta,
          keypair.publicKey,
          tokenAddressPublicKey,
          new PublicKey(ownerProgramId),
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }
  } else {
    if (!ataInfo) {
      throw new Error("Associated token account not found.");
    }
  }

  const solAta = getAssociatedTokenAddressSync(
    wSolMint,
    keypair.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const solAtaInfo = await connection.getAccountInfo(solAta);
  if (!solAtaInfo) {
    txn.add(
      createAssociatedTokenAccountIdempotentInstruction(
        keypair.publicKey,
        solAta,
        keypair.publicKey,
        wSolMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  const [pool] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      new BN(0).toArrayLike(Buffer, "le", 2),
      poolAuthority.toBuffer(),
      tokenAddressPublicKey.toBuffer(),
      wSolMint.toBuffer(),
    ],
    MIGRATED_PUMP_PROGRAM
  );

  const poolState = await (migratedPumpProgram.account as any).pool.fetch(pool);

  const baseTokenAccount = await connection.getTokenAccountBalance(
    poolState.poolBaseTokenAccount
  );

  const quoteTokenAccount = await connection.getTokenAccountBalance(
    poolState.poolQuoteTokenAccount
  );

  if (side === "buy") {
    txn.add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: solAta,
        lamports: amount,
      })
    );
    txn.add(createSyncNativeInstruction(solAta, TOKEN_PROGRAM_ID));

    const minTokensOut = calculateMinTokensOut(
      amount,
      BigInt(quoteTokenAccount.value.amount),
      BigInt(baseTokenAccount.value.amount)
    );

    const buyIx = await (migratedPumpProgram.methods as any)
      .buyExactQuoteIn(
        new BN(amount.toString()),
        new BN(minTokensOut.toString()),
        {
          none: {},
        }
      )
      .accounts({
        pool: pool,
        user: keypair.publicKey,
        globalConfig: MIGRATED_GLOBAL,
        baseMint: tokenAddressPublicKey,
        quoteMint: wSolMint,
        userBaseTokenAccount: tokenAta,
        userQuoteTokenAccount: solAta,
        poolBaseTokenAccount: poolState.poolBaseTokenAccount,
        poolQuoteTokenAccount: poolState.poolQuoteTokenAccount,
        protocolFeeRecipient: MIGRATED_FEE_RECIPIENT,
        protocolFeeRecipientTokenAccount: MIGRATED_FEE_RECIPIENT_ATA,
        baseTokenProgram: new PublicKey(ownerProgramId),
        quoteTokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    txn.add(buyIx);

    txn.add(
      createCloseAccountInstruction(
        solAta,
        keypair.publicKey,
        keypair.publicKey,
        [],
        TOKEN_PROGRAM_ID
      )
    );
  } else {
    const sellIx = await (migratedPumpProgram.methods as any)
      .sell(new BN(amount.toString()), new BN(0))
      .accounts({
        pool: pool,
        user: keypair.publicKey,
        globalConfig: MIGRATED_GLOBAL,
        baseMint: tokenAddressPublicKey,
        quoteMint: wSolMint,
        userBaseTokenAccount: tokenAta,
        userQuoteTokenAccount: solAta,
        poolBaseTokenAccount: poolState.poolBaseTokenAccount,
        poolQuoteTokenAccount: poolState.poolQuoteTokenAccount,
        protocolFeeRecipient: MIGRATED_FEE_RECIPIENT,
        protocolFeeRecipientTokenAccount: MIGRATED_FEE_RECIPIENT_ATA,
        baseTokenProgram: new PublicKey(ownerProgramId),
        quoteTokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        eventAuthority: new PublicKey(
          "GS4CU59F31iL7aR2Q8zVS8DRrcRnXX1yjQ66TqNVQnaR"
        ),
        program: MIGRATED_PUMP_PROGRAM,
      })
      .instruction();

    txn.add(sellIx);

    txn.add(
      createCloseAccountInstruction(
        solAta,
        keypair.publicKey,
        keypair.publicKey,
        [],
        TOKEN_PROGRAM_ID
      )
    );
  }

  //   Sign and send the transaction
  txn.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  txn.feePayer = keypair.publicKey;
  txn.sign(keypair);

  const signature = await connection.sendRawTransaction(txn.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  console.log("Transaction sent:", signature);

  // Wait for confirmation
  const confirmation = await connection.confirmTransaction(
    signature,
    "confirmed"
  );

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${confirmation.value.err}`);
  }

  console.log("Transaction confirmed:", signature);
  return signature;
}

import { BN } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { connection, keypair, nozomiRpcClient } from "../constants/constants";
import {
  NON_MIGRATED_MAYHEM_FEE_RECIPIENT,
  NON_MIGRATED_NORMAL_FEE_RECIPIENT,
  NON_MIGRATED_PUMP_PROGRAM,
  nonMigratedPumpProgram,
} from "../constants/pumpfun/non-migrated";

export async function swapNonMigrated({
  tokenAddress,
  amount,
  side,
  bondingCurve,
  minTokensOut,
  isMayhem,
  isJito,
  priorityFee,
  jitoFee,
}: {
  tokenAddress: string;
  amount: bigint;
  side: "buy" | "sell";
  bondingCurve: PublicKey;
  minTokensOut?: bigint;
  isMayhem: boolean;
  isJito: boolean;
  priorityFee: number;
  jitoFee: number;
}) {
  const ixns: TransactionInstruction[] = [];
  const tokenAddressPublicKey = new PublicKey(tokenAddress);

  ixns.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 150000 }));
  ixns.push(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 6666666 })
  );

  const accountInfo = await connection.getAccountInfo(tokenAddressPublicKey);
  if (!accountInfo) {
    throw new Error("Mint account not found.");
  }
  const ownerProgramId = accountInfo.owner.toBase58();

  const ata = getAssociatedTokenAddressSync(
    tokenAddressPublicKey,
    keypair.publicKey,
    false,
    new PublicKey(ownerProgramId),
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const ataInfo = await connection.getAccountInfo(ata);

  if (side === "buy") {
    if (!ataInfo) {
      ixns.push(
        createAssociatedTokenAccountIdempotentInstruction(
          keypair.publicKey,
          ata,
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

  const associatedBondingCurve = getAssociatedTokenAddressSync(
    tokenAddressPublicKey,
    bondingCurve,
    true,
    new PublicKey(ownerProgramId),
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  if (side === "buy") {
    const minTokensOutBN = new BN(minTokensOut ? minTokensOut.toString() : "1");

    const buyIx = await (nonMigratedPumpProgram.methods as any)
      .buyExactSolIn(new BN(amount.toString()), minTokensOutBN, { none: {} })
      .accounts({
        feeRecipient: isMayhem
          ? NON_MIGRATED_MAYHEM_FEE_RECIPIENT
          : NON_MIGRATED_NORMAL_FEE_RECIPIENT,
        mint: tokenAddressPublicKey,
        bondingCurve,
        associatedBondingCurve,
        associatedUser: ata,
        user: keypair.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: new PublicKey(ownerProgramId),
        program: NON_MIGRATED_PUMP_PROGRAM,
      })
      .instruction();

    ixns.push(buyIx);
  } else {
    const minTokensOutBN = new BN(minTokensOut ? minTokensOut.toString() : "1");

    const sellIx = await (nonMigratedPumpProgram.methods as any)
      .sell(new BN(amount.toString()), minTokensOutBN)
      .accounts({
        feeRecipient: isMayhem
          ? NON_MIGRATED_MAYHEM_FEE_RECIPIENT
          : NON_MIGRATED_NORMAL_FEE_RECIPIENT,
        mint: tokenAddressPublicKey,
        bondingCurve,
        associatedBondingCurve,
        associatedUser: ata,
        user: keypair.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: new PublicKey(ownerProgramId),
        program: NON_MIGRATED_PUMP_PROGRAM,
      })
      .instruction();

    ixns.push(sellIx);
  }

  if (isJito) {
    const randomTipAccount = new PublicKey(
      "noz3jAjPiHuBPqiSPkkugaJDkJscPuRhYnSpbi8UvC4"
    );
    ixns.push(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: new PublicKey(randomTipAccount),
        lamports: jitoFee,
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();

    const messageV0 = new TransactionMessage({
      payerKey: keypair.publicKey,
      recentBlockhash: blockhash,
      instructions: ixns,
    }).compileToV0Message();

    const versionedTxn = new VersionedTransaction(messageV0);

    versionedTxn.sign([keypair]);

    const signature = await nozomiRpcClient.sendTransaction(versionedTxn);
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
  } else {
    //   Sign and send the transaction
    const txn = new Transaction();
    txn.add(...ixns);
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
  }
}

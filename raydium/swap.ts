import { API_URLS } from "@raydium-io/raydium-sdk-v2";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import axios from "axios";
import { connection, keypair } from "../constants/constants";

export async function swapRaydium({
  tokenAddress,
  amount,
  side,
  slippage = 500,
}: {
  tokenAddress: string;
  amount: number;
  side: "buy" | "sell";
  slippage?: number;
}) {
  const txVersion = "V0";
  const isV0Tx = txVersion === "V0";
  const wSolMint = new PublicKey("So11111111111111111111111111111111111111112");
  const tokenAddressPublicKey = new PublicKey(tokenAddress);
  const [tokenAccountInfo, tokenMint] = await Promise.all([
    connection.getAccountInfo(tokenAddressPublicKey),
    getMint(connection, tokenAddressPublicKey),
  ]);
  if (!tokenAccountInfo) {
    throw new Error("Token account not found.");
  }
  if (!tokenMint) {
    throw new Error("Token mint not found.");
  }
  const tokenDecimals = tokenMint.decimals;
  const ownerProgramId = tokenAccountInfo.owner.toBase58();
  const tokenAta = getAssociatedTokenAddressSync(
    tokenAddressPublicKey,
    keypair.publicKey,
    false,
    new PublicKey(ownerProgramId),
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const solAta = getAssociatedTokenAddressSync(
    wSolMint,
    keypair.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  try {
    if (side === "buy") {
      const amountInLamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));

      const [{ data: swapResponse }, { data }] = await Promise.all([
        axios.get(
          `${
            API_URLS.SWAP_HOST
          }/compute/swap-base-in?inputMint=So11111111111111111111111111111111111111112&outputMint=${tokenAddressPublicKey.toBase58()}&amount=${amountInLamports}&slippageBps=${slippage}&txVersion=${txVersion}`
        ),
        axios.get<{
          id: string;
          success: boolean;
          data: { default: { vh: number; h: number; m: number } };
        }>(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`),
      ]);

      const { data: swapTransactions } = await axios.post<{
        id: string;
        version: string;
        success: boolean;
        data: { transaction: string }[];
        msg: string | undefined;
      }>(`${API_URLS.SWAP_HOST}/transaction/swap-base-in`, {
        computeUnitPriceMicroLamports: String(data.data.default.h),
        swapResponse,
        txVersion,
        wallet: keypair.publicKey,
        wrapSol: true,
        unwrapSol: true, // true means output mint receive sol, false means output mint received wsol
        inputAccount: solAta.toBase58(),
        outputAccount: tokenAta.toBase58(),
      });

      if (swapTransactions.success == false) {
        console.error(swapTransactions.msg);
        return;
      }

      const allTxBuf = swapTransactions.data.map((tx) =>
        Buffer.from(tx.transaction, "base64")
      );
      const allTransactions = allTxBuf.map((txBuf) =>
        isV0Tx
          ? VersionedTransaction.deserialize(txBuf)
          : Transaction.from(txBuf)
      );

      console.log(
        `total ${allTransactions.length} transactions`,
        swapTransactions
      );

      let idx = 0;
      if (!isV0Tx) {
        for (const tx of allTransactions) {
          console.log(`${++idx} transaction sending...`);
          const transaction = tx as Transaction;
          transaction.sign(keypair);
          const txId = await sendAndConfirmTransaction(
            connection,
            transaction,
            [keypair],
            { skipPreflight: true }
          );
          console.log(`${++idx} transaction confirmed, txId: ${txId}`);
        }
      } else {
        for (const tx of allTransactions) {
          idx++;
          const transaction = tx as VersionedTransaction;
          transaction.sign([keypair]);
          const txId = await connection.sendTransaction(
            tx as VersionedTransaction,
            { skipPreflight: true }
          );
          const { lastValidBlockHeight, blockhash } =
            await connection.getLatestBlockhash({
              commitment: "finalized",
            });
          console.log(`${idx} transaction sending..., txId: ${txId}`);
          await connection.confirmTransaction(
            {
              blockhash,
              lastValidBlockHeight,
              signature: txId,
            },
            "confirmed"
          );
          console.log(`${idx} transaction confirmed`);
        }
      }
    } else {
      const amountInTokens = BigInt(Math.floor(amount * 10 ** tokenDecimals));
      const [{ data: swapResponse }, { data }] = await Promise.all([
        axios.get(
          `${
            API_URLS.SWAP_HOST
          }/compute/swap-base-in?inputMint=${tokenAddressPublicKey.toBase58()}&outputMint=So11111111111111111111111111111111111111112&amount=${amountInTokens}&slippageBps=${slippage}&txVersion=${txVersion}`
        ),
        axios.get<{
          id: string;
          success: boolean;
          data: { default: { vh: number; h: number; m: number } };
        }>(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`),
      ]);

      const { data: swapTransactions } = await axios.post<{
        id: string;
        version: string;
        success: boolean;
        data: { transaction: string }[];
        msg: string | undefined;
      }>(`${API_URLS.SWAP_HOST}/transaction/swap-base-in`, {
        computeUnitPriceMicroLamports: String(data.data.default.h),
        swapResponse,
        txVersion,
        wallet: keypair.publicKey,
        wrapSol: false,
        unwrapSol: true,
        inputAccount: tokenAta.toBase58(),
        outputAccount: solAta.toBase58(),
      });

      if (swapTransactions.success == false) {
        console.error(swapTransactions.msg);
        return;
      }

      const allTxBuf = swapTransactions.data.map((tx) =>
        Buffer.from(tx.transaction, "base64")
      );
      const allTransactions = allTxBuf.map((txBuf) =>
        isV0Tx
          ? VersionedTransaction.deserialize(txBuf)
          : Transaction.from(txBuf)
      );

      console.log(
        `total ${allTransactions.length} transactions`,
        swapTransactions
      );

      let idx = 0;
      if (!isV0Tx) {
        for (const tx of allTransactions) {
          console.log(`${++idx} transaction sending...`);
          const transaction = tx as Transaction;
          transaction.sign(keypair);
          const txId = await sendAndConfirmTransaction(
            connection,
            transaction,
            [keypair],
            { skipPreflight: true }
          );
          console.log(`${++idx} transaction confirmed, txId: ${txId}`);
        }
      } else {
        for (const tx of allTransactions) {
          idx++;
          const transaction = tx as VersionedTransaction;
          transaction.sign([keypair]);
          const txId = await connection.sendTransaction(
            tx as VersionedTransaction,
            { skipPreflight: true }
          );
          const { lastValidBlockHeight, blockhash } =
            await connection.getLatestBlockhash({
              commitment: "finalized",
            });
          console.log(`${idx} transaction sending..., txId: ${txId}`);
          await connection.confirmTransaction(
            {
              blockhash,
              lastValidBlockHeight,
              signature: txId,
            },
            "confirmed"
          );
          console.log(`${idx} transaction confirmed`);
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
}

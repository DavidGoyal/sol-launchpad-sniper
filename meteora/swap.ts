import {
  LAMPORTS_PER_SOL,
  sendAndConfirmRawTransaction,
  sendAndConfirmTransaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { connection, keypair } from "../constants/constants";
import axios from "axios";

export async function swapMeteora({
  tokenAddress,
  amount,
  side,
}: {
  tokenAddress: string;
  amount: number;
  side: "buy" | "sell";
}) {
  try {
    if (side === "buy") {
      const amountInLamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));
      const orderResponse: any = (
        await axios.get(
          "https://api.jup.ag/ultra/v1/order" +
            "?inputMint=So11111111111111111111111111111111111111112" +
            `&outputMint=${tokenAddress}` +
            `&amount=${amountInLamports}` +
            `&taker=${keypair.publicKey.toBase58()}`,
          {
            headers: {
              "x-api-key": "b7495cb2-83bb-4a15-8c47-1f7f7b145c1e",
            },
          }
        )
      ).data;

      console.log(orderResponse);

      const transactionBase64 = orderResponse.transaction;

      // Deserialize, sign and serialize the transaction
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(transactionBase64, "base64")
      );
      transaction.sign([keypair]);

      const signature = await sendAndConfirmRawTransaction(
        connection,
        Buffer.from(transaction.serialize()),
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      );

      console.log("Transaction sent:", signature);
    } else {
      const amountInTokens = BigInt(Math.floor(amount * 10 ** 6));
      const order = await axios.get(
        "https://api.jup.ag/ultra/v1/order" +
          `&inputMint=${tokenAddress}` +
          `&outputMint=So11111111111111111111111111111111111111112` +
          `&amount=${amountInTokens}` +
          `&taker=${keypair.publicKey.toBase58()}`,
        {
          headers: {
            "x-api-key": "b7495cb2-83bb-4a15-8c47-1f7f7b145c1e",
          },
        }
      );
      const orderResponse: any = order.data;

      const transactionBase64 = orderResponse.transaction;

      // Deserialize, sign and serialize the transaction
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(transactionBase64, "base64")
      );
      transaction.sign([keypair]);

      const signature = await sendAndConfirmRawTransaction(
        connection,
        Buffer.from(transaction.serialize()),
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      );

      console.log("Transaction sent:", signature);
    }
  } catch (error) {
    console.error(error);
  }
}

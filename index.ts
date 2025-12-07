import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { swapPumpfun } from "./pumpfun/swap";
import { swapRaydium } from "./raydium/swap";
import { swapMeteora } from "./meteora/swap";

async function main() {
  try {
    const solAmount = 0.1;
    const tokenAmount = 3139029.412752;
    const amountInLamports = BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL));
    const amountInTokens = BigInt(Math.floor(tokenAmount * 10 ** 6));

    await swapPumpfun({
      tokenAddress: "8iNowazt2QMvwcUUz5qipeZMSvoGbeA145T64Xd6pump",
      amount: amountInTokens,
      side: "sell",
      isJito: true,
      jitoFee: 1000000,
    });
  } catch (error) {
    console.error(error);
  }
}

main();

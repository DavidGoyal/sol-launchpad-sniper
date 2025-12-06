import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { swapPumpfun } from "./pumpfun/swap";
import { swapRaydium } from "./raydium/swap";
import { swapMeteora } from "./meteora/swap";

async function main() {
  try {
    const solAmount = 0.1;
    const tokenAmount = 10833.571785;
    const amountInLamports = BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL));
    const amountInTokens = BigInt(Math.floor(tokenAmount * 10 ** 6));

    await swapRaydium({
      tokenAddress: "5SQ4AnAyPf8veVLkTkVb6xYFsQohMVEeHGULkydai454",
      amount: tokenAmount,
      side: "sell",
    });
  } catch (error) {
    console.error(error);
  }
}

main();

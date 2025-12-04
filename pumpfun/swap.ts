import { PublicKey } from "@solana/web3.js";
import {
  NON_MIGRATED_PUMP_PROGRAM,
  nonMigratedPumpProgram,
} from "../constants/pumpfun/non-migrated";
import type { BondingCurveState } from "./calculate-tokens";
import { calculateMinTokensOut } from "./calculate-tokens";
import { swapNonMigrated } from "./swap-non-migrated";
import { swapMigrated } from "./swap-migrated";

export async function swapPumpfun({
  tokenAddress,
  amount,
  side,
  slippageBps = 500,
}: {
  tokenAddress: string;
  amount: bigint;
  side: "buy" | "sell";
  slippageBps?: number;
}) {
  try {
    const bondingCurveInfo = await getBondingCurveStatePumpfun(
      new PublicKey(tokenAddress)
    );

    const curveState = bondingCurveInfo.bondingCurveState;

    if (curveState.complete) {
      console.log("swap migrated");
      await swapMigrated({
        tokenAddress,
        amount,
        side,
        poolAuthority: bondingCurveInfo.poolAuthority,
      });
      return;
    } else {
      const minTokensOut =
        side === "buy"
          ? calculateMinTokensOut(
              amount,
              BigInt(curveState.virtualSolReserves.toString()),
              BigInt(curveState.virtualTokenReserves.toString()),
              slippageBps
            )
          : 0n;

      await swapNonMigrated({
        tokenAddress,
        amount,
        side,
        bondingCurve: bondingCurveInfo.bondingCurve,
        minTokensOut,
        isMayhem: bondingCurveInfo.bondingCurveState.isMayhemMode
          ? true
          : false,
      });
      return;
    }
  } catch (error) {
    console.error(error);
  }
}

async function getBondingCurveStatePumpfun(tokenMint: PublicKey) {
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), tokenMint.toBuffer()],
    NON_MIGRATED_PUMP_PROGRAM
  );

  const [poolAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool-authority"), tokenMint.toBuffer()],
    NON_MIGRATED_PUMP_PROGRAM
  );

  const bondingCurveState: BondingCurveState = await (
    nonMigratedPumpProgram.account as any
  ).bondingCurve.fetch(bondingCurve);

  return {
    bondingCurveState,
    bondingCurve,
    poolAuthority,
  };
}

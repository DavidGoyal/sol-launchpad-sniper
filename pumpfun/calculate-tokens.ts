import { BN } from "@coral-xyz/anchor";

export function calculateTokensOut(
  solIn: bigint,
  virtualSolReserves: bigint,
  virtualTokenReserves: bigint
): bigint {
  const k = virtualSolReserves * virtualTokenReserves;
  const newSolReserves = virtualSolReserves + solIn;
  const newTokenReserves = k / newSolReserves;
  const tokensOut = virtualTokenReserves - newTokenReserves;

  return tokensOut;
}

export function calculateMinTokensOut(
  solIn: bigint,
  virtualSolReserves: bigint,
  virtualTokenReserves: bigint,
  slippageBps: number = 500
): bigint {
  const expectedTokens = calculateTokensOut(
    solIn,
    virtualSolReserves,
    virtualTokenReserves
  );

  const minTokens =
    (expectedTokens * BigInt(10000 - slippageBps)) / BigInt(10000);

  return minTokens;
}

export function calculateSolOut(
  tokensIn: bigint,
  virtualSolReserves: bigint,
  virtualTokenReserves: bigint
): bigint {
  const k = virtualSolReserves * virtualTokenReserves;
  const newTokenReserves = virtualTokenReserves + tokensIn;
  const newSolReserves = k / newTokenReserves;
  const solOut = virtualSolReserves - newSolReserves;

  return solOut;
}

export function calculateMinSolOut(
  tokensIn: bigint,
  virtualSolReserves: bigint,
  virtualTokenReserves: bigint,
  slippageBps: number = 500
): bigint {
  const expectedSol = calculateSolOut(
    tokensIn,
    virtualSolReserves,
    virtualTokenReserves
  );

  const minSol = (expectedSol * BigInt(10000 - slippageBps)) / BigInt(10000);

  return minSol;
}

export interface BondingCurveState {
  virtualTokenReserves: BN;
  virtualSolReserves: BN;
  realTokenReserves: BN;
  realSolReserves: BN;
  tokenTotalSupply: BN;
  complete: boolean;
  creator: any;
  isMayhemMode: boolean;
}

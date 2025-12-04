import { PublicKey } from "@solana/web3.js";
import IDL from "../../pumpfun/non-migrated-idl.json";
import { Program, type Idl } from "@coral-xyz/anchor";
import { provider } from "../constants";

export const NON_MIGRATED_PUMP_PROGRAM = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
);
export const nonMigratedPumpProgram = new Program(IDL as Idl, provider);
export const NON_MIGRATED_NORMAL_FEE_RECIPIENT = new PublicKey(
  "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"
);
export const NON_MIGRATED_MAYHEM_FEE_RECIPIENT = new PublicKey(
  "GesfTA3X2arioaHp8bbKdjG9vJtskViWACZoYvxp4twS"
);

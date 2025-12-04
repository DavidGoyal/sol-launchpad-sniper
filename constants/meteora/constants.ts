import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { provider } from "../constants";
import IDL from "../../meteora/amm.json";

export const METEORA_PROGRAM = new PublicKey(
  "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN"
);
export const METEORA_POOL_AUTHORITY = new PublicKey(
  "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
);

export const meteoraProgram = new Program(IDL, provider);

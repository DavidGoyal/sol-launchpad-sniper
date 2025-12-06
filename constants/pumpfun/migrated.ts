import { Program, type Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import IDL from "../../pumpfun/migrated-idl.json";
import { provider } from "../constants";

export const MIGRATED_PUMP_PROGRAM = new PublicKey(
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA"
);
export const migratedPumpProgram = new Program(IDL as Idl, provider);
export const MIGRATED_GLOBAL = new PublicKey(
  "ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw"
);
export const MIGRATED_FEE_RECIPIENT = new PublicKey(
  "7hTckgnGnLQR6sdH7YkqFTAA7VwTfYFaZ6EhEsU3saCX"
);
export const MIGRATED_FEE_RECIPIENT_ATA = new PublicKey(
  "X5QPJcpph4mBAJDzc4hRziFftSbcygV59kRb2Fu6Je1"
);

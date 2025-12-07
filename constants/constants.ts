import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { Connection, Keypair } from "@solana/web3.js";

export const connection = new Connection(process.env.RPC_URL!);
export const nozomiRpcClient = new Connection(process.env.NOZOMI_RPC_URL!);
const wallet = new Wallet(
  Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY! as string))
);
export const keypair = Keypair.fromSecretKey(
  bs58.decode(process.env.PRIVATE_KEY! as string)
);
export const provider = new AnchorProvider(connection, wallet, {});

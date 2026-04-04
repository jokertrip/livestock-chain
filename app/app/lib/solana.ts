import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs";
import path from "path";

const SOLANA_RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(SOLANA_RPC, "confirmed");
  }
  return _connection;
}

let _keypair: Keypair | null = null;

export function getServerKeypair(): Keypair {
  if (_keypair) return _keypair;

  // Try env var first
  const envKey = process.env.SOLANA_PRIVATE_KEY;
  if (envKey) {
    try {
      _keypair = Keypair.fromSecretKey(bs58.decode(envKey));
      return _keypair;
    } catch {}
  }

  // Try local Solana CLI keypair
  try {
    const idPath = path.join(
      process.env.HOME || "~",
      ".config/solana/id.json"
    );
    const raw = JSON.parse(fs.readFileSync(idPath, "utf8"));
    _keypair = Keypair.fromSecretKey(Uint8Array.from(raw));
    return _keypair;
  } catch {}

  // Fallback: ephemeral
  _keypair = Keypair.generate();
  return _keypair;
}

let _oracleKeypair: Keypair | null = null;

export function getOracleKeypair(): Keypair {
  if (_oracleKeypair) return _oracleKeypair;
  // For hackathon: oracle = separate keypair stored alongside server keypair
  // In real system this would be a secure HSM-backed key
  _oracleKeypair = Keypair.generate();
  return _oracleKeypair;
}

export function getExplorerUrl(txHash: string): string {
  if (SOLANA_RPC.includes("localhost")) {
    return `https://explorer.solana.com/tx/${txHash}?cluster=custom&customUrl=http://localhost:8899`;
  }
  return `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
}

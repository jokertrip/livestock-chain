import { Connection, Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";

// Base58 decode without external dependency
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Decode(str: string): Uint8Array {
  const bytes: number[] = [0];
  for (const char of str) {
    const idx = BASE58_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base58 character: ${char}`);
    for (let j = 0; j < bytes.length; j++) bytes[j] *= 58;
    bytes[0] += idx;
    for (let j = 0; j < bytes.length - 1; j++) {
      bytes[j + 1] += (bytes[j] >> 8);
      bytes[j] &= 0xff;
    }
    while (bytes[bytes.length - 1] > 255) {
      bytes.push(bytes[bytes.length - 1] >> 8);
      bytes[bytes.length - 2] &= 0xff;
    }
  }
  // Leading zeros
  let leadingZeros = 0;
  for (const char of str) { if (char === '1') leadingZeros++; else break; }
  const result = new Uint8Array(leadingZeros + bytes.length);
  for (let i = 0; i < bytes.length; i++) result[leadingZeros + bytes.length - 1 - i] = bytes[i];
  return result;
}

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
      const decoded = base58Decode(envKey);
      _keypair = Keypair.fromSecretKey(decoded);
      console.log("Loaded keypair from env:", _keypair.publicKey.toBase58());
      return _keypair;
    } catch (e) {
      console.error("Failed to decode SOLANA_PRIVATE_KEY:", e);
    }
  } else {
    console.warn("SOLANA_PRIVATE_KEY not set");
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

export function getOracleKeypair(): Keypair {
  // For hackathon: oracle uses same keypair as server (has SOL for fees)
  // In production this would be a separate secure HSM-backed key
  return getServerKeypair();
}

export function getExplorerUrl(txHash: string): string {
  if (SOLANA_RPC.includes("localhost")) {
    return `https://explorer.solana.com/tx/${txHash}?cluster=custom&customUrl=http://localhost:8899`;
  }
  return `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
}

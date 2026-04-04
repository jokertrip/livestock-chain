// ---------- On-chain Struct Types ----------

export interface AnimalRecord {
  govId: string;
  breed: string;
  birthDate: number; // Unix timestamp
  sex: "male" | "female";
  weightKg: number;
  region: string;
  farmName: string;
  vetStatus: string;
  lastInspection: number; // Unix timestamp
  ownerIin: string;
  owner: string; // Solana pubkey (base58)
  registeredAt: number; // Unix timestamp
  updatedAt: number;
}

export interface Listing {
  id: string;
  animalGovId: string;
  seller: string; // Solana pubkey
  priceLamports: number;
  escrowAccount: string; // Solana pubkey
  buyer: string | null;
  status: "active" | "funded" | "completed" | "cancelled";
  createdAt: number;
}

// ---------- API Base ----------

const API_BASE = typeof window === "undefined" ? "" : "";

async function postApi<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${path} failed (${res.status}): ${msg}`);
  }
  return res.json();
}

// ---------- Animal Registry ----------

export interface RegisterAnimalParams {
  govId: string;
  breed: string;
  birthDate: string; // ISO date
  sex: "male" | "female";
  weightKg: number;
  region: string;
  farmName: string;
  ownerIin: string;
  oracleSignature: string;
  oracleMessage: string;
}

/**
 * Register an animal on-chain (calls server-side Anchor route).
 */
export async function registerAnimal(
  params: RegisterAnimalParams
): Promise<{ txSignature: string }> {
  return postApi("/api/chain/register-animal", params);
}

export interface UpdateRecordParams {
  govId: string;
  weightKg?: number;
  vetStatus?: string;
  lastInspection?: string;
}

/**
 * Update an on-chain animal record.
 */
export async function updateRecord(
  params: UpdateRecordParams
): Promise<{ txSignature: string }> {
  return postApi("/api/chain/update-record", params);
}

export interface TransferOwnershipParams {
  govId: string;
  newOwnerPubkey: string;
}

/**
 * Transfer animal ownership on-chain.
 */
export async function transferOwnership(
  params: TransferOwnershipParams
): Promise<{ txSignature: string }> {
  return postApi("/api/chain/transfer-ownership", params);
}

// ---------- Marketplace ----------

export interface CreateListingParams {
  animalGovId: string;
  priceLamports: number;
}

/**
 * Create a marketplace listing on-chain.
 */
export async function createListing(
  params: CreateListingParams
): Promise<{ txSignature: string; listingId: string }> {
  return postApi("/api/chain/create-listing", params);
}

export interface DepositFundsParams {
  listingId: string;
}

/**
 * Deposit funds (buyer escrow) for a listing.
 */
export async function depositFunds(
  params: DepositFundsParams
): Promise<{ txSignature: string }> {
  return postApi("/api/chain/deposit-funds", params);
}

export interface ConfirmSaleParams {
  listingId: string;
}

/**
 * Confirm a sale — releases escrow and transfers ownership.
 */
export async function confirmSale(
  params: ConfirmSaleParams
): Promise<{ txSignature: string }> {
  return postApi("/api/chain/confirm-sale", params);
}

export interface CancelListingParams {
  listingId: string;
}

/**
 * Cancel an active listing.
 */
export async function cancelListing(
  params: CancelListingParams
): Promise<{ txSignature: string }> {
  return postApi("/api/chain/cancel-listing", params);
}

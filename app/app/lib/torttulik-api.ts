// ---------- Type Definitions ----------

export interface Vaccination {
  name: string;
  date: string; // ISO date string
}

export type VetStatus = "healthy" | "observation" | "quarantine";

export interface Animal {
  id: string; // e.g. "KZ-AKM-2021-000001"
  breed: string;
  birth_date: string; // ISO date string
  sex: "male" | "female";
  weight_kg: number;
  region: string;
  farm_name: string;
  vaccinations: Vaccination[];
  vet_status: VetStatus;
  last_inspection: string; // ISO date string
  owner_iin: string;
}

export interface AnimalFilters {
  region?: string;
  breed?: string;
  search?: string;
}

// ---------- API Helpers ----------

const API_BASE =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
    : "";

/**
 * Fetch a single animal by its government ID.
 */
export async function fetchAnimal(govId: string): Promise<Animal | null> {
  const res = await fetch(`${API_BASE}/api/torttulik/${encodeURIComponent(govId)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`TORTTULIK API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch a list of animals with optional filters.
 */
export async function fetchAnimals(filters?: AnimalFilters): Promise<Animal[]> {
  const params = new URLSearchParams();
  if (filters?.region) params.set("region", filters.region);
  if (filters?.breed) params.set("breed", filters.breed);
  if (filters?.search) params.set("search", filters.search);

  const qs = params.toString();
  const url = `${API_BASE}/api/torttulik${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TORTTULIK API error: ${res.status}`);
  return res.json();
}

/**
 * Search animals by ID prefix.
 */
export async function searchAnimals(query: string): Promise<Animal[]> {
  return fetchAnimals({ search: query });
}

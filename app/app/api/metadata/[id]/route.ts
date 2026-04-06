import { NextRequest, NextResponse } from "next/server";
import db from "../../../lib/db.json";

/**
 * Metaplex NFT metadata endpoint (JSON standard).
 * Returns metadata for a cNFT by gov_id.
 * Format: https://docs.metaplex.com/programs/token-metadata/token-standard
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const govId = decodeURIComponent(params.id);
  const animal = db.animals.find(
    (a) => a.id.toLowerCase() === govId.toLowerCase()
  );

  const metadata = {
    name: `Livestock #${govId}`,
    symbol: "LVST",
    description: animal
      ? `Цифровой паспорт животного. Порода: ${animal.breed}. Регион: ${animal.region}. Вес: ${animal.weight_kg} кг. Верифицировано через TORTTULIK.`
      : `Цифровой паспорт животного ${govId}. Верифицировано через блокчейн-оракул.`,
    image: "https://arweave.net/placeholder-livestock-image",
    external_url: `https://app-eta-self-81.vercel.app/animal/${encodeURIComponent(govId)}`,
    attributes: animal
      ? [
          { trait_type: "Gov ID", value: animal.id },
          { trait_type: "Breed", value: animal.breed },
          { trait_type: "Sex", value: animal.sex === "male" ? "Male" : "Female" },
          { trait_type: "Weight (kg)", value: animal.weight_kg },
          { trait_type: "Region", value: animal.region },
          { trait_type: "Farm", value: animal.farm_name },
          { trait_type: "Vet Status", value: animal.vet_status },
          { trait_type: "Birth Date", value: animal.birth_date },
          { trait_type: "Vaccinations", value: animal.vaccinations.length },
        ]
      : [{ trait_type: "Gov ID", value: govId }],
    properties: {
      category: "livestock",
      creators: [{ address: "C4qnXwoXEprGtdhtgPixtMCDmwBqNia5Jayif9cPS5jU", share: 100 }],
    },
  };

  return NextResponse.json(metadata);
}

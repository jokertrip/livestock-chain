import { NextRequest, NextResponse } from "next/server";
import db from "../../lib/db.json";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const breed = searchParams.get("breed");
  const region = searchParams.get("region");
  const search = searchParams.get("search");

  let animals = db.animals;

  if (breed) {
    animals = animals.filter((a) => a.breed === breed);
  }
  if (region) {
    animals = animals.filter((a) => a.region === region);
  }
  if (search) {
    const q = search.toLowerCase();
    animals = animals.filter(
      (a) =>
        a.id.toLowerCase().includes(q) ||
        a.breed.toLowerCase().includes(q) ||
        a.farm_name.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ animals, count: animals.length });
}

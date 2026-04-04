import { NextRequest, NextResponse } from "next/server";
import db from "../../../lib/db.json";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const animal = db.animals.find((a) => a.id === params.id);

  if (!animal) {
    return NextResponse.json(
      { error: "Животное не найдено" },
      { status: 404 }
    );
  }

  return NextResponse.json(animal);
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "../../lib/db.json";

interface Animal {
  id: string;
  [key: string]: unknown;
}

function loadAnimals(): Animal[] {
  return db.animals as Animal[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gov_id } = body;

    if (!gov_id || typeof gov_id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid gov_id" },
        { status: 400 }
      );
    }

    const animals = loadAnimals();
    const animal = animals.find(
      (a) => a.id.toLowerCase() === gov_id.toLowerCase()
    );

    if (!animal) {
      return NextResponse.json(
        { error: "Animal not found in TORTTULIK registry", gov_id },
        { status: 404 }
      );
    }

    // Create a deterministic message from the animal data
    const message = crypto
      .createHash("sha256")
      .update(JSON.stringify(animal))
      .digest("hex");

    // Hackathon "oracle signature": HMAC with a server secret
    // In production this would be an Ed25519 signature from a real oracle keypair
    const oracleSecret = process.env.ORACLE_SECRET || "hackathon-demo-secret";
    const signature = crypto
      .createHmac("sha256", oracleSecret)
      .update(message)
      .digest("hex");

    return NextResponse.json({
      animal,
      verified: true,
      signature,
      message,
    });
  } catch (error) {
    console.error("Verify animal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

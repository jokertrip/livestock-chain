import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { gov_id } = body;

  if (!gov_id) {
    return NextResponse.json(
      { error: "gov_id обязателен" },
      { status: 400 }
    );
  }

  // Placeholder: simulate blockchain registration
  const txHash = `${Array.from({ length: 44 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789"[
      Math.floor(Math.random() * 58)
    ]
  ).join("")}`;

  return NextResponse.json({
    success: true,
    gov_id,
    tx_hash: txHash,
    asset_id: `cnft_${txHash.slice(0, 16)}`,
    timestamp: new Date().toISOString(),
  });
}

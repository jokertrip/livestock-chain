import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../../../lib/solana";
import idl from "../../../lib/idl/livestock_registry.json";

export async function GET(request: NextRequest) {
  const govId = request.nextUrl.searchParams.get("gov_id");
  if (!govId) {
    return NextResponse.json({ error: "gov_id required" }, { status: 400 });
  }

  const programId = new PublicKey(idl.metadata.address);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("animal"), Buffer.from(govId)],
    programId
  );

  try {
    const connection = getConnection();
    const account = await connection.getAccountInfo(pda);
    return NextResponse.json({
      pda: pda.toBase58(),
      exists: account !== null,
    });
  } catch {
    return NextResponse.json({
      pda: pda.toBase58(),
      exists: false,
    });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { getConnection, getServerKeypair } from "../../../lib/solana";
import escrowIdl from "../../../lib/idl/marketplace_escrow.json";

export async function GET(request: NextRequest) {
  const govId = request.nextUrl.searchParams.get("gov_id");
  if (!govId) {
    return NextResponse.json({ error: "gov_id required" }, { status: 400 });
  }

  const escrowProgramId = new PublicKey(escrowIdl.metadata.address);
  const [listingPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), Buffer.from(govId)],
    escrowProgramId
  );

  try {
    const connection = getConnection();
    const account = await connection.getAccountInfo(listingPda);

    if (!account) {
      return NextResponse.json({ exists: false, status: "not_listed" });
    }

    // Decode listing account to get status
    const serverKeypair = getServerKeypair();
    const wallet = {
      publicKey: serverKeypair.publicKey,
      signTransaction: async (tx: unknown) => tx,
      signAllTransactions: async (txs: unknown[]) => txs,
    };
    const provider = new AnchorProvider(connection, wallet as never, { commitment: "confirmed" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const program = new Program(escrowIdl as any, escrowProgramId, provider);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listing = await (program.account as any).listing.fetch(listingPda);

    // ListingStatus enum: Active=0, Funded=1, Completed=2, Cancelled=3
    let status = "active";
    if (listing.status.funded) status = "funded";
    else if (listing.status.completed) status = "completed";
    else if (listing.status.cancelled) status = "cancelled";

    return NextResponse.json({
      exists: true,
      status,
      pda: listingPda.toBase58(),
      priceLamports: listing.priceLamports.toString(),
      seller: listing.seller.toBase58(),
      buyer: listing.buyer?.toBase58() || null,
    });
  } catch {
    return NextResponse.json({ exists: false, status: "not_listed" });
  }
}

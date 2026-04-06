import { NextRequest, NextResponse } from "next/server";
import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import { getConnection, getServerKeypair, getExplorerUrl } from "../../../lib/solana";
import escrowIdl from "../../../lib/idl/marketplace_escrow.json";
import registryIdl from "../../../lib/idl/livestock_registry.json";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gov_id, price_lamports, description } = body;

    if (!gov_id || !price_lamports) {
      return NextResponse.json({ error: "gov_id and price_lamports required" }, { status: 400 });
    }

    const connection = getConnection();
    const serverKeypair = getServerKeypair();

    const wallet = {
      publicKey: serverKeypair.publicKey,
      signTransaction: async (tx: web3.Transaction) => { tx.partialSign(serverKeypair); return tx; },
      signAllTransactions: async (txs: web3.Transaction[]) => { txs.forEach(tx => tx.partialSign(serverKeypair)); return txs; },
    };

    const provider = new AnchorProvider(connection, wallet as never, { commitment: "confirmed" });

    const escrowProgramId = new web3.PublicKey(escrowIdl.metadata.address);
    const registryProgramId = new web3.PublicKey(registryIdl.metadata.address);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const program = new Program(escrowIdl as any, escrowProgramId, provider);

    // PDAs
    const [listingPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), Buffer.from(gov_id)],
      escrowProgramId
    );
    const [animalPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("animal"), Buffer.from(gov_id)],
      registryProgramId
    );

    const tx = await program.methods
      .createListing(
        gov_id,
        new BN(price_lamports),
        { fixedPrice: {} },
        description || "Продажа животного"
      )
      .accounts({
        listing: listingPda,
        animalRecord: animalPda,
        animalRecordMut: animalPda,
        seller: serverKeypair.publicKey,
        registryProgram: registryProgramId,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([serverKeypair])
      .rpc();

    return NextResponse.json({
      success: true,
      gov_id,
      tx_hash: tx,
      explorer_url: getExplorerUrl(tx),
      listing_pda: listingPda.toBase58(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Create listing error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

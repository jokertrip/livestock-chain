import { NextRequest, NextResponse } from "next/server";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { getConnection, getServerKeypair, getExplorerUrl } from "../../../lib/solana";
import escrowIdl from "../../../lib/idl/marketplace_escrow.json";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gov_id } = body;

    if (!gov_id) {
      return NextResponse.json({ error: "gov_id required" }, { status: 400 });
    }

    const connection = getConnection();
    const serverKeypair = getServerKeypair();

    // For hackathon: buyer is also the server keypair (single-wallet demo)
    // In production, buyer would be a different keypair
    const buyerKeypair = web3.Keypair.generate();

    // Airdrop to buyer for demo (only works on localnet/devnet)
    try {
      const sig = await connection.requestAirdrop(buyerKeypair.publicKey, 1_000_000_000);
      await connection.confirmTransaction(sig);
    } catch {
      // On devnet airdrop might fail — use server keypair as buyer fallback
    }

    const wallet = {
      publicKey: serverKeypair.publicKey,
      signTransaction: async (tx: web3.Transaction) => { tx.partialSign(serverKeypair); return tx; },
      signAllTransactions: async (txs: web3.Transaction[]) => { txs.forEach(tx => tx.partialSign(serverKeypair)); return txs; },
    };

    const provider = new AnchorProvider(connection, wallet as never, { commitment: "confirmed" });

    const escrowProgramId = new web3.PublicKey(escrowIdl.metadata.address);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const program = new Program(escrowIdl as any, escrowProgramId, provider);

    const [listingPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), Buffer.from(gov_id)],
      escrowProgramId
    );
    const [vaultPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(gov_id)],
      escrowProgramId
    );

    const tx = await program.methods
      .depositFunds(gov_id)
      .accounts({
        listing: listingPda,
        vault: vaultPda,
        buyer: serverKeypair.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([serverKeypair])
      .rpc();

    return NextResponse.json({
      success: true,
      gov_id,
      tx_hash: tx,
      explorer_url: getExplorerUrl(tx),
      vault_pda: vaultPda.toBase58(),
      status: "funded",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Deposit funds error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

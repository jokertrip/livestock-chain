import { NextRequest, NextResponse } from "next/server";
import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { getConnection, getServerKeypair, getOracleKeypair, getExplorerUrl } from "../../../lib/solana";
import { mintAnimalCNFT } from "../../../lib/bubblegum";
import idl from "../../../lib/idl/livestock_registry.json";

const LIVESTOCK_MINT = new web3.PublicKey("HkUddt9Nm2Wx1USjNhCrYuVo2t5dprExvxHAJhudpefr");
const REWARD_AMOUNT = 10_000_000; // 10 $LIVESTOCK (6 decimals)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gov_id, breed, birth_date, weight_kg, sex, region } = body;

    if (!gov_id) {
      return NextResponse.json({ error: "gov_id обязателен" }, { status: 400 });
    }

    const connection = getConnection();
    const serverKeypair = getServerKeypair();
    const oracleKeypair = getOracleKeypair();


    // Create provider with server keypair
    const wallet = {
      publicKey: serverKeypair.publicKey,
      signTransaction: async (tx: web3.Transaction) => {
        tx.partialSign(serverKeypair);
        return tx;
      },
      signAllTransactions: async (txs: web3.Transaction[]) => {
        txs.forEach((tx) => tx.partialSign(serverKeypair));
        return txs;
      },
    };

    const provider = new AnchorProvider(connection, wallet as never, {
      commitment: "confirmed",
    });

    const programId = new web3.PublicKey(idl.metadata.address);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const program = new Program(idl as any, programId, provider);

    // Find PDA
    const [animalPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("animal"), Buffer.from(gov_id)],
      programId
    );

    // Oracle message and signature (hackathon: oracle is a signer)
    const oracleMessage = Buffer.from(gov_id);
    const oracleSignature = Buffer.alloc(64);

    const birthTimestamp = birth_date
      ? Math.floor(new Date(birth_date).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

    const sexEnum = sex === "female" ? { female: {} } : { male: {} };

    const tx = await program.methods
      .registerAnimal(
        gov_id,
        breed || "Unknown",
        new BN(birthTimestamp),
        weight_kg || 0,
        sexEnum,
        region || "Unknown",
        Buffer.from(oracleSignature),
        Buffer.from(oracleMessage),
      )
      .accounts({
        animalRecord: animalPda,
        owner: serverKeypair.publicKey,
        oracle: oracleKeypair.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([serverKeypair, oracleKeypair])
      .rpc();

    // Mint $LIVESTOCK reward (10 tokens per registration)
    let rewardTx = null;
    try {
      const ownerAta = await getAssociatedTokenAddress(
        LIVESTOCK_MINT,
        serverKeypair.publicKey
      );
      // Check if ATA exists, create if not
      const ataInfo = await connection.getAccountInfo(ownerAta);
      const rewardIxs: web3.TransactionInstruction[] = [];
      if (!ataInfo) {
        rewardIxs.push(
          createAssociatedTokenAccountInstruction(
            serverKeypair.publicKey,
            ownerAta,
            serverKeypair.publicKey,
            LIVESTOCK_MINT
          )
        );
      }
      rewardIxs.push(
        createMintToInstruction(
          LIVESTOCK_MINT,
          ownerAta,
          serverKeypair.publicKey, // mint authority
          REWARD_AMOUNT
        )
      );
      const rewardTxn = new web3.Transaction().add(...rewardIxs);
      rewardTx = await web3.sendAndConfirmTransaction(connection, rewardTxn, [serverKeypair]);
    } catch (rewardError) {
      console.error("Reward mint failed (non-critical):", rewardError);
    }

    // Mint cNFT digital passport
    let cnftResult = null;
    try {
      cnftResult = await mintAnimalCNFT(serverKeypair, {
        govId: gov_id,
        breed: breed || "Unknown",
        region: region || "Unknown",
        weightKg: weight_kg || 0,
        sex: sex || "male",
        birthDate: birth_date || new Date().toISOString(),
        ownerPubkey: serverKeypair.publicKey.toBase58(),
      });
    } catch (cnftError) {
      console.error("cNFT mint failed (non-critical):", cnftError);
    }

    return NextResponse.json({
      success: true,
      gov_id,
      tx_hash: tx,
      explorer_url: getExplorerUrl(tx),
      asset_id: animalPda.toBase58(),
      cnft: cnftResult ? {
        asset_id: cnftResult.assetId,
        tx_signature: cnftResult.txSignature,
      } : null,
      reward: rewardTx ? {
        tx_hash: rewardTx,
        amount: "10 $LIVESTOCK",
        mint: LIVESTOCK_MINT.toBase58(),
      } : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Register animal error:", message);
    return NextResponse.json(
      { error: "Ошибка регистрации: " + message },
      { status: 500 }
    );
  }
}

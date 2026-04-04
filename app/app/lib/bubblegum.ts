import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createTree,
  mintV1,
  mplBubblegum,
} from "@metaplex-foundation/mpl-bubblegum";
import {
  generateSigner,
  keypairIdentity,
  publicKey,
  type Umi,
} from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { Keypair } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

let _umi: Umi | null = null;
let _treePubkey: string | null = null;

export function getUmi(serverKeypair: Keypair): Umi {
  if (_umi) return _umi;
  _umi = createUmi(RPC_URL).use(mplBubblegum());
  const umiKeypair = fromWeb3JsKeypair(serverKeypair);
  _umi.use(keypairIdentity(umiKeypair));
  return _umi;
}

/**
 * Create a Merkle tree for cNFTs (one-time setup).
 * maxDepth=14, maxBufferSize=64 → supports up to 16384 cNFTs.
 */
export async function initMerkleTree(serverKeypair: Keypair): Promise<string> {
  if (_treePubkey) return _treePubkey;

  const umi = getUmi(serverKeypair);
  const merkleTree = generateSigner(umi);

  const builder = await createTree(umi, {
    merkleTree,
    maxDepth: 14,
    maxBufferSize: 64,
  });

  await builder.sendAndConfirm(umi, { confirm: { commitment: "finalized" } });
  _treePubkey = merkleTree.publicKey.toString();
  console.log("Merkle tree created:", _treePubkey);

  return _treePubkey;
}

/**
 * Mint a compressed NFT (cNFT) as a digital passport for an animal.
 */
export async function mintAnimalCNFT(
  serverKeypair: Keypair,
  params: {
    govId: string;
    breed: string;
    region: string;
    weightKg: number;
    sex: string;
    birthDate: string;
    ownerPubkey: string;
  }
): Promise<{ assetId: string; txSignature: string }> {
  const umi = getUmi(serverKeypair);
  const treePubkey = await initMerkleTree(serverKeypair);

  const { govId, ownerPubkey } = params;

  const result = await mintV1(umi, {
    leafOwner: publicKey(ownerPubkey),
    merkleTree: publicKey(treePubkey),
    metadata: {
      name: `Livestock #${govId}`,
      symbol: "LVST",
      uri: "",
      sellerFeeBasisPoints: 0,
      collection: null,
      creators: [
        {
          address: umi.identity.publicKey,
          verified: false,
          share: 100,
        },
      ],
    },
  }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

  const txSignature = Buffer.from(result.signature).toString("base64");
  const assetId = `cnft_${govId}`;

  console.log(`cNFT minted for ${govId}: tx=${txSignature}`);

  return { assetId, txSignature };
}

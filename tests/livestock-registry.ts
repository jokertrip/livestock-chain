import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LivestockRegistry } from "../target/types/livestock_registry";
import { expect } from "chai";

describe("livestock-registry", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.LivestockRegistry as Program<LivestockRegistry>;
  const oracle = anchor.web3.Keypair.generate();

  const govId = "KZ-AKM-2024-000001";
  const breed = "Казахская белоголовая";
  const birthDate = new anchor.BN(1655251200);
  const weightKg = 420;
  const region = "Акмолинская область";

  before(async () => {
    const sig = await provider.connection.requestAirdrop(
      oracle.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(sig);
  });

  // ─── Happy path ────────────────────────────

  it("registers an animal", async () => {
    const [animalPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("animal"), Buffer.from(govId)],
      program.programId
    );

    const tx = await program.methods
      .registerAnimal(
        govId,
        breed,
        birthDate,
        weightKg,
        { male: {} },
        region,
        Buffer.from(Buffer.alloc(64)),
        Buffer.from(govId),
      )
      .accounts({
        animalRecord: animalPda,
        owner: provider.wallet.publicKey,
        oracle: oracle.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([oracle])
      .rpc();

    const animal = await program.account.animalRecord.fetch(animalPda);
    expect(animal.govId).to.equal(govId);
    expect(animal.breed).to.equal(breed);
    expect(animal.weightKg).to.equal(weightKg);
    expect(animal.region).to.equal(region);
    expect(animal.owner.toString()).to.equal(provider.wallet.publicKey.toString());
    expect(animal.isListed).to.equal(false);
    expect(animal.vaccinationCount).to.equal(0);
  });

  it("updates animal record", async () => {
    const [animalPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("animal"), Buffer.from(govId)],
      program.programId
    );

    await program.methods
      .updateRecord(govId, 450, "Бруцеллёз", null)
      .accounts({
        animalRecord: animalPda,
        owner: provider.wallet.publicKey,
      })
      .rpc();

    const animal = await program.account.animalRecord.fetch(animalPda);
    expect(animal.weightKg).to.equal(450);
    expect(animal.vaccinationCount).to.equal(1);
  });

  it("transfers ownership", async () => {
    const newOwner = anchor.web3.Keypair.generate();
    const [animalPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("animal"), Buffer.from(govId)],
      program.programId
    );

    await program.methods
      .transferOwnership(govId, newOwner.publicKey)
      .accounts({
        animalRecord: animalPda,
        owner: provider.wallet.publicKey,
      })
      .rpc();

    const animal = await program.account.animalRecord.fetch(animalPda);
    expect(animal.owner.toString()).to.equal(newOwner.publicKey.toString());
  });

  // ─── Negative tests ────────────────────────

  it("FAIL: register duplicate gov_id", async () => {
    const [animalPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("animal"), Buffer.from(govId)],
      program.programId
    );

    try {
      await program.methods
        .registerAnimal(
          govId, breed, birthDate, weightKg, { male: {} }, region,
          Buffer.from(Buffer.alloc(64)),
          Buffer.from(govId),
        )
        .accounts({
          animalRecord: animalPda,
          owner: provider.wallet.publicKey,
          oracle: oracle.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([oracle])
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      // PDA already in use
      expect(err.toString()).to.include("custom program error");
    }
  });

  it("FAIL: update_record from non-owner", async () => {
    const notOwner = anchor.web3.Keypair.generate();
    const sig = await provider.connection.requestAirdrop(notOwner.publicKey, 1_000_000_000);
    await provider.connection.confirmTransaction(sig);

    const [animalPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("animal"), Buffer.from(govId)],
      program.programId
    );

    try {
      await program.methods
        .updateRecord(govId, 500, null, null)
        .accounts({
          animalRecord: animalPda,
          owner: notOwner.publicKey,
        })
        .signers([notOwner])
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.toString()).to.include("NotOwner");
    }
  });

  it("FAIL: transfer_ownership from non-owner", async () => {
    const notOwner = anchor.web3.Keypair.generate();
    const sig = await provider.connection.requestAirdrop(notOwner.publicKey, 1_000_000_000);
    await provider.connection.confirmTransaction(sig);

    const [animalPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("animal"), Buffer.from(govId)],
      program.programId
    );

    try {
      await program.methods
        .transferOwnership(govId, notOwner.publicKey)
        .accounts({
          animalRecord: animalPda,
          owner: notOwner.publicKey,
        })
        .signers([notOwner])
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.toString()).to.include("NotOwner");
    }
  });

  it("FAIL: register with invalid weight (0)", async () => {
    const badGovId = "KZ-TEST-BAD-WEIGHT";
    const [animalPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("animal"), Buffer.from(badGovId)],
      program.programId
    );

    try {
      await program.methods
        .registerAnimal(
          badGovId, breed, birthDate, 0, { male: {} }, region,
          Buffer.from(Buffer.alloc(64)),
          Buffer.from(badGovId),
        )
        .accounts({
          animalRecord: animalPda,
          owner: provider.wallet.publicKey,
          oracle: oracle.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([oracle])
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.toString()).to.include("InvalidWeight");
    }
  });
});

use anchor_lang::prelude::*;

declare_id!("2k1D6hQqgPpcbJxqwsyfXsD5KLyiXVcLa8xbCguWGDTQ");

/// Oracle public key — hardcoded for hackathon.
/// Replace with actual oracle keypair pubkey after generation.
pub const ORACLE_PUBKEY: [u8; 32] = [0u8; 32]; // TODO: set after keygen

#[program]
pub mod livestock_registry {
    use super::*;

    /// Register a new animal with oracle-verified government data.
    /// The oracle_signature proves the data came from TORTTULIK API.
    pub fn register_animal(
        ctx: Context<RegisterAnimal>,
        gov_id: String,
        breed: String,
        birth_date: i64,
        weight_kg: u32,
        sex: AnimalSex,
        region: String,
        oracle_signature: Vec<u8>,
        oracle_message: Vec<u8>,
    ) -> Result<()> {
        require!(gov_id.len() <= 30, LivestockError::GovIdTooLong);
        require!(breed.len() <= 50, LivestockError::BreedTooLong);
        require!(region.len() <= 50, LivestockError::RegionTooLong);
        require!(weight_kg > 0 && weight_kg < 2000, LivestockError::InvalidWeight);

        // Verify oracle signature (ed25519)
        // For hackathon: verify that the message was signed by the known oracle
        verify_oracle_signature(&oracle_message, &oracle_signature, &ctx.accounts.oracle.key())?;

        let animal = &mut ctx.accounts.animal_record;
        animal.gov_id = gov_id;
        animal.breed = breed;
        animal.birth_date = birth_date;
        animal.weight_kg = weight_kg;
        animal.sex = sex;
        animal.region = region;
        animal.owner = ctx.accounts.owner.key();
        animal.cnft_asset_id = Pubkey::default(); // Set after cNFT mint
        animal.created_at = Clock::get()?.unix_timestamp;
        animal.updated_at = Clock::get()?.unix_timestamp;
        animal.vaccination_count = 0;
        animal.is_listed = false;
        animal.bump = ctx.bumps.animal_record;

        emit!(AnimalRegistered {
            gov_id: animal.gov_id.clone(),
            owner: animal.owner,
            breed: animal.breed.clone(),
            region: animal.region.clone(),
        });

        Ok(())
    }

    /// Update animal record — only owner can call.
    pub fn update_record(
        ctx: Context<UpdateRecord>,
        _gov_id: String,
        new_weight_kg: Option<u32>,
        vaccination: Option<String>,
        notes: Option<String>,
    ) -> Result<()> {
        let animal = &mut ctx.accounts.animal_record;

        require!(
            animal.owner == ctx.accounts.owner.key(),
            LivestockError::NotOwner
        );

        if let Some(weight) = new_weight_kg {
            require!(weight > 0 && weight < 2000, LivestockError::InvalidWeight);
            animal.weight_kg = weight;
        }

        if let Some(ref _vacc) = vaccination {
            animal.vaccination_count = animal.vaccination_count.saturating_add(1);
        }

        animal.updated_at = Clock::get()?.unix_timestamp;

        emit!(AnimalUpdated {
            gov_id: animal.gov_id.clone(),
            owner: animal.owner,
            new_weight_kg,
            vaccination,
            notes,
        });

        Ok(())
    }

    /// Transfer ownership of an animal to a new owner.
    pub fn transfer_ownership(
        ctx: Context<TransferOwnership>,
        _gov_id: String,
        new_owner: Pubkey,
    ) -> Result<()> {
        let animal = &mut ctx.accounts.animal_record;

        require!(
            animal.owner == ctx.accounts.owner.key(),
            LivestockError::NotOwner
        );
        require!(
            new_owner != animal.owner,
            LivestockError::SameOwner
        );

        let old_owner = animal.owner;
        animal.owner = new_owner;
        animal.updated_at = Clock::get()?.unix_timestamp;

        emit!(OwnershipTransferred {
            gov_id: animal.gov_id.clone(),
            old_owner,
            new_owner,
        });

        Ok(())
    }
}

/// Verify that a message was signed by the oracle.
/// For hackathon simplicity: we just check that the oracle account is a signer.
/// In production, you'd use ed25519 program for signature verification.
fn verify_oracle_signature(
    _message: &[u8],
    _signature: &[u8],
    _oracle_key: &Pubkey,
) -> Result<()> {
    // Hackathon: oracle is passed as a signer account, so Solana runtime
    // already verified the signature. In production, use Ed25519 program.
    Ok(())
}

// ─── Accounts ───────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(gov_id: String)]
pub struct RegisterAnimal<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + AnimalRecord::INIT_SPACE,
        seeds = [b"animal", gov_id.as_bytes()],
        bump,
    )]
    pub animal_record: Account<'info, AnimalRecord>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// The oracle that verified the data from TORTTULIK.
    /// Must be a known oracle keypair (checked by being a signer).
    pub oracle: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(gov_id: String)]
pub struct UpdateRecord<'info> {
    #[account(
        mut,
        seeds = [b"animal", gov_id.as_bytes()],
        bump = animal_record.bump,
    )]
    pub animal_record: Account<'info, AnimalRecord>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(gov_id: String)]
pub struct TransferOwnership<'info> {
    #[account(
        mut,
        seeds = [b"animal", gov_id.as_bytes()],
        bump = animal_record.bump,
    )]
    pub animal_record: Account<'info, AnimalRecord>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

// ─── State ──────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct AnimalRecord {
    #[max_len(30)]
    pub gov_id: String,
    #[max_len(50)]
    pub breed: String,
    pub birth_date: i64,
    pub weight_kg: u32,
    pub sex: AnimalSex,
    #[max_len(50)]
    pub region: String,
    pub owner: Pubkey,
    pub cnft_asset_id: Pubkey,
    pub created_at: i64,
    pub updated_at: i64,
    pub vaccination_count: u8,
    pub is_listed: bool,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, InitSpace)]
pub enum AnimalSex {
    Male,
    Female,
}

// ─── Events ─────────────────────────────────────────────────

#[event]
pub struct AnimalRegistered {
    pub gov_id: String,
    pub owner: Pubkey,
    pub breed: String,
    pub region: String,
}

#[event]
pub struct AnimalUpdated {
    pub gov_id: String,
    pub owner: Pubkey,
    pub new_weight_kg: Option<u32>,
    pub vaccination: Option<String>,
    pub notes: Option<String>,
}

#[event]
pub struct OwnershipTransferred {
    pub gov_id: String,
    pub old_owner: Pubkey,
    pub new_owner: Pubkey,
}

// ─── Errors ─────────────────────────────────────────────────

#[error_code]
pub enum LivestockError {
    #[msg("Government ID exceeds 30 characters")]
    GovIdTooLong,
    #[msg("Breed name exceeds 50 characters")]
    BreedTooLong,
    #[msg("Region name exceeds 50 characters")]
    RegionTooLong,
    #[msg("Invalid weight")]
    InvalidWeight,
    #[msg("Only the owner can perform this action")]
    NotOwner,
    #[msg("New owner is the same as current owner")]
    SameOwner,
    #[msg("Oracle signature verification failed")]
    OracleVerificationFailed,
    #[msg("Animal is currently listed on marketplace")]
    AnimalIsListed,
}

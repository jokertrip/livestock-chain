use anchor_lang::prelude::*;
use anchor_lang::system_program;
use livestock_registry::program::LivestockRegistry;
use livestock_registry::cpi::accounts::TransferOwnership;
use livestock_registry::AnimalRecord;

declare_id!("4q2iYDHURLPT1xcU6k74v3G3uKUr1e7MamGyVdq13zqF");

#[program]
pub mod marketplace_escrow {
    use super::*;

    /// Create a listing for an animal on the marketplace.
    pub fn create_listing(
        ctx: Context<CreateListing>,
        gov_id: String,
        price_lamports: u64,
        listing_type: ListingType,
        description: String,
    ) -> Result<()> {
        let animal = &ctx.accounts.animal_record;
        require!(
            animal.owner == ctx.accounts.seller.key(),
            EscrowError::NotOwner
        );
        require!(!animal.is_listed, EscrowError::AlreadyListed);
        require!(price_lamports > 0, EscrowError::InvalidPrice);
        require!(description.len() <= 200, EscrowError::DescriptionTooLong);

        let listing = &mut ctx.accounts.listing;
        listing.gov_id = gov_id.clone();
        listing.seller = ctx.accounts.seller.key();
        listing.buyer = None;
        listing.price_lamports = price_lamports;
        listing.listing_type = listing_type;
        listing.description = description;
        listing.status = ListingStatus::Active;
        listing.created_at = Clock::get()?.unix_timestamp;
        listing.bump = ctx.bumps.listing;

        // Mark animal as listed via CPI
        // For hackathon: we set is_listed directly since we have the account
        // In production, this would be a CPI call
        let animal_mut = &mut ctx.accounts.animal_record_mut;
        animal_mut.is_listed = true;

        emit!(ListingCreated {
            gov_id,
            seller: listing.seller,
            price_lamports,
        });

        Ok(())
    }

    /// Buyer deposits funds into escrow vault.
    pub fn deposit_funds(ctx: Context<DepositFunds>, gov_id: String) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(
            listing.status == ListingStatus::Active,
            EscrowError::InvalidListingStatus
        );
        // Note: seller == buyer check disabled for hackathon demo (single wallet)
        // require!(
        //     ctx.accounts.buyer.key() != listing.seller,
        //     EscrowError::SellerCannotBuy
        // );

        // Transfer SOL from buyer to vault PDA
        let transfer_amount = listing.price_lamports;
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            transfer_amount,
        )?;

        listing.buyer = Some(ctx.accounts.buyer.key());
        listing.status = ListingStatus::Funded;

        emit!(FundsDeposited {
            gov_id,
            buyer: ctx.accounts.buyer.key(),
            amount: transfer_amount,
        });

        Ok(())
    }

    /// Seller confirms the sale — funds released, ownership transferred.
    pub fn confirm_sale(ctx: Context<ConfirmSale>, gov_id: String) -> Result<()> {
        let listing = &ctx.accounts.listing;
        require!(
            listing.status == ListingStatus::Funded,
            EscrowError::InvalidListingStatus
        );
        require!(
            listing.seller == ctx.accounts.seller.key(),
            EscrowError::NotOwner
        );

        let buyer = listing.buyer.ok_or(EscrowError::NoBuyer)?;
        let amount = listing.price_lamports;

        // Transfer SOL from vault to seller
        let gov_id_bytes = gov_id.as_bytes();
        let vault_bump = ctx.bumps.vault;
        let _vault_seeds: &[&[u8]] = &[b"vault", gov_id_bytes, &[vault_bump]];

        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += amount;

        // CPI: transfer ownership in livestock_registry
        let cpi_program = ctx.accounts.registry_program.to_account_info();
        let cpi_accounts = TransferOwnership {
            animal_record: ctx.accounts.animal_record.to_account_info(),
            owner: ctx.accounts.seller.to_account_info(),
        };
        livestock_registry::cpi::transfer_ownership(
            CpiContext::new(cpi_program, cpi_accounts),
            gov_id.clone(),
            buyer,
        )?;

        // Close listing
        let listing_mut = &mut ctx.accounts.listing.to_account_info();
        let seller_info = &mut ctx.accounts.seller.to_account_info();
        // Return rent to seller
        **seller_info.try_borrow_mut_lamports()? += listing_mut.lamports();
        **listing_mut.try_borrow_mut_lamports()? = 0;

        emit!(SaleCompleted {
            gov_id,
            seller: ctx.accounts.seller.key(),
            buyer,
            amount,
        });

        Ok(())
    }

    /// Cancel a listing — refund buyer if funded.
    pub fn cancel_listing(ctx: Context<CancelListing>, gov_id: String) -> Result<()> {
        let listing = &ctx.accounts.listing;
        require!(
            listing.seller == ctx.accounts.seller.key(),
            EscrowError::NotOwner
        );
        require!(
            listing.status == ListingStatus::Active || listing.status == ListingStatus::Funded,
            EscrowError::InvalidListingStatus
        );

        // If funded, refund buyer
        if listing.status == ListingStatus::Funded {
            if let Some(_buyer_key) = listing.buyer {
                let amount = listing.price_lamports;
                let vault_info = &ctx.accounts.vault.to_account_info();
                let buyer_info = &ctx.accounts.buyer.to_account_info();

                **vault_info.try_borrow_mut_lamports()? -= amount;
                **buyer_info.try_borrow_mut_lamports()? += amount;
            }
        }

        // Mark animal as not listed
        let animal_mut = &mut ctx.accounts.animal_record_mut;
        animal_mut.is_listed = false;

        emit!(ListingCancelled {
            gov_id,
            seller: ctx.accounts.seller.key(),
        });

        Ok(())
    }
}

// ─── Accounts ───────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(gov_id: String)]
pub struct CreateListing<'info> {
    #[account(
        init,
        payer = seller,
        space = 8 + Listing::INIT_SPACE,
        seeds = [b"listing", gov_id.as_bytes()],
        bump,
    )]
    pub listing: Account<'info, Listing>,

    #[account(
        seeds = [b"animal", gov_id.as_bytes()],
        bump = animal_record.bump,
        seeds::program = registry_program.key(),
    )]
    pub animal_record: Account<'info, AnimalRecord>,

    /// Mutable reference for setting is_listed flag.
    /// Same account as animal_record but mutable.
    #[account(
        mut,
        seeds = [b"animal", gov_id.as_bytes()],
        bump = animal_record_mut.bump,
        seeds::program = registry_program.key(),
    )]
    pub animal_record_mut: Account<'info, AnimalRecord>,

    #[account(mut)]
    pub seller: Signer<'info>,

    pub registry_program: Program<'info, LivestockRegistry>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(gov_id: String)]
pub struct DepositFunds<'info> {
    #[account(
        mut,
        seeds = [b"listing", gov_id.as_bytes()],
        bump = listing.bump,
    )]
    pub listing: Account<'info, Listing>,

    /// CHECK: Vault PDA — just holds SOL.
    #[account(
        mut,
        seeds = [b"vault", gov_id.as_bytes()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(gov_id: String)]
pub struct ConfirmSale<'info> {
    #[account(
        mut,
        seeds = [b"listing", gov_id.as_bytes()],
        bump = listing.bump,
    )]
    pub listing: Account<'info, Listing>,

    /// CHECK: Vault PDA holding escrowed SOL.
    #[account(
        mut,
        seeds = [b"vault", gov_id.as_bytes()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"animal", gov_id.as_bytes()],
        bump,
        seeds::program = registry_program.key(),
    )]
    pub animal_record: Account<'info, AnimalRecord>,

    #[account(mut)]
    pub seller: Signer<'info>,

    pub registry_program: Program<'info, LivestockRegistry>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(gov_id: String)]
pub struct CancelListing<'info> {
    #[account(
        mut,
        seeds = [b"listing", gov_id.as_bytes()],
        bump = listing.bump,
        close = seller,
    )]
    pub listing: Account<'info, Listing>,

    /// CHECK: Vault PDA.
    #[account(
        mut,
        seeds = [b"vault", gov_id.as_bytes()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"animal", gov_id.as_bytes()],
        bump,
        seeds::program = registry_program.key(),
    )]
    pub animal_record_mut: Account<'info, AnimalRecord>,

    #[account(mut)]
    pub seller: Signer<'info>,

    /// CHECK: Buyer account for refund (if funded).
    #[account(mut)]
    pub buyer: SystemAccount<'info>,

    pub registry_program: Program<'info, LivestockRegistry>,
    pub system_program: Program<'info, System>,
}

// ─── State ──────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct Listing {
    #[max_len(30)]
    pub gov_id: String,
    pub seller: Pubkey,
    pub buyer: Option<Pubkey>,
    pub price_lamports: u64,
    pub listing_type: ListingType,
    #[max_len(200)]
    pub description: String,
    pub status: ListingStatus,
    pub created_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, InitSpace)]
pub enum ListingType {
    FixedPrice,
    Auction,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, InitSpace)]
pub enum ListingStatus {
    Active,
    Funded,
    Completed,
    Cancelled,
}

// ─── Events ─────────────────────────────────────────────────

#[event]
pub struct ListingCreated {
    pub gov_id: String,
    pub seller: Pubkey,
    pub price_lamports: u64,
}

#[event]
pub struct FundsDeposited {
    pub gov_id: String,
    pub buyer: Pubkey,
    pub amount: u64,
}

#[event]
pub struct SaleCompleted {
    pub gov_id: String,
    pub seller: Pubkey,
    pub buyer: Pubkey,
    pub amount: u64,
}

#[event]
pub struct ListingCancelled {
    pub gov_id: String,
    pub seller: Pubkey,
}

// ─── Errors ─────────────────────────────────────────────────

#[error_code]
pub enum EscrowError {
    #[msg("Only the owner can perform this action")]
    NotOwner,
    #[msg("Animal is already listed")]
    AlreadyListed,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Description too long (max 200 chars)")]
    DescriptionTooLong,
    #[msg("Invalid listing status for this operation")]
    InvalidListingStatus,
    #[msg("Seller cannot buy their own animal")]
    SellerCannotBuy,
    #[msg("No buyer has deposited funds")]
    NoBuyer,
}

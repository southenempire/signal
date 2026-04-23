import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { readFileSync } from 'fs';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const protocolWallet = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8')))
);

async function setup() {
    console.log('🚀 Creating mock USDC mint on Devnet...');
    const mint = await createMint(
        connection,
        protocolWallet, // payer
        protocolWallet.publicKey, // mintAuthority
        protocolWallet.publicKey, // freezeAuthority
        6 // decimals (USDC uses 6)
    );
    console.log('💵 Mint Address:', mint.toBase58());

    console.log('🏦 Creating associated token account for Protocol Wallet...');
    const ata = await getOrCreateAssociatedTokenAccount(
        connection,
        protocolWallet,
        mint,
        protocolWallet.publicKey
    );
    console.log('💼 ATA:', ata.address.toBase58());

    console.log('💸 Minting 1,000,000 mock USDC to the Protocol Wallet...');
    await mintTo(
        connection,
        protocolWallet,
        mint,
        ata.address,
        protocolWallet,
        1_000_000 * 1_000_000 // 1 million tokens with 6 decimals
    );
    console.log('✅ Success! The devnet mock USDC is ready.');
}

setup().catch(console.error);

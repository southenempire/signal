import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Idl, Wallet } from '@coral-xyz/anchor';
import { BN } from 'bn.js';

export class SignalClient {
    public program: Program;
    public connection: Connection;

    constructor(programId: string, rpcUrl: string, wallet: any) {
        this.connection = new Connection(rpcUrl);
        const provider = new AnchorProvider(this.connection, wallet, {
            commitment: 'confirmed',
        });
        
        // The IDL would normally be imported from the build artifacts
        this.program = new Program({} as Idl, new PublicKey(programId), provider);
    }

    /**
     * Derives the Global State PDA
     */
    public getGlobalStateAddress(): PublicKey {
        const [address] = PublicKey.findProgramAddressSync(
            [Buffer.from("global-state")],
            this.program.programId
        );
        return address;
    }

    /**
     * Derives a Category PDA based on its name
     */
    public getCategoryAddress(name: string): PublicKey {
        const [address] = PublicKey.findProgramAddressSync(
            [Buffer.from("category"), Buffer.from(name)],
            this.program.programId
        );
        return address;
    }

    /**
     * Derives a Submission PDA for a specific reporter and category
     */
    public getSubmissionAddress(category: PublicKey, reporter: PublicKey): PublicKey {
        const [address] = PublicKey.findProgramAddressSync(
            [Buffer.from("submission"), category.toBuffer(), reporter.toBuffer()],
            this.program.programId
        );
        return address;
    }

    /**
     * Submits a data report with the required 0.01 SOL stake
     */
    public async submitReport(
        categoryName: string,
        value: number,
        locationHash: number[],
        imageHash: number[]
    ) {
        const category = this.getCategoryAddress(categoryName);
        const reporter = this.program.provider.publicKey!;
        const submission = this.getSubmissionAddress(category, reporter);

        return await this.program.methods
            .submitReport(new BN(value), locationHash, imageHash)
            .accounts({
                submission,
                category,
                reporter,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
    }

    /**
     * Purchases verified data from the protocol
     */
    public async purchaseData(categoryName: string, verifier: PublicKey) {
        const category = this.getCategoryAddress(categoryName);
        const globalState = this.getGlobalStateAddress();
        
        // In a real implementation, we fetch the global state to get the fee_recipient
        const state: any = await this.program.account.globalState.fetch(globalState);
        const feeRecipient = state.feeRecipient;

        return await this.program.methods
            .purchaseData()
            .accounts({
                buyer: this.program.provider.publicKey!,
                feeRecipient,
                verifier,
                category,
                globalState,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
    }
}

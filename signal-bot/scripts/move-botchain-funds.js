/**
 * Move all BOT from a compromised BOTChain wallet to the new BOTCHAIN_PRIVATE_KEY wallet.
 *
 *   OLD_ENV=~/.config/signal-keys/env.compromised-2026-10-24 node scripts/move-botchain-funds.js
 *   OLD_ENV=... TO=0xYourWallet node scripts/move-botchain-funds.js   # send somewhere else
 *
 * Reads the old key from OLD_ENV (YELLOW_USER_PRIVATE_KEY) and the destination from this
 * project's .env (BOTCHAIN_PRIVATE_KEY). Shows the amount and asks before sending.
 */
import 'dotenv/config';
import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { parse } from 'dotenv';
import { createInterface } from 'readline/promises';

const OLD_ENV = process.env.OLD_ENV;
if (!OLD_ENV) {
  console.error('Set OLD_ENV to the backed-up .env that holds the compromised key');
  process.exit(1);
}
const oldKey = parse(readFileSync(OLD_ENV)).YELLOW_USER_PRIVATE_KEY;
const newKey = process.env.BOTCHAIN_PRIVATE_KEY;
if (!oldKey || !newKey) {
  console.error('Missing YELLOW_USER_PRIVATE_KEY in OLD_ENV or BOTCHAIN_PRIVATE_KEY in .env');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(process.env.BOTCHAIN_RPC || 'https://rpc.botchain.ai', 677, { staticNetwork: true });
const from = new ethers.Wallet(oldKey, provider);
// TO overrides the destination, e.g. your own wallet instead of the bot's new key.
const to = process.env.TO ? ethers.getAddress(process.env.TO) : new ethers.Wallet(newKey).address;

const balance = await provider.getBalance(from.address);
const fee = await provider.getFeeData();
const gasPrice = fee.gasPrice ?? fee.maxFeePerGas;
const gasCost = gasPrice * 21_000n;
const amount = balance - gasCost;
if (amount <= 0n) {
  console.log(`Nothing to move: ${ethers.formatEther(balance)} BOT does not cover gas.`);
  process.exit(0);
}

console.log(`From (compromised): ${from.address}`);
console.log(`To (new):           ${to}`);
console.log(`Amount:             ${ethers.formatEther(amount)} BOT (gas ${ethers.formatEther(gasCost)})`);
const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question('Type "move" to send: ');
rl.close();
if (answer.trim() !== 'move') {
  console.log('Cancelled.');
  process.exit(0);
}

const tx = await from.sendTransaction({ to, value: amount, gasLimit: 21_000n, gasPrice });
console.log(`Sent: ${tx.hash}`);
await tx.wait();
console.log(`Done. New wallet balance: ${ethers.formatEther(await provider.getBalance(to))} BOT`);

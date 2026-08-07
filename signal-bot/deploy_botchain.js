import fs from 'fs';
import path from 'path';
import solc from 'solc';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log('🚀 Compiling SignalOracle.sol...');
  const contractPath = path.resolve('./contracts/SignalOracle.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'SignalOracle.sol': { content: source }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  if (output.errors) {
    const fatal = output.errors.filter(e => e.severity === 'error');
    if (fatal.length > 0) {
      console.error('Compilation errors:', fatal);
      process.exit(1);
    }
  }

  const contractData = output.contracts['SignalOracle.sol'].SignalOracle;
  const abi = contractData.abi;
  const bytecode = contractData.evm.bytecode.object;

  console.log('✅ Compilation successful!');

  const rpcUrl = process.env.BOTCHAIN_RPC_URL || 'https://rpc.botchain.ai';
  const provider = new ethers.JsonRpcProvider(rpcUrl, 677);
  
  const privateKey = process.env.YELLOW_USER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('YELLOW_USER_PRIVATE_KEY missing in .env');
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log('💳 Deployer Address:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('⛽ Balance:', ethers.formatEther(balance), 'BOT');

  console.log('⚡ Deploying SignalOracle to BOTChain (Chain ID 677)...');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();

  console.log('⏳ Waiting for deployment transaction confirmation...');
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log('🎉 SignalOracle Deployed Successfully!');
  console.log('📜 Contract Address:', deployedAddress);
  console.log('🔗 Explorer Link: https://scan.botchain.ai/address/' + deployedAddress);

  // Save deployed ABI & address
  fs.writeFileSync('./contracts/deployed.json', JSON.stringify({
    address: deployedAddress,
    abi: abi,
    deployedAt: new Date().toISOString()
  }, null, 2));

  console.log('💾 Saved deployment info to ./contracts/deployed.json');
}

main().catch(err => {
  console.error('❌ Deployment Failed:', err);
  process.exit(1);
});

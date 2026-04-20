# ☁️ Signal DePIN: Railway Cloud Deployment Guide

This guide ensures your **Signal Protocol** remains active 24/7 globally by deploying it to the Railway cloud.

## 🛠️ Step 1: Push to GitHub
1. Create a **Private Repository** on GitHub (e.g., `signal-depin`).
2. Push your current project code to this repository:
   ```bash
   git init
   git add .
   git commit -m "Grand Champion Deployment Ready"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

## 🚉 Step 2: Connect to Railway
1. Go to [Railway.app](https://railway.app) and log in.
2. Click **"+ New Project"** → **"Deploy from GitHub repo"**.
3. Select your `signal-depin` repository.
4. Railway will detect the `pnpm` workspace and the `railway.json` files.

## 🔑 Step 3: Add Environment Variables
Railway needs your production keys to run. For **each service** (Signal Agent and Signal Console), go to the **Variables** tab and add:
- `TELEGRAM_BOT_TOKEN`: Your bot token.
- `RPC_URL`: Your Helius Devnet RPC URL.
- `ANTHROPIC_API_KEY`: For Claude Vision.
- `JUPITER_API_KEY`: For real swaps.
- `DUNE_SIM_API_KEY`: For real-time dashboard data.
- `HELIUS_API_KEY`: For transaction history.
- `NEXT_PUBLIC_PROTOCOL_WALLET`: `9U...` (Your protocol wallet address).

## ✨ Step 4: Verify Deployment
1. Once deployed, Railway will provide a public URL for the **Signal Console**.
2. Your **Signal Agent** will automatically start monitoring Telegram.
3. You can now close your laptop—the network is sustained by the cloud. 🚀

---
*Fulfilling the Grand Champion 24/7 uptime requirement.*

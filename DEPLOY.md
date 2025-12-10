# 🎰 Claw Machine Server - Deployment Guide

This guide will help you deploy your Claw Machine game online using Railway (free) so players don't need to connect to your local PC.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        HOW IT WORKS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Discord User] ──/clawmachine──> [Your Local Bot]              │
│         │                              │                        │
│         │                              ▼                        │
│         │                    Generates game link                │
│         │                              │                        │
│         ▼                              ▼                        │
│  [Opens game link] ────────> [Railway: Claw Machine Game]       │
│                                        │                        │
│                              Player wins prize                  │
│                                        │                        │
│                                        ▼                        │
│  [Your Local Bot] <────webhook──── [Railway Server]             │
│         │                                                       │
│         ▼                                                       │
│  Adds item to inventory + Sends Discord DM                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- A GitHub account
- A Railway account (free at https://railway.app)
- Cloudflare account (free) for the tunnel

---

## Step 1: Set Up Cloudflare Tunnel (FREE)

Cloudflare Tunnel lets your local bot receive webhooks from the internet without port forwarding.

### Option A: Quick Tunnel (Temporary URL - good for testing)

1. Download cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

2. Run this command (replace 3000 with your web-admin port):
   ```powershell
   cloudflared tunnel --url http://localhost:3000
   ```

3. You'll get a URL like: `https://random-words-here.trycloudflare.com`

4. Your webhook URL will be: `https://random-words-here.trycloudflare.com/claw-webhook`

> ⚠️ This URL changes every time you restart cloudflared. For permanent URL, use Option B.

### Option B: Named Tunnel (Permanent URL - recommended)

1. Create a Cloudflare account: https://cloudflare.com

2. Install cloudflared and login:
   ```powershell
   cloudflared tunnel login
   ```

3. Create a named tunnel:
   ```powershell
   cloudflared tunnel create claw-webhook
   ```

4. Create a config file at `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: claw-webhook
   credentials-file: C:\Users\YourName\.cloudflared\<tunnel-id>.json
   
   ingress:
     - hostname: clawbot.yourdomain.com
       service: http://localhost:3000
     - service: http_status:404
   ```

5. Route DNS:
   ```powershell
   cloudflared tunnel route dns claw-webhook clawbot.yourdomain.com
   ```

6. Run the tunnel:
   ```powershell
   cloudflared tunnel run claw-webhook
   ```

---

## Step 2: Deploy to Railway

### 2.1 Push to GitHub

1. Create a new GitHub repository (e.g., `claw-machine-server`)

2. Initialize and push the claw-machine-server folder:
   ```powershell
   cd c:\Users\Spartan\test\Doubt\claw-machine-server
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/claw-machine-server.git
   git push -u origin main
   ```

### 2.2 Deploy on Railway

1. Go to https://railway.app and sign in with GitHub

2. Click **"New Project"** → **"Deploy from GitHub repo"**

3. Select your `claw-machine-server` repository

4. Railway will automatically detect it's a Node.js app and start deploying

5. Click on your deployment → **"Settings"** → **"Generate Domain"**
   - You'll get a URL like: `https://claw-machine-server-production.up.railway.app`

### 2.3 Set Environment Variables

1. In Railway, click on your deployment → **"Variables"**

2. Add these variables:

   | Variable | Value |
   |----------|-------|
   | `BOT_WEBHOOK_URL` | Your Cloudflare Tunnel URL + `/claw-webhook` (e.g., `https://clawbot.yourdomain.com/claw-webhook`) |
   | `WEBHOOK_SECRET` | A random secret string (e.g., `my-super-secret-key-12345`) |
   | `MAX_TRIES` | `5` (or your preference) |
   | `CLAW_STRENGTH` | `70` (0-100, higher = easier to grab) |
   | `DROP_CHANCE` | `20` (0-100, chance to drop while lifting) |

3. Railway will auto-redeploy with the new variables

---

## Step 3: Configure Your Local Bot

### 3.1 Add Webhook Secret to Bot

Add this to your bot's `.env` file:
```env
CLAW_WEBHOOK_SECRET=my-super-secret-key-12345
```
(Use the SAME secret you set in Railway!)

### 3.2 Update Claw Machine Command

Edit `bot/src/commands/clawmachine.js` to use your Railway URL:

Find this line:
```javascript
const webAdminUrl = process.env.WEB_ADMIN_URL || `http://localhost:${webAdminPort}`;
```

Change to:
```javascript
const webAdminUrl = process.env.CLAW_GAME_URL || `http://localhost:${webAdminPort}`;
```

And add to your `.env`:
```env
CLAW_GAME_URL=https://claw-machine-server-production.up.railway.app
```

### 3.3 Restart Your Bot

Restart your bot to pick up the new environment variables.

---

## Step 4: Test It!

1. Make sure Cloudflare Tunnel is running
2. Make sure your local bot's web-admin is running
3. Use `/clawmachine` in Discord
4. Click the link - it should open your Railway-hosted game!
5. Win a prize and check:
   - Item should appear in your inventory
   - You should get a DM when you end the game

---

## Troubleshooting

### "Webhook failed" in Railway logs
- Check that Cloudflare Tunnel is running
- Verify the `BOT_WEBHOOK_URL` is correct
- Make sure `WEBHOOK_SECRET` matches in both places

### Items not appearing in inventory
- Check your bot's console for webhook errors
- Verify the webhook receiver is working: `curl -X POST https://your-tunnel.trycloudflare.com/claw-webhook -H "X-Webhook-Secret: your-secret" -H "Content-Type: application/json" -d '{"event":"test"}'`

### Game loads but shows no prizes
- The game fetches items from your local bot via `/claw-items`
- Make sure the tunnel is working and items exist in data.json

### Railway deployment fails
- Check the build logs in Railway
- Make sure all files were committed to GitHub

---

## Running Locally (for development)

```powershell
cd c:\Users\Spartan\test\Doubt\claw-machine-server
npm install
npm start
```

Then open: http://localhost:3000/play?session=test&user=279027517699129344

---

## Cost

- **Railway**: Free tier gives you 500 hours/month (enough for a small server running ~16 hours/day)
- **Cloudflare Tunnel**: Completely free
- **Total**: $0/month for most use cases!

---

## Support

If you have issues, check:
1. Railway deployment logs
2. Your local bot's console
3. Cloudflare Tunnel output

Happy clawing! 🎰🎁

/**
 * Standalone Claw Machine Server
 * Deploy this to Railway/Render to host your claw machine game online
 * 
 * This server:
 * 1. Serves the claw machine game to players
 * 2. Sends webhooks to your local bot when prizes are won
 * 3. Tracks sessions and tries (in-memory, resets on restart)
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== CONFIGURATION =====
// Set these via environment variables in Railway
const PORT = process.env.PORT || 3000;
const BOT_WEBHOOK_URL = process.env.BOT_WEBHOOK_URL || ''; // Your bot's webhook URL (via Cloudflare Tunnel)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-secret-key'; // Shared secret for auth

// ===== GAME SETTINGS =====
const GAME_SETTINGS = {
  maxTries: parseInt(process.env.MAX_TRIES) || 5,
  clawStrength: parseInt(process.env.CLAW_STRENGTH) || 70,
  dropChance: parseInt(process.env.DROP_CHANCE) || 20,
};

// ===== GLOW RARITIES =====
const GLOW_RARITIES = {
  none: { chance: 50, name: 'No Glow', goldBonus: 0, xpBonus: 0, color: null },
  common: { chance: 25, name: 'Common Glow', goldBonus: 50, xpBonus: 10, color: '#888888' },
  uncommon: { chance: 12, name: 'Uncommon Glow', goldBonus: 150, xpBonus: 25, color: '#2ecc71' },
  rare: { chance: 7, name: 'Rare Glow', goldBonus: 300, xpBonus: 50, color: '#3498db' },
  epic: { chance: 4, name: 'Epic Glow', goldBonus: 600, xpBonus: 100, color: '#9b59b6' },
  legendary: { chance: 1.5, name: 'Legendary Glow', goldBonus: 1500, xpBonus: 250, color: '#f1c40f' },
  mythic: { chance: 0.5, name: 'Mythic Glow', goldBonus: 5000, xpBonus: 500, color: '#e74c3c' }
};

// ===== IN-MEMORY STORAGE =====
const sessions = new Map();
const dailyTries = new Map(); // { odayKey-userId: triesUsed }

// ===== HELPER FUNCTIONS =====
function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function getUserDailyTries(userId) {
  const key = `${getTodayKey()}-${userId}`;
  return dailyTries.get(key) || 0;
}

function incrementUserTries(userId) {
  const key = `${getTodayKey()}-${userId}`;
  const current = dailyTries.get(key) || 0;
  dailyTries.set(key, current + 1);
  return current + 1;
}

function rollGlowRarity() {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const [rarity, data] of Object.entries(GLOW_RARITIES)) {
    cumulative += data.chance;
    if (roll < cumulative) return rarity;
  }
  return 'none';
}

// Send webhook to local bot
async function sendWebhook(event, data) {
  if (!BOT_WEBHOOK_URL) {
    console.log(`⚠️ No BOT_WEBHOOK_URL configured, skipping webhook: ${event}`);
    return false;
  }
  
  try {
    const response = await fetch(BOT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET
      },
      body: JSON.stringify({ event, data, timestamp: Date.now() })
    });
    
    if (response.ok) {
      console.log(`✅ Webhook sent: ${event}`);
      return true;
    } else {
      console.error(`❌ Webhook failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Webhook error: ${error.message}`);
    return false;
  }
}

// ===== CACHED DATA (fetched from local bot) =====
let cachedSettings = null;
let cachedItems = null;
let lastSettingsFetch = 0;
let lastItemsFetch = 0;
const CACHE_TTL = 30000; // 30 seconds cache

// Helper to fetch from local bot
async function fetchFromBot(endpoint) {
  if (!BOT_WEBHOOK_URL) return null;
  
  try {
    const baseUrl = BOT_WEBHOOK_URL.replace('/claw-webhook', '');
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: { 'X-Webhook-Secret': WEBHOOK_SECRET }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.log(`Could not fetch ${endpoint} from bot:`, e.message);
  }
  return null;
}

// ===== API ROUTES =====

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Get game settings (fetched from your local bot)
app.get('/api/games/claw-settings', async (req, res) => {
  const now = Date.now();
  
  // Use cache if fresh
  if (cachedSettings && (now - lastSettingsFetch) < CACHE_TTL) {
    return res.json(cachedSettings);
  }
  
  // Fetch from local bot
  const settings = await fetchFromBot('/claw-settings');
  if (settings) {
    cachedSettings = settings;
    lastSettingsFetch = now;
    console.log('✅ Fetched claw settings from local bot');
    return res.json(settings);
  }
  
  // Fallback to defaults
  res.json({
    gameplay: GAME_SETTINGS,
    prizes: {
      selectedCategories: ['all'],
      selectedRarities: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
    },
    costs: {
      playCost: 100,
      currency: 'gold'
    }
  });
});

// Get items (fetched from your local bot)
app.get('/api/items', async (req, res) => {
  const now = Date.now();
  
  // Use cache if fresh
  if (cachedItems && (now - lastItemsFetch) < CACHE_TTL) {
    return res.json(cachedItems);
  }
  
  // Fetch from local bot
  const items = await fetchFromBot('/claw-items');
  if (items) {
    cachedItems = items;
    lastItemsFetch = now;
    console.log('✅ Fetched items from local bot');
    return res.json(items);
  }
  
  // Return empty if no items configured
  res.json({ items: {} });
});

// Force refresh cache
app.post('/api/refresh-cache', (req, res) => {
  cachedSettings = null;
  cachedItems = null;
  lastSettingsFetch = 0;
  lastItemsFetch = 0;
  console.log('🔄 Cache cleared');
  res.json({ success: true, message: 'Cache cleared' });
});

// Register a new session
app.post('/api/claw-machine/session', (req, res) => {
  const { sessionId, userId, channelId, guildId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Missing sessionId' });
  }
  
  const triesUsed = getUserDailyTries(userId);
  const triesRemaining = Math.max(0, GAME_SETTINGS.maxTries - triesUsed);
  
  sessions.set(sessionId, {
    userId,
    channelId,
    guildId,
    prizes: [],
    startTime: Date.now()
  });
  
  console.log(`🎰 Session started: ${sessionId} for user ${userId} (${triesRemaining}/${GAME_SETTINGS.maxTries} tries)`);
  
  res.json({
    success: true,
    triesUsed,
    triesRemaining,
    maxTries: GAME_SETTINGS.maxTries,
    glowRarities: GLOW_RARITIES
  });
});

// Get session info
app.get('/api/claw-machine/session/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (session) {
    res.json({ success: true, session });
  } else {
    res.json({ success: false, error: 'Session not found' });
  }
});

// Track a try used
app.post('/api/claw-machine/use-try', (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ success: false, error: 'Missing userId' });
  }
  
  const newTriesUsed = incrementUserTries(userId);
  const triesRemaining = Math.max(0, GAME_SETTINGS.maxTries - newTriesUsed);
  
  console.log(`🎮 User ${userId} used a try: ${newTriesUsed}/${GAME_SETTINGS.maxTries}`);
  
  res.json({
    success: true,
    triesUsed: newTriesUsed,
    triesRemaining,
    maxTries: GAME_SETTINGS.maxTries,
    canPlay: triesRemaining > 0
  });
});

// Roll a glow
app.get('/api/claw-machine/roll-glow', (req, res) => {
  const glowRarity = rollGlowRarity();
  const glowData = GLOW_RARITIES[glowRarity];
  
  res.json({
    success: true,
    glow: { rarity: glowRarity, ...glowData }
  });
});

// Get tries info
app.get('/api/claw-machine/tries/:userId', (req, res) => {
  const { userId } = req.params;
  const triesUsed = getUserDailyTries(userId);
  const triesRemaining = Math.max(0, GAME_SETTINGS.maxTries - triesUsed);
  
  res.json({
    success: true,
    triesUsed,
    triesRemaining,
    maxTries: GAME_SETTINGS.maxTries
  });
});

// Register a prize won
app.post('/api/claw-machine/prize', async (req, res) => {
  const { sessionId, prize, userId, silent } = req.body;
  
  if (!sessionId || !prize) {
    return res.status(400).json({ success: false, error: 'Missing sessionId or prize' });
  }
  
  console.log(`🎁 Prize won: ${prize.name} (${prize.rarity}) by user ${userId}`);
  
  // Store in session
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { prizes: [], userId });
  }
  const session = sessions.get(sessionId);
  session.prizes.push({ ...prize, wonAt: Date.now() });
  
  // Calculate glow bonuses
  let goldBonus = 0;
  let xpBonus = 0;
  if (prize.glow && prize.glow !== 'none' && GLOW_RARITIES[prize.glow]) {
    goldBonus = GLOW_RARITIES[prize.glow].goldBonus || 0;
    xpBonus = GLOW_RARITIES[prize.glow].xpBonus || 0;
  }
  
  // Send webhook to local bot to add item to inventory
  const webhookSent = await sendWebhook('prize_won', {
    userId,
    sessionId,
    prize,
    goldBonus,
    xpBonus,
    silent
  });
  
  res.json({
    success: true,
    addedToInventory: webhookSent,
    goldBonus,
    xpBonus
  });
});

// End session
app.post('/api/claw-machine/end-session', async (req, res) => {
  const { sessionId, userId, prizes } = req.body;
  
  console.log(`🎰 Session ended: ${sessionId} with ${prizes?.length || 0} prizes`);
  
  const session = sessions.get(sessionId);
  
  // Send webhook to bot to send DM summary
  if (userId && prizes && prizes.length > 0) {
    await sendWebhook('session_ended', {
      userId,
      sessionId,
      prizes,
      channelId: session?.channelId,
      guildId: session?.guildId
    });
  }
  
  // Clean up session
  sessions.delete(sessionId);
  
  res.json({ success: true });
});

// Get prizes for a session
app.get('/api/claw-machine/prizes/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  res.json({ success: true, prizes: session?.prizes || [] });
});

// ===== SERVE GAME =====
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/play', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'play.html'));
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           🎰 CLAW MACHINE SERVER STARTED 🎰                ║
╠════════════════════════════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(50)}║
║  Webhook URL: ${(BOT_WEBHOOK_URL || 'Not configured').substring(0, 42).padEnd(42)}║
║  Max Tries: ${GAME_SETTINGS.maxTries.toString().padEnd(46)}║
║  Claw Strength: ${GAME_SETTINGS.clawStrength.toString().padEnd(41)}║
╚════════════════════════════════════════════════════════════╝
  `);
});

# 🍎 Apple Trading Exchange - AI-Powered Market Simulation

> **YC Hackathon 2025** | Real AI agents trading real cryptocurrency in a live market simulation

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Claude AI](https://img.shields.io/badge/Claude-Sonnet%204-purple)](https://anthropic.com/)
[![Locus MCP](https://img.shields.io/badge/Locus-MCP-blue)](https://paywithlocus.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 🎯 What Is This?

An **autonomous AI trading exchange** where three Claude-powered agents buy and sell apples using **real USDC on blockchain**. Watch as AI personalities compete in a dynamic market with real-time price discovery and actual cryptocurrency settlements.

### Key Features

✅ **Real Blockchain Transactions** - Every trade executes USDC payments via Locus MCP  
✅ **Autonomous AI Agents** - Claude Sonnet 4 makes every trading decision  
✅ **Dynamic Pricing** - Market responds to supply and demand in real-time  
✅ **Beautiful Dashboard** - Live charts, trader cards, and transaction history  
✅ **Distinct Personalities** - Conservative, Aggressive, and Data-driven strategies  
✅ **Secure by Design** - AI cannot send funds to arbitrary addresses  

## 🎥 Demo

```
🍎 Initial Price: $0.0100
📊 Watch as 3 AI traders compete:

Tick 1: All three buy aggressively → Price jumps to $0.0604 (504% gain!)
Tick 2: Frugal Fred takes profit, sells → Price stabilizes
Tick 3: Market volatility as agents react to price movements
...
```

**Live Features:**
- 📈 Real-time price chart with historical data
- 💰 Individual trader P&L tracking (profit/loss)
- 🔄 Buy and sell market orders
- 🔗 Blockchain transaction hashes displayed
- ⚡ 5-second tick intervals (configurable)

## 🚀 Quick Start (2 Minutes)

### Prerequisites
- Node.js 18+ installed
- 3 Locus MCP accounts (for 3 AI traders)
- 1 Anthropic API key
- 1 merchant wallet address

### Setup

```bash
# 1. Clone and install
cd fruit-market-sim
npm install

# 2. Create .env.local (see SETUP.md for full template)
cp .env.local.example .env.local

# 3. Add your credentials
FRUGAL_BUYER_CLIENT_ID=your_id
FRUGAL_BUYER_CLIENT_SECRET=your_secret
# ... (repeat for IMPULSIVE and SKEPTICAL)
ANTHROPIC_API_KEY=your_key
MERCHANT_WALLET_ADDRESS=0x...

# 4. Start the exchange
npm run dev
```

Open http://localhost:3000 and click **"Start Trading"** 🚀

## 🤖 Meet The Traders

### 🟢 Frugal Fred - The Conservative
**Strategy:** Patient value investor
- Only buys when price < $0.015 threshold (33% below initial)
- Takes profit at 0.8%+ gains
- Trades 4% of balance per tick
- **Personality:** "Excellent deal! Using full budget allocation"

### 🔴 Impulsive Ivan - The Aggressive
**Strategy:** FOMO-driven momentum trader
- Buys on excitement and price dips
- Takes profit aggressively (1-1.5% gains)
- Trades 6% of balance per tick
- **Personality:** "Going ALL IN! Can't resist this opportunity!"

### 🔵 Skeptical Sarah - The Analyst
**Strategy:** Data-driven technical trader
- Analyzes rolling averages and trends
- Conservative profit targets (0.8%+)
- Trades 3.5% of balance per tick
- **Personality:** "Price below average, high confidence buy signal"

## 🏗️ Architecture

### Tech Stack
```
Frontend:  Next.js 14 (App Router) + React + Tailwind CSS + Recharts
Backend:   Next.js API Routes (serverless)
AI:        Claude Sonnet 4 (Anthropic)
Payments:  Locus MCP (USDC on blockchain)
Framework: LangChain for agent orchestration
```

### Core Components

```
app/
├── api/
│   ├── control/route.js    # Start/stop + tick loop orchestration
│   ├── market/route.js     # GET market state + agents + history
│   └── stream/route.js     # Server-Sent Events for real-time updates
├── page.js                 # Trading dashboard UI
└── globals.css

simulation/
├── agents/
│   ├── BaseAgent.js        # Locus integration + LLM decision-making
│   ├── FrugalBuyer.js      # Conservative trader logic
│   ├── ImpulsiveBuyer.js   # Aggressive trader logic
│   └── SkepticalBuyer.js   # Analytical trader logic
├── market/
│   ├── MarketEngine.js     # Tick execution + transaction processing
│   └── PricingEngine.js    # Dynamic price calculation
└── types/index.js          # TypeScript-style JSDoc definitions

lib/
└── globals.js              # Shared state management
```

## 💡 How It Works

### Simulation Loop (Every 5 seconds)

```
1. 🤔 Decision Phase
   ├─ Each agent gets market state (price, inventory, their balance)
   ├─ Claude AI analyzes and returns: {action: 'buy'|'sell'|'wait', quantity: N}
   └─ Decisions validated (budget limits, inventory checks)

2. 💸 Execution Phase
   ├─ BUY: Agent wallet → Merchant (via Locus MCP send_to_address)
   ├─ SELL: Merchant wallet → Agent (via Locus MCP send_to_address)
   └─ Update balances, inventory, profit tracking

3. 📊 Price Update
   ├─ Calculate net demand: buys - sells
   ├─ Apply formula: price_new = price_old * (1 + 0.05 * netDemand + noise)
   └─ Clamp to MIN_PRICE ($0.0001) and MAX_PRICE ($1.0)

4. 🔄 Broadcast
   └─ Update UI via polling + SSE events
```

### Pricing Algorithm

**Highly Sensitive Market Dynamics:**
```javascript
baseDelta = netDemand * 0.05  // 5% change per unit imbalance
noise = random(-1%, +1%)       // Market volatility
price_new = price_old * (1 + baseDelta + noise)

// Example: 
// +4 net buys → 20% price increase
// -3 net sells → 15% price decrease
```

### Security Model

**CRITICAL: AI agents have LIMITED tool access**
```javascript
// ✅ SAFE TOOLS (AI can access)
- purchase_apples: Hardcoded merchant address, deducts from buyer
- sell_apples: Uses merchant MCP to pay buyer, checks inventory
- get_payment_context: Read-only balance check

// ❌ DANGEROUS TOOLS (AI CANNOT access)
- send_to_address: Could send to arbitrary addresses
- send_to_email: Could send to arbitrary recipients
```

Merchant address is **hardcoded from environment variable** - AI cannot override it.

## 📊 Dashboard Features

### Market Overview
- **Spot Price:** Current USDC price per apple
- **Market Depth:** Available supply in apples
- **Volume Traded:** Total USDC transacted
- **Trading Tick:** Current round number

### Price Chart
- Real-time line chart showing price history
- Starts at Tick 0 with initial price
- Updates every tick with new data point
- Shows percentage change and price movement

### Trader Cards
Each agent displays:
- 💰 **Balance:** Current USDC wallet balance
- 🍎 **Position:** Apple inventory owned
- 💸 **Total Bought:** Lifetime USDC spent on purchases
- 💵 **Total Sold:** Lifetime USDC earned from sales
- 📈 **Net P&L:** Realized profit/loss (revenue - spent)
- 📊 **Avg Entry:** Average purchase price per apple

### Trading History
- All rounds displayed (not just recent)
- Each transaction shows:
  - BUY or SELL action
  - Quantity and price
  - AI reasoning note
  - Blockchain transaction hash

## 🔧 Configuration

### Market Parameters
```env
INITIAL_PRICE=0.01           # Starting price (USDC)
INITIAL_INVENTORY=10000000   # Starting apple supply
MIN_PRICE=0.001              # Price floor
MAX_PRICE=1.0                # Price ceiling
SIMULATION_TICK_MS=5000      # Tick interval (ms)
MAX_TICKS=100                # Auto-stop after N ticks
```

### Trading Parameters
```javascript
// Agent budget allocations (% of balance per tick)
Frugal Fred:     4%  (conservative)
Impulsive Ivan:  6%  (aggressive)
Skeptical Sarah: 3.5% (conservative)

// Profit-taking thresholds
Frugal Fred:     0.8%+ (patient)
Impulsive Ivan:  0.8-1.5% (eager)
Skeptical Sarah: 0.8%+ (disciplined)
```

## 🎮 Usage

### Starting a Simulation
1. Click **"Start Trading"** button
2. See initialization screen with bouncing apple 🍎
3. Wait 5-7 seconds for:
   - Market engine initialization
   - AI agents connecting to Locus MCP
   - Wallet balances fetched
   - First tick preparation

### Monitoring Trading
- Watch **Price Chart** for market movements
- Check **Trader Cards** for individual performance
- Review **Trading History** for decision reasoning
- Monitor **console logs** for detailed transaction info

### Stopping Simulation
- Click **"Stop Trading"** button
- Simulation stops immediately
- All state preserved until restart

### Auto-Stop Conditions
Simulation automatically stops when:
- Market inventory reaches 0 apples
- MAX_TICKS rounds completed
- Shows completion banner with statistics

## 🐛 Development Mode

**Test without real payments:**
```env
DEV_MODE=true
```
- Simulates all MCP transactions
- No actual USDC transfers
- Full UI/logic testing without blockchain costs

## 🔍 What Makes This Special

### For YC Judges

**1. Real Blockchain Integration**
- Not a mock simulation - actual USDC transfers
- Every trade hits Locus MCP API
- Transaction hashes displayed in UI
- Fully auditable on blockchain

**2. Autonomous AI Agents**
- Claude makes EVERY decision independently
- No hardcoded rules - pure LLM reasoning
- Distinct personalities emerge from prompts
- Real-time decision notes displayed

**3. Dynamic Market Mechanics**
- Price responds instantly to supply/demand
- 5% sensitivity means volatile, exciting trading
- Agents adapt strategies based on market
- Creates emergent trading patterns

**4. Production-Ready Architecture**
- Next.js App Router (modern React)
- Serverless API routes (scalable)
- SSE for real-time updates
- Clean separation of concerns

**5. Beautiful UX**
- Professional trading dashboard aesthetic
- Real-time charts and animations
- Initialization loading states
- Comprehensive transaction history

## 📈 Metrics & Insights

### What You'll See
- **Price Volatility:** 20-100%+ swings in first few ticks
- **Agent Divergence:** Different strategies → different P&L
- **Market Dynamics:** Buying pressure → price spikes → profit-taking
- **Emergent Behavior:** AI agents react to each other's moves

### Example Session
```
Tick 1:  $0.01 → $0.06 (504% jump - all agents buy)
Tick 2:  $0.06 → $0.04 (profit-taking by Frugal)
Tick 3:  $0.04 → $0.05 (opportunistic buying)
...
Tick 50: Frugal +$0.82 P&L (best performer)
         Ivan +$0.34 P&L (aggressive losses)
         Sarah +$0.61 P&L (steady gains)
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel --prod
```
Add all environment variables in Vercel dashboard.

### Docker
```bash
docker build -t apple-exchange .
docker run -p 3000:3000 --env-file .env.local apple-exchange
```

## 🤝 Contributing

This is a hackathon project, but improvements welcome!

**Areas for enhancement:**
- More agent personalities
- Advanced charting (candlesticks, order book)
- Historical session playback
- Multi-asset trading
- Limit orders (vs market orders only)

## 🙏 Acknowledgments

**Built with:**
- [Locus](https://paywithlocus.com/) - Machine-to-machine payments via MCP
- [Anthropic](https://anthropic.com/) - Claude Sonnet 4 AI model
- [LangChain](https://langchain.com/) - Agent orchestration framework
- [Next.js](https://nextjs.org/) - React framework
- [Recharts](https://recharts.org/) - Beautiful charting library

**Special Thanks:**
- YC Hackathon organizers
- Locus team for MCP platform
- Anthropic for Claude API access

## 📄 License

MIT License - See [LICENSE](LICENSE) file

---

## 🎯 TL;DR for Judges

**What:** AI agents trading real cryptocurrency with distinct personalities  
**How:** Claude + Locus MCP + Next.js  
**Why:** Demonstrate autonomous AI in real financial transactions  
**Cool Factor:** Watch AI make money decisions with real stakes

**Start here:** `npm install && npm run dev` → http://localhost:3000

---

**Built for YC Hackathon 2025** 🚀 | [Video Demo](https://youtu.be/HHQnpJobNos)

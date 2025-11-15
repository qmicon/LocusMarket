# 🍎 AI Fruit Market Simulation

An interactive market simulation where 3 autonomous AI agents compete to buy apples using real cryptocurrency (USDC) via Locus MCP.

## 🎯 What Is This?

Watch three AI agents with different personalities buy and sell in a dynamic marketplace:

- **🟢 Frugal Fred** - Conservative, only buys below threshold
- **🔴 Impulsive Ivan** - Emotional, buys frequently
- **🔵 Skeptical Sarah** - Data-driven, analyzes trends

Each agent:
- Has its own Locus MCP wallet
- Uses Claude AI to make decisions
- Processes real USDC payments
- Learns from price history

The market price adjusts dynamically based on supply and demand!

## 📋 What You Need

Before starting, gather these credentials:

**Locus MCP** (3 separate wallets):
- Frugal Buyer: Client ID + Secret
- Impulsive Buyer: Client ID + Secret  
- Skeptical Buyer: Client ID + Secret

**Anthropic Claude**:
- 1 API key (shared by all agents)

**Wallet**:
- 1 merchant wallet address (where payments go)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file (see `SETUP.md` for details):

```env
# Frugal Buyer
FRUGAL_BUYER_CLIENT_ID=your_id
FRUGAL_BUYER_CLIENT_SECRET=your_secret

# Impulsive Buyer  
IMPULSIVE_BUYER_CLIENT_ID=your_id
IMPULSIVE_BUYER_CLIENT_SECRET=your_secret

# Skeptical Buyer
SKEPTICAL_BUYER_CLIENT_ID=your_id
SKEPTICAL_BUYER_CLIENT_SECRET=your_secret

# Shared Anthropic API Key
ANTHROPIC_API_KEY=your_key

# Settings
MERCHANT_WALLET_ADDRESS=0xf1147d10e5d54c5470988eedcf014b1896b60109

# Market Configuration
INITIAL_PRICE=0.02
INITIAL_INVENTORY=1000
MIN_PRICE=0.0001
MAX_PRICE=1.0
SIMULATION_TICK_MS=5000
MAX_TICKS=100

# Frontend Configuration (NEXT_PUBLIC_ prefix for browser access)
NEXT_PUBLIC_SIMULATION_TICK_MS=5000
NEXT_PUBLIC_MAX_TICKS=100

DEV_MODE=false
```

### 3. Run the Simulation

```bash
npm run dev
```

Open http://localhost:3000 and click "Start"!

## 📁 Project Structure

```
fruit-market-sim/
├── app/
│   ├── api/
│   │   ├── control/route.js    # Start/stop simulation
│   │   ├── market/route.js     # Get market state
│   │   ├── pricing/route.js    # Get current price
│   │   └── stream/route.js     # Real-time SSE
│   ├── globals.css
│   ├── layout.js
│   └── page.js                 # Main dashboard
├── simulation/
│   ├── agents/
│   │   ├── BaseAgent.js        # Base class with Locus integration
│   │   ├── FrugalBuyer.js      # Conservative agent
│   │   ├── ImpulsiveBuyer.js   # Emotional agent
│   │   └── SkepticalBuyer.js   # Analytical agent
│   ├── market/
│   │   ├── MarketEngine.js     # Core simulation logic
│   │   └── PricingEngine.js    # Dynamic pricing
│   └── types/index.js          # Type definitions
├── lib/
│   └── globals.js              # Shared state
├── package.json
└── README.md
```

## 🎮 How It Works

### Simulation Loop

Every 5 seconds (configurable):

1. **Agent Decisions** - Each AI agent analyzes the market
2. **LLM Reasoning** - Claude decides: buy or wait
3. **Validation** - Market engine validates decisions
4. **Execution** - Real USDC payments via Locus
5. **Price Update** - Price adjusts based on demand
6. **UI Update** - Dashboard reflects new state

### Price Formula

```
price_new = price_old * (1 + price_delta)
price_delta = 0.01 * (demand - supply) / supply + noise
```

More demand → Price goes up  
More supply → Price goes down

## 🤖 Agent Personalities

### Frugal Fred (Conservative)
- Only buys when price < threshold ($0.015)
- OR when price < 98% of rolling average
- Max spend: 30% of money per tick
- Strategy: Patience and discipline

### Impulsive Ivan (Emotional)
- Buys 70-80% of the time
- Reacts strongly to price changes
- Increases quantity when price drops
- Max spend: 50% of money per tick
- Strategy: FOMO and excitement

### Skeptical Sarah (Analytical)
- Calculates rolling average
- Buys when price < 98% of average
- Waits when price > 102% of average
- Max spend: 25% of money per tick
- Strategy: Data-driven decisions

## 🔧 Configuration

### Environment Variables

#### Required Credentials
| Variable | Description |
|----------|-------------|
| `FRUGAL_BUYER_CLIENT_ID` | Locus MCP client ID for Frugal Fred |
| `FRUGAL_BUYER_CLIENT_SECRET` | Locus MCP client secret for Frugal Fred |
| `IMPULSIVE_BUYER_CLIENT_ID` | Locus MCP client ID for Impulsive Ivan |
| `IMPULSIVE_BUYER_CLIENT_SECRET` | Locus MCP client secret for Impulsive Ivan |
| `SKEPTICAL_BUYER_CLIENT_ID` | Locus MCP client ID for Skeptical Sarah |
| `SKEPTICAL_BUYER_CLIENT_SECRET` | Locus MCP client secret for Skeptical Sarah |
| `ANTHROPIC_API_KEY` | Claude API key (shared by all agents) |
| `MERCHANT_WALLET_ADDRESS` | Wallet address where payments go |

#### Market Configuration
| Variable | Description | Default |
|----------|-------------|---------|
| `INITIAL_PRICE` | Starting price per apple (USDC) | `0.02` |
| `INITIAL_INVENTORY` | Starting apple inventory | `1000` |
| `MIN_PRICE` | Minimum price floor (USDC) | `0.0001` |
| `MAX_PRICE` | Maximum price ceiling (USDC) | `1.0` |
| `SIMULATION_TICK_MS` | Milliseconds between ticks | `5000` |
| `MAX_TICKS` | Maximum ticks before auto-stop (0 = unlimited) | `100` |
| `DEV_MODE` | Skip real payments (testing) | `false` |

### Agent Budgets

**Agent budgets are automatically fetched from their Locus wallets!**

At startup, each agent queries its Locus MCP wallet using `get_payment_context` to retrieve the actual available balance. This ensures:
- Agents use real USDC balances from their wallets
- No hardcoded values - always reflects current wallet state
- Automatic fallback to $10.00 if balance fetch fails

To set agent budgets, fund their Locus wallets directly through the Locus platform.

## 🐛 Development Mode

Test without real payments:

```env
DEV_MODE=true
```

This simulates payments without calling Locus.

## 📊 What to Watch

- **Price Chart** - See price react to buying pressure
- **Agent Cards** - Watch their money decrease, inventory grow
- **Transaction Log** - See who bought what and when
- **Personality Differences** - Notice how each agent behaves uniquely

## 🎥 Perfect for YouTube

This simulation is designed to be visually interesting:
- Real-time updates
- Color-coded agents
- Clear transaction history
- Dynamic price changes
- Agent reasoning displayed

## 🔐 Security

**Payment Security:**
- ✅ AI agents have access to **2 safe tools only**:
  - `purchase_apples`: Buy apples (merchant address hardcoded)
  - `get_payment_context`: Check balance (read-only, no risk)
- ✅ Merchant wallet address is **HARDCODED** from `MERCHANT_WALLET_ADDRESS` env var
- ✅ AI **CANNOT** access dangerous tools: `send_to_address`, `send_to_email`
- ✅ AI cannot send funds to arbitrary addresses
- ✅ All payments go exclusively to the configured merchant address

**Other Security:**
- `.env.local` is gitignored (credentials never committed)
- API keys never exposed to frontend
- Payments validated by Locus MCP
- Budget limits enforced by market engine

## 🚨 Troubleshooting

### "Market not initialized"
→ Click "Start" button to begin

### "send_to_address not found"
→ Check Locus credentials in `.env.local`
→ Verify you have 3 separate client ID/secret pairs

### "Agent decision error"
→ Check `ANTHROPIC_API_KEY` in `.env.local`
→ Verify the API key is valid and has credits

### No price movement
→ Agents might all be waiting. Check their logs in console.

## 📈 Next Steps

Ideas to enhance:
1. Add price chart with Recharts
2. Add sound effects for purchases
3. Show agent "thoughts" in real-time
4. Add more agents with different strategies
5. Make budgets and prices configurable in UI
6. Add simulation speed controls
7. Export data to CSV
8. Add agent vs agent comparison charts

## 🙏 Credits

- **Locus** - Payment infrastructure (USDC via MCP)
- **Anthropic** - Claude AI for agent decisions
- **LangChain** - Agent framework
- **Next.js** - Web framework

## 📄 License

MIT

---

**Built for the YC Hackathon 2025** 🚀


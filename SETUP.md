# Setup Instructions

## Step 1: Create .env.local file

Create a file named `.env.local` in the fruit-market-sim directory with these contents:

```env
# Frugal Buyer Credentials
FRUGAL_BUYER_CLIENT_ID=your_frugal_client_id_here
FRUGAL_BUYER_CLIENT_SECRET=your_frugal_client_secret_here

# Impulsive Buyer Credentials
IMPULSIVE_BUYER_CLIENT_ID=your_impulsive_client_id_here
IMPULSIVE_BUYER_CLIENT_SECRET=your_impulsive_client_secret_here

# Skeptical Buyer Credentials
SKEPTICAL_BUYER_CLIENT_ID=your_skeptical_client_id_here
SKEPTICAL_BUYER_CLIENT_SECRET=your_skeptical_client_secret_here

# Shared Anthropic API Key (used by all agents)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Merchant Credentials (for selling apples back to buyers)
MERCHANT_CLIENT_ID=your_merchant_client_id_here
MERCHANT_CLIENT_SECRET=your_merchant_client_secret_here
MERCHANT_WALLET_ADDRESS=0xf1147d10e5d54c5470988eedcf014b1896b60109

# Buyer Wallet Addresses (where merchant sends funds when agents sell)
FRUGAL_BUYER_ADDRESS=0x_frugal_buyer_wallet_address_here
IMPULSIVE_BUYER_ADDRESS=0x_impulsive_buyer_wallet_address_here
SKEPTICAL_BUYER_ADDRESS=0x_skeptical_buyer_wallet_address_here

# Market Configuration
INITIAL_PRICE=0.02
INITIAL_INVENTORY=1000
MIN_PRICE=0.0001
MAX_PRICE=1.0
SIMULATION_TICK_MS=5000
MAX_TICKS=100

# Frontend Configuration (NEXT_PUBLIC_ prefix makes it available to browser)
NEXT_PUBLIC_SIMULATION_TICK_MS=5000
NEXT_PUBLIC_MAX_TICKS=100

# Development Mode (set to 'true' to skip real payments during testing)
DEV_MODE=false
```

**Configuration Notes:**
- `MAX_TICKS=100` - Simulation will auto-stop after 100 ticks. Set to `0` for unlimited (stops only when inventory depletes)
- `SIMULATION_TICK_MS=5000` - Backend simulation ticks every 5 seconds (5000ms)
- `NEXT_PUBLIC_SIMULATION_TICK_MS=5000` - Must match above for proper UI polling. **NEXT_PUBLIC_** prefix makes it available to the browser
- `NEXT_PUBLIC_MAX_TICKS=100` - Must match `MAX_TICKS` for UI to detect completion
- `MIN_PRICE` and `MAX_PRICE` - Price bounds to prevent extreme values
- UI polls at half the tick rate (e.g., every 2.5s if ticks are 5s) for responsive updates

## Step 2: Install Dependencies

```bash
cd fruit-market-sim
npm install
```

## Step 3: Run the Development Server

```bash
npm run dev
```

Then open http://localhost:3000 in your browser!

**Important:** Keep the terminal visible! When you click "Start Simulation", you'll see important logs in the **terminal/backend console**:
- Agent initialization status
- **Locus wallet balance fetching** (with detailed debug output)
- Real-time tick updates
- Transaction confirmations


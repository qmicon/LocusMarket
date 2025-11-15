# Security Architecture

## 🔒 Payment Security Model

### The Vulnerability That Was Fixed

**BEFORE (DANGEROUS):**
```javascript
// ❌ AI had access to raw send_to_address tool
this.agent = createReactAgent({
  llm: this.llm,
  tools: [...this.locusTools, this.purchaseTool],
});
```

**Problem:** The AI agent could theoretically:
1. Ignore the safe `purchase_apples` tool
2. Call `send_to_address` directly
3. Send USDC to **ANY wallet address**
4. **Result: Loss of funds!**

### The Fix (SECURE)

**AFTER (SAFE):**
```javascript
// ✅ AI only has access to safe tools
const safeTools = [this.purchaseTool];  // purchase_apples (merchant address locked)
if (paymentContextTool) {
  safeTools.push(paymentContextTool);   // get_payment_context (read-only)
}

this.agent = createReactAgent({
  llm: this.llm,
  tools: safeTools,  // Only 2 safe tools
});
```

**Plus hardcoded merchant address:**
```javascript
const merchantAddress = process.env.MERCHANT_WALLET_ADDRESS;
if (!merchantAddress) {
  throw new Error('MERCHANT_WALLET_ADDRESS not configured');
}

const result = await sendTool.invoke({
  address: merchantAddress,  // ✅ LOCKED - cannot be changed by AI
  amount: totalCost,
  memo: `Purchase...`,
});
```

## 🛡️ Security Guarantees

### 1. Address Immutability
- ✅ Merchant address is read from `process.env.MERCHANT_WALLET_ADDRESS`
- ✅ This is set at server startup, not at runtime
- ✅ AI agents have **NO access** to modify environment variables
- ✅ Address is hardcoded in the tool implementation

### 2. Tool Isolation
- ✅ AI agents **ONLY** receive 2 safe tools:
  - `purchase_apples`: Wrapped payment tool (merchant address locked)
  - `get_payment_context`: Read-only balance checker (no risk)
- ✅ Dangerous Locus tools are **NOT** exposed to AI:
  - ❌ `send_to_address` (could send to any address)
  - ❌ `send_to_email` (could send to any email)
- ✅ Even if AI tries to call dangerous tools, they're not available

### 3. Validation Layers

**Layer 1: Tool Access Control**
- Agent has 2 safe tools: `purchase_apples` and `get_payment_context`
- Cannot access `send_to_address` or `send_to_email` directly

**Layer 2: Address Hardcoding**
- Merchant address read from environment
- Cannot be passed as parameter by AI

**Layer 3: Market Engine Validation**
- Budget checks (can't spend more than you have)
- Quantity limits (max_qty_per_tick enforced)
- Inventory checks (can't buy more than available)

**Layer 4: Locus MCP Validation**
- Final validation by Locus platform
- Budget limits enforced at platform level
- Transaction signing required

## 🔍 Security Audit Checklist

Before deploying to production:

- [ ] `MERCHANT_WALLET_ADDRESS` is set correctly in `.env.local`
- [ ] Verify agents only have 2 safe tools: `purchase_apples` and `get_payment_context` (check logs on startup)
- [ ] Test that AI cannot send funds to arbitrary addresses
- [ ] Verify budget limits are enforced
- [ ] Test with small amounts first ($1-2 per agent)
- [ ] Monitor first few transactions manually
- [ ] Set appropriate budget limits in Locus dashboard

## 🚨 What to Monitor

### Red Flags (indicate potential issues):
- ❌ Payments to unexpected addresses
- ❌ Payment amounts larger than expected
- ❌ Agents attempting to call undefined tools
- ❌ Errors about "tool not found"

### Normal Behavior:
- ✅ All payments go to `MERCHANT_WALLET_ADDRESS`
- ✅ Payment amounts = `quantity * current_price`
- ✅ Only 2 tools called: `purchase_apples` (payment) and `get_payment_context` (read balance)
- ✅ Console shows: `🔒 Payment destination locked: 0x...`
- ✅ Agents may check their balance (safe, read-only)

## 💡 Best Practices

1. **Start with DEV_MODE=true**
   - Test the simulation without real payments
   - Verify agent behavior is reasonable
   - Check that price movements make sense

2. **Use Small Budgets Initially**
   - Start with $1-2 per agent
   - Increase gradually after observing behavior

3. **Monitor Console Logs**
   - Every payment shows: `🔒 Payment destination locked`
   - Verify the address matches your merchant address

4. **Set Locus Budget Limits**
   - Use Locus dashboard to set strict budget limits
   - This is your final line of defense

5. **Review Transactions**
   - Check Locus dashboard after first few ticks
   - Verify all payments went to correct address

## 🔐 Environment Variable Security

**Critical Variables:**
```env
# These control where money goes - VERIFY CAREFULLY!
MERCHANT_WALLET_ADDRESS=0x...  # ← Double-check this!

# These control agent access - keep secret!
FRUGAL_BUYER_CLIENT_ID=...
FRUGAL_BUYER_CLIENT_SECRET=...
IMPULSIVE_BUYER_CLIENT_ID=...
IMPULSIVE_BUYER_CLIENT_SECRET=...
SKEPTICAL_BUYER_CLIENT_ID=...
SKEPTICAL_BUYER_CLIENT_SECRET=...
ANTHROPIC_API_KEY=sk-ant-...
```

**Security Rules:**
- ✅ Never commit `.env.local` to git (already in `.gitignore`)
- ✅ Use separate Locus wallets for each agent (already configured)
- ✅ Set budget limits in Locus dashboard
- ✅ Rotate credentials periodically
- ❌ Never share credentials publicly
- ❌ Never use production credentials in development

**Automatic Balance Fetching:**
- ✅ Agent budgets are fetched from actual Locus wallets at startup
- ✅ Uses read-only `get_payment_context` tool (safe)
- ✅ Agents always reflect real wallet balances
- ✅ Fallback to $10.00 if fetch fails (for testing/dev)
- ✅ No hardcoded balances - source of truth is Locus

## 📊 Example Safe Transaction Flow

```
1. AI Agent decides: "Buy 3 apples"
   ↓
2. Agent calls: purchase_apples(quantity: 3)
   ↓
3. Tool fetches: merchantAddress = process.env.MERCHANT_WALLET_ADDRESS
   ↓
4. Tool validates: merchantAddress exists and is valid
   ↓
5. Tool calculates: totalCost = 3 * $0.02 = $0.06
   ↓
6. Tool calls: send_to_address(address: merchantAddress, amount: 0.06)
   ↓
7. Locus validates: Budget sufficient, address valid
   ↓
8. Payment executed: $0.06 USDC → merchant address
   ↓
9. Result returned: Transaction ID, status
```

**At NO point can the AI:**
- Choose the destination address
- Access the raw send_to_address tool
- Access the send_to_email tool
- Send funds to arbitrary addresses
- Modify the merchant address

**The AI can only:**
- Call `purchase_apples(quantity)` - payment goes to merchant address
- Call `get_payment_context()` - check balance (read-only, no risk)

## 🎯 Testing Security

### Test 1: Verify Tool Access
```javascript
// After starting simulation, check console:
// Should see: "Agent ready (2 safe tools: purchase + balance check)"
// Should NOT see raw Locus tools (send_to_address, send_to_email) in agent's tool list
```

### Test 2: Verify Address Locking
```javascript
// Every payment should show:
// "🔒 Payment destination locked: 0xYOUR_MERCHANT_ADDRESS"
```

### Test 3: Verify DEV_MODE
```bash
# Set DEV_MODE=true in .env.local
# Start simulation
# Should see: "[DEV MODE] Agent would buy..."
# Should NOT see real Locus transactions
```

## 📞 If You Find a Security Issue

1. **Stop the simulation immediately** (click Stop button)
2. Check the console logs for unexpected behavior
3. Verify no unauthorized transactions in Locus dashboard
4. Review the code before restarting
5. Report the issue to the development team

## ✅ Security Verification Script

Before running with real money:

1. ✅ Read this entire document
2. ✅ Verify `MERCHANT_WALLET_ADDRESS` is correct
3. ✅ Test with `DEV_MODE=true` first
4. ✅ Start with minimal budgets ($1-2)
5. ✅ Monitor first 5-10 ticks closely
6. ✅ Check Locus dashboard after each tick
7. ✅ Verify all payments go to merchant address
8. ✅ Gradually increase budgets if behavior is correct

---

**Remember:** Even with these protections, always start with small amounts and monitor closely!


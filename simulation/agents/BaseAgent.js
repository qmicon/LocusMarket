import { MCPClientCredentials } from '@locus-technologies/langchain-mcp-m2m';
import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * BaseAgent - Base class for all AI buyer agents
 * Handles LangChain + Locus MCP integration
 */
export class BaseAgent {
  /**
   * @param {import('../types/index.js').AgentState} state - Initial agent state
   */
  constructor(state) {
    this.state = state;
    this.mcpClient = null;
    this.llm = null;
    this.agent = null;
    this.purchaseTool = null;
    this.locusTools = [];
    this.currentPrice = 0;
  }

  /**
   * Initialize the agent's MCP client and LangChain agent
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log(`\n🔧 Initializing ${this.state.name}...`);
    
    // Initialize MCP client
    this.mcpClient = new MCPClientCredentials({
      mcpServers: {
        locus: {
          url: 'https://mcp.paywithlocus.com/mcp',
          auth: {
            clientId: this.state.credentials.clientId,
            clientSecret: this.state.credentials.clientSecret,
          },
        },
      },
    });

    await this.mcpClient.initializeConnections();
    this.locusTools = await this.mcpClient.getTools();
    console.log(`   ✓ Connected to Locus MCP (${this.locusTools.length} tools loaded)`);

    // Create custom purchase tool (wraps send_to_address with merchant address locked)
    this.purchaseTool = this.createPurchaseTool();

    // Get the safe read-only tool for checking balance
    const paymentContextTool = this.locusTools.find(t => t.name === 'get_payment_context');

    // Initialize LLM
    this.llm = new ChatAnthropic({
      model: 'claude-sonnet-4-20250514',
      apiKey: this.state.credentials.apiKey,
      temperature: 0.4, // Some randomness for variety
    });
    console.log(`   ✓ LLM initialized`);

    // SECURITY: Only give agent safe tools:
    // - purchase_apples: locked to merchant address
    // - get_payment_context: read-only, shows balance
    // NOT giving: send_to_address, send_to_email (dangerous)
    const safeTools = [this.purchaseTool];
    if (paymentContextTool) {
      safeTools.push(paymentContextTool);
    }

    this.agent = createReactAgent({
      llm: this.llm,
      tools: safeTools,
    });
    console.log(`   ✓ Agent ready (${safeTools.length} safe tools: purchase + balance check)\n`);
  }

  /**
   * Create the purchase apples tool
   * @returns {DynamicStructuredTool}
   */
  createPurchaseTool() {
    return new DynamicStructuredTool({
      name: 'purchase_apples',
      description: 'Purchase apples from the market at current market price. This actually sends USDC payment via Locus.',
      schema: z.object({
        quantity: z.number().positive().describe('Number of apples to buy (must be > 0)'),
      }),
      func: async ({ quantity }) => {
        try {
          // Check DEV_MODE
          if (process.env.DEV_MODE === 'true') {
            console.log(`   [DEV MODE] ${this.state.name} would buy ${quantity} apples @ $${this.currentPrice}/unit`);
            return JSON.stringify({
              success: true,
              mock: true,
              quantity,
              price: this.currentPrice,
              total: quantity * this.currentPrice,
              message: 'DEV MODE: Purchase simulated (no real payment)',
            });
          }

          // Real Locus payment
          const sendTool = this.locusTools.find(t => t.name === 'send_to_address');
          if (!sendTool) {
            throw new Error('send_to_address tool not found');
          }

          // SECURITY: Merchant address is HARDCODED from environment
          // This cannot be overridden by the AI agent
          const merchantAddress = process.env.MERCHANT_WALLET_ADDRESS;
          if (!merchantAddress) {
            throw new Error('MERCHANT_WALLET_ADDRESS not configured');
          }

          const totalCost = quantity * this.currentPrice;
          
          console.log(`   💸 ${this.state.name} purchasing ${quantity} apples for $${totalCost.toFixed(4)} USDC...`);
          console.log(`   🔒 Payment destination locked: ${merchantAddress}`);
          
          const result = await sendTool.invoke({
            address: merchantAddress,  // ✅ LOCKED to merchant address
            amount: totalCost,
            memo: `${this.state.name}: Purchase ${quantity} apples @ $${this.currentPrice}/unit (Tick ${this.state.history.last_tick_seen + 1})`,
          });

          return JSON.stringify({
            success: true,
            quantity,
            price: this.currentPrice,
            total: totalCost,
            transaction: result,
            message: `Successfully purchased ${quantity} apples for $${totalCost.toFixed(4)} USDC`,
          });
        } catch (error) {
          console.error(`   ❌ Purchase failed:`, error.message);
          return JSON.stringify({
            success: false,
            error: error.message,
            message: 'Failed to complete purchase',
          });
        }
      },
    });
  }

  /**
   * Get the system prompt for this agent (must be implemented by subclasses)
   * @returns {string}
   */
  getSystemPrompt() {
    throw new Error('getSystemPrompt() must be implemented by subclass');
  }

  /**
   * Make a decision for the current tick
   * @param {import('../types/index.js').MarketState} marketState - Current market state
   * @returns {Promise<import('../types/index.js').AgentDecision>}
   */
  async makeDecision(marketState) {
    this.currentPrice = marketState.current_price;
    const prompt = this.buildPrompt(marketState);
    
    try {
      // Use LLM directly for decisions, NOT the agent with tools
      // This prevents the agent from actually calling purchase_apples during decision-making
      const response = await this.llm.invoke([
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: prompt },
      ]);

      const decision = this.parseDecision(response.content);
      
      console.log(`   🤔 ${this.state.name}: ${decision.action} ${decision.quantity > 0 ? `${decision.quantity} apples` : ''} - ${decision.note}`);
      
      return decision;
    } catch (error) {
      console.error(`   ❌ ${this.state.name} decision error:`, error.message);
      return {
        action: 'wait',
        quantity: 0,
        note: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Build the prompt for the current tick
   * @param {import('../types/index.js').MarketState} marketState
   * @returns {string}
   */
  buildPrompt(marketState) {
    const rollingAvg = this.calculateRollingAverage();
    const lastAction = this.state.history.actions.slice(-1)[0];
    const recentPrices = this.state.history.prices_seen.slice(-5);
    
    return `Market Tick ${marketState.tick}

CURRENT MARKET STATE:
- Price: $${marketState.current_price.toFixed(4)} USDC per apple
- Seller Inventory: ${marketState.seller_inventory} apples remaining
- Rolling Average Price (last ${this.state.history.prices_seen.length} ticks): $${rollingAvg.toFixed(4)}

YOUR STATE:
- Money: $${this.state.money.toFixed(2)} USDC
- Inventory: ${this.state.inventory} apples owned
- Max purchase per tick: ${this.state.preferences.max_qty_per_tick} apples
${this.state.preferences.threshold ? `- Your price threshold: $${this.state.preferences.threshold.toFixed(4)}` : ''}

RECENT PRICE HISTORY: [${recentPrices.map(p => '$' + p.toFixed(4)).join(', ')}]
LAST ACTION: ${lastAction ? `${lastAction.action} (${lastAction.qty} apples) - "${lastAction.note}"` : 'None'}

YOUR STATISTICS:
- Total Spent: $${this.state.long_term.total_spent.toFixed(2)} USDC
- Total Bought: ${this.state.long_term.total_qty_bought} apples
- Your Average Price: $${this.state.long_term.avg_purchase_price > 0 ? this.state.long_term.avg_purchase_price.toFixed(4) : '0.0000'}

DECISION REQUIRED:
Based on your personality and strategy, decide whether to BUY apples or WAIT this tick.

IMPORTANT: You are ONLY making a DECISION. Do NOT try to execute the purchase yourself.
Just return your decision and the market will handle the execution.

Return your decision in JSON format wrapped in markdown code fences:

\`\`\`json
{"action":"buy","quantity":3,"note":"price below threshold"}
\`\`\`

OR

\`\`\`json
{"action":"wait","quantity":0,"note":"price too high"}
\`\`\`

Remember:
- You can only afford ${Math.floor(this.state.money / marketState.current_price)} apples max
- You can buy max ${this.state.preferences.max_qty_per_tick} per tick
- quantity must be 0 if action is "wait"
- action must be either "buy" or "wait"
`;
  }

  /**
   * Parse the LLM's decision from its response
   * @param {string} content - LLM response content
   * @returns {import('../types/index.js').AgentDecision}
   */
  parseDecision(content) {
    try {
      let jsonString = '';
      
      // First, try to extract from markdown code fence (```json ... ``` or ``` ... ```)
      const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
      } else {
        // Fallback: try to find JSON object directly
        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        jsonString = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonString);
      
      return {
        action: parsed.action === 'buy' ? 'buy' : 'wait',
        quantity: Math.max(0, parseInt(parsed.quantity) || 0),
        note: parsed.note || 'No reason provided',
      };
    } catch (error) {
      console.error(`   ❌ Failed to parse decision:`, content);
      return {
        action: 'wait',
        quantity: 0,
        note: 'Parse error - defaulting to wait',
      };
    }
  }

  /**
   * Calculate rolling average of observed prices
   * @returns {number}
   */
  calculateRollingAverage() {
    const prices = this.state.history.prices_seen;
    if (prices.length === 0) return 0;
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }

  /**
   * Get the current agent state
   * @returns {import('../types/index.js').AgentState}
   */
  getState() {
    return this.state;
  }
}


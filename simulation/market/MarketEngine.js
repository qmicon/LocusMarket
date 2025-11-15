import { PricingEngine } from './PricingEngine.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * MarketEngine - Core simulation coordinator
 * Manages market state, executes ticks, processes transactions
 */
export class MarketEngine {
  /**
   * @param {number} initialPrice - Starting price per unit
   * @param {number} initialInventory - Starting inventory
   * @param {import('../types/index.js').AgentState[]} agents - Array of agent states
   */
  constructor(initialPrice, initialInventory, agents) {
    /** @type {import('../types/index.js').MarketState} */
    this.marketState = {
      tick: 0,
      current_price: initialPrice,
      seller_inventory: initialInventory,
      seller_revenue: 0,
      last_updated: new Date(),
    };
    
    /** @type {Map<string, import('../types/index.js').AgentState>} */
    this.agents = new Map(agents.map(a => [a.id, a]));
    
    this.pricingEngine = new PricingEngine();
    
    /** @type {import('../types/index.js').TickResult[]} */
    this.tickHistory = [];
  }

  /**
   * Execute one tick of the simulation
   * @param {Object.<string, import('../types/index.js').AgentDecision>} decisions - Agent decisions
   * @returns {Promise<import('../types/index.js').TickResult>}
   */
  async executeTick(decisions) {
    const tick = ++this.marketState.tick;
    const priceBefore = this.marketState.current_price;
    
    /** @type {import('../types/index.js').Transaction[]} */
    const transactions = [];
    
    // 1. Sanitize and validate decisions
    const validDecisions = this.sanitizeDecisions(decisions);
    
    // 2. Execute purchases
    let totalDemand = 0;
    
    for (const [agentId, decision] of Object.entries(validDecisions)) {
      if (decision.action === 'buy' && decision.quantity > 0) {
        const agent = this.agents.get(agentId);
        if (!agent) continue;
        
        const qty = decision.quantity;
        const cost = qty * this.marketState.current_price;
        
        // Check if we have inventory and agent has money
        if (
          this.marketState.seller_inventory >= qty &&
          agent.money >= cost
        ) {
          // Execute transaction
          agent.money -= cost;
          agent.inventory += qty;
          this.marketState.seller_inventory -= qty;
          this.marketState.seller_revenue += cost;
          
          // Update long-term stats
          agent.long_term.total_spent += cost;
          agent.long_term.total_qty_bought += qty;
          agent.long_term.avg_purchase_price =
            agent.long_term.total_spent / agent.long_term.total_qty_bought;
          agent.long_term.max_single_tick_purchase = Math.max(
            agent.long_term.max_single_tick_purchase,
            qty
          );
          
          // Record transaction
          /** @type {import('../types/index.js').Transaction} */
          const transaction = {
            id: uuidv4(),
            tick,
            agent_id: agentId,
            agent_name: agent.name,
            quantity: qty,
            price: this.marketState.current_price,
            total_cost: cost,
            note: decision.note,
            timestamp: new Date(),
          };
          
          transactions.push(transaction);
          totalDemand += qty;
          
          // Update agent history
          agent.history.actions.push({
            tick,
            action: 'buy',
            qty,
            price: this.marketState.current_price,
            note: decision.note,
          });
        }
      } else {
        // Wait action
        const agent = this.agents.get(agentId);
        if (agent) {
          agent.history.actions.push({
            tick,
            action: 'wait',
            qty: 0,
            note: decision.note,
          });
        }
      }
      
      // Update agent price history
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.history.prices_seen.push(this.marketState.current_price);
        agent.history.last_tick_seen = tick;
        
        // Truncate history to last 10
        if (agent.history.prices_seen.length > 10) {
          agent.history.prices_seen = agent.history.prices_seen.slice(-10);
        }
        if (agent.history.actions.length > 10) {
          agent.history.actions = agent.history.actions.slice(-10);
        }
      }
    }
    
    // 3. Calculate new price
    // Use a fixed baseline supply (equilibrium point where price is stable)
    // If demand > baseline → price goes up
    // If demand < baseline → price goes down
    const baselineSupply = 3; // Expected "normal" demand per tick
    
    const priceAfter = this.pricingEngine.calculatePriceChange(
      totalDemand,
      baselineSupply,
      priceBefore
    );
    
    this.marketState.current_price = priceAfter;
    this.marketState.last_updated = new Date();
    
    // 4. Create tick result
    /** @type {import('../types/index.js').TickResult} */
    const tickResult = {
      tick,
      price_before: priceBefore,
      price_after: priceAfter,
      decisions: validDecisions,
      executed_transactions: transactions,
      market_state: { ...this.marketState },
      timestamp: new Date(),
    };
    
    this.tickHistory.push(tickResult);
    
    // Keep history bounded (last 100 ticks)
    if (this.tickHistory.length > 100) {
      this.tickHistory = this.tickHistory.slice(-100);
    }
    
    return tickResult;
  }

  /**
   * Sanitize and validate agent decisions
   * @param {Object.<string, import('../types/index.js').AgentDecision>} decisions
   * @returns {Object.<string, import('../types/index.js').AgentDecision>}
   */
  sanitizeDecisions(decisions) {
    /** @type {Object.<string, import('../types/index.js').AgentDecision>} */
    const sanitized = {};
    
    for (const [agentId, decision] of Object.entries(decisions)) {
      const agent = this.agents.get(agentId);
      if (!agent) continue;
      
      let qty = Math.max(0, Math.floor(decision.quantity));
      
      // Apply constraints
      qty = Math.min(qty, agent.preferences.max_qty_per_tick);
      qty = Math.min(qty, Math.floor(agent.money / this.marketState.current_price));
      qty = Math.min(qty, this.marketState.seller_inventory);
      
      sanitized[agentId] = {
        action: qty > 0 ? 'buy' : 'wait',
        quantity: qty,
        note: decision.note || '',
      };
    }
    
    return sanitized;
  }

  /**
   * Get current market state
   * @returns {import('../types/index.js').MarketState}
   */
  getMarketState() {
    return { ...this.marketState };
  }

  /**
   * Get all agent states
   * @returns {import('../types/index.js').AgentState[]}
   */
  getAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Get tick history
   * @returns {import('../types/index.js').TickResult[]}
   */
  getTickHistory() {
    return this.tickHistory;
  }
}


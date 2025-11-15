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
   * @param {import('../types/index.js').AgentState[]} agentStates - Array of agent states
   * @param {Array} agentInstances - Array of agent instances (with MCP tools)
   */
  constructor(initialPrice, initialInventory, agentStates, agentInstances = []) {
    /** @type {import('../types/index.js').MarketState} */
    this.marketState = {
      tick: 0,
      current_price: initialPrice,
      seller_inventory: initialInventory,
      seller_revenue: 0,
      last_updated: new Date(),
    };
    
    /** @type {Map<string, import('../types/index.js').AgentState>} */
    this.agents = new Map(agentStates.map(a => [a.id, a]));
    
    /** @type {Map<string, any>} */
    this.agentInstances = new Map(agentInstances.map(a => [a.getState().id, a]));
    
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
    
    // 2. Execute purchases and sales
    let totalDemand = 0;
    let totalSupply = 0;
    
    for (const [agentId, decision] of Object.entries(validDecisions)) {
      if (decision.action === 'buy' && decision.quantity > 0) {
        const agent = this.agents.get(agentId);
        const agentInstance = this.agentInstances.get(agentId);
        if (!agent || !agentInstance) continue;
        
        const qty = decision.quantity;
        const cost = qty * this.marketState.current_price;
        
        // Check if we have inventory and agent has money
        if (
          this.marketState.seller_inventory >= qty &&
          agent.money >= cost
        ) {
          try {
            // Execute REAL MCP transaction via agent's purchase tool
            console.log(`   💸 Executing real MCP purchase for ${agent.name}: ${qty} apples @ $${this.marketState.current_price}`);
            
            const result = await agentInstance.purchaseTool.invoke({
              quantity: qty,
            });
            
            // Parse result (it's a JSON string)
            const purchaseResult = JSON.parse(result);
            
            if (!purchaseResult.success) {
              console.error(`   ❌ Purchase failed for ${agent.name}: ${purchaseResult.error}`);
              continue; // Skip this transaction
            }
            
            console.log(`   ✅ MCP purchase successful for ${agent.name}`);
            
            // Update in-memory state (money already deducted by MCP)
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
              action: 'buy',
              transaction_hash: purchaseResult.transaction?.id || 'N/A',
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
          } catch (error) {
            console.error(`   ❌ MCP purchase error for ${agent.name}:`, error.message);
            // Don't update state if transaction failed
          }
        }
      } else if (decision.action === 'sell' && decision.quantity > 0) {
        const agent = this.agents.get(agentId);
        const agentInstance = this.agentInstances.get(agentId);
        if (!agent || !agentInstance) continue;
        
        const qty = decision.quantity;
        const revenue = qty * this.marketState.current_price;
        
        // Check if agent has inventory to sell
        if (agent.inventory >= qty) {
          try {
            // Execute REAL MCP transaction via agent's sell tool
            console.log(`   💰 Executing real MCP sale for ${agent.name}: ${qty} apples @ $${this.marketState.current_price}`);
            
            const result = await agentInstance.sellTool.invoke({
              quantity: qty,
            });
            
            // Parse result (it's a JSON string)
            const sellResult = JSON.parse(result);
            
            if (!sellResult.success) {
              console.error(`   ❌ Sale failed for ${agent.name}: ${sellResult.error}`);
              continue; // Skip this transaction
            }
            
            console.log(`   ✅ MCP sale successful for ${agent.name}`);
            
            // Update in-memory state (money already received via MCP)
            agent.money += revenue;
            agent.inventory -= qty;
            this.marketState.seller_inventory += qty;
            this.marketState.seller_revenue -= revenue;
            
            // Update long-term stats for sales
            agent.long_term.total_revenue += revenue;
            agent.long_term.total_qty_sold += qty;
            agent.long_term.realized_profit = agent.long_term.total_revenue - agent.long_term.total_spent;
            
            // Record transaction
            /** @type {import('../types/index.js').Transaction} */
            const transaction = {
              id: uuidv4(),
              tick,
              agent_id: agentId,
              agent_name: agent.name,
              quantity: qty,
              price: this.marketState.current_price,
              total_cost: revenue,
              note: decision.note,
              timestamp: new Date(),
              action: 'sell',
              transaction_hash: sellResult.transaction?.id || 'N/A',
            };
            
            transactions.push(transaction);
            totalSupply += qty;
            
            // Update agent history
            agent.history.actions.push({
              tick,
              action: 'sell',
              qty,
              price: this.marketState.current_price,
              note: decision.note,
            });
          } catch (error) {
            console.error(`   ❌ MCP sale error for ${agent.name}:`, error.message);
            // Don't update state if transaction failed
          }
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
    // Net demand = buys - sells (positive = net buying pressure, negative = net selling pressure)
    // Baseline = 0 for maximum sensitivity (any imbalance moves price)
    // If net demand > 0 → price goes up (more buying than selling)
    // If net demand < 0 → price goes down (more selling than buying)
    // If net demand = 0 → price stays stable (plus noise)
    const netDemand = totalDemand - totalSupply;
    const baselineSupply = 0; // Zero baseline = max sensitivity to market forces
    
    const priceAfter = this.pricingEngine.calculatePriceChange(
      netDemand,
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
      let action = decision.action;
      
      if (action === 'buy') {
        // Apply buy constraints based on balance
        const maxSpendPercent = agent.preferences.max_spend_percent || 0.40;
        const maxSpend = agent.money * maxSpendPercent;
        const maxQtyByBalance = Math.floor(maxSpend / this.marketState.current_price);
        const maxQtyByInventory = this.marketState.seller_inventory;
        
        // Clamp to the most restrictive limit
        qty = Math.min(qty, maxQtyByBalance, maxQtyByInventory);
        
        sanitized[agentId] = {
          action: qty > 0 ? 'buy' : 'wait',
          quantity: qty,
          note: decision.note || '',
        };
      } else if (action === 'sell') {
        // Apply sell constraints - can only sell what you own
        // Also limit to a reasonable percentage of inventory to avoid depleting all at once
        const maxSellPercent = 0.08; // Can sell up to 8% of inventory per tick
        const maxQtyBySellLimit = Math.ceil(agent.inventory * maxSellPercent);
        
        qty = Math.min(qty, agent.inventory, maxQtyBySellLimit);
        
        sanitized[agentId] = {
          action: qty > 0 ? 'sell' : 'wait',
          quantity: qty,
          note: decision.note || '',
        };
      } else {
        // Wait action
        sanitized[agentId] = {
          action: 'wait',
          quantity: 0,
          note: decision.note || '',
        };
      }
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


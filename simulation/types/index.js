/**
 * Type definitions for the market simulation
 * These are JSDoc comments for better IDE support
 */

/**
 * @typedef {'frugal' | 'impulsive' | 'skeptical'} AgentPersonality
 */

/**
 * @typedef {Object} AgentPreferences
 * @property {string} good - The product being traded (e.g., 'apple')
 * @property {number} max_spend_percent - Maximum percentage of balance to spend per tick (0.0-1.0)
 * @property {number} [threshold] - Price threshold (used by frugal buyer)
 */

/**
 * @typedef {Object} ActionRecord
 * @property {number} tick - Tick number when action occurred
 * @property {'buy' | 'sell' | 'wait'} action - Action taken
 * @property {number} qty - Quantity purchased or sold (0 if wait)
 * @property {number} [price] - Price at time of transaction
 * @property {string} [note] - Reasoning for the decision
 */

/**
 * @typedef {Object} AgentHistory
 * @property {number[]} prices_seen - Recent prices observed
 * @property {ActionRecord[]} actions - Recent actions taken
 * @property {number} last_tick_seen - Last tick processed
 */

/**
 * @typedef {Object} AgentLongTerm
 * @property {number} total_spent - Total USDC spent on purchases
 * @property {number} total_qty_bought - Total units purchased
 * @property {number} avg_purchase_price - Average price paid per unit
 * @property {number} max_single_tick_purchase - Largest single purchase
 * @property {number} total_revenue - Total USDC earned from sales
 * @property {number} total_qty_sold - Total units sold
 * @property {number} realized_profit - Net profit/loss (revenue - spent)
 */

/**
 * @typedef {Object} AgentCredentials
 * @property {string} clientId - Locus MCP client ID
 * @property {string} clientSecret - Locus MCP client secret
 * @property {string} apiKey - Anthropic API key
 */

/**
 * @typedef {Object} AgentState
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {'buyer'} type - Agent type
 * @property {AgentPersonality} personality - Personality type
 * @property {number} money - Current money (USDC)
 * @property {number} inventory - Current inventory (apples owned)
 * @property {AgentPreferences} preferences - Agent preferences
 * @property {AgentHistory} history - Historical data
 * @property {AgentLongTerm} long_term - Long-term statistics
 * @property {AgentCredentials} credentials - API credentials
 */

/**
 * @typedef {Object} AgentDecision
 * @property {'buy' | 'sell' | 'wait'} action - Action to take
 * @property {number} quantity - Quantity to purchase or sell
 * @property {string} note - Reasoning for decision
 */

/**
 * @typedef {Object} MarketState
 * @property {number} tick - Current tick number
 * @property {number} current_price - Current price per unit
 * @property {number} seller_inventory - Remaining seller inventory
 * @property {number} seller_revenue - Total revenue collected
 * @property {Date} last_updated - Last update timestamp
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id - Unique transaction ID
 * @property {number} tick - Tick when transaction occurred
 * @property {string} agent_id - Agent ID
 * @property {string} agent_name - Agent name
 * @property {'buy' | 'sell'} action - Transaction type (buy or sell)
 * @property {number} quantity - Units purchased or sold
 * @property {number} price - Price per unit
 * @property {number} total_cost - Total cost or revenue (price * quantity)
 * @property {string} note - Reason for transaction decision
 * @property {Date} timestamp - Transaction timestamp
 * @property {string} [transaction_hash] - Locus transaction ID
 */

/**
 * @typedef {Object} TickResult
 * @property {number} tick - Tick number
 * @property {number} price_before - Price before tick
 * @property {number} price_after - Price after tick
 * @property {Object.<string, AgentDecision>} decisions - Agent decisions
 * @property {Transaction[]} executed_transactions - Completed transactions
 * @property {MarketState} market_state - Market state after tick
 * @property {Date} timestamp - Tick timestamp
 */

// Export empty object for ES modules compatibility
export {};


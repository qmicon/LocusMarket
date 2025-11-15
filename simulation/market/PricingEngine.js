/**
 * PricingEngine - Calculates price changes based on supply and demand
 */
export class PricingEngine {
  constructor() {
    this.minPrice = parseFloat(process.env.MIN_PRICE || '0.0001');
    this.maxPrice = parseFloat(process.env.MAX_PRICE || '1.0');
    
    console.log(`   Price bounds: $${this.minPrice} - $${this.maxPrice}`);
  }

  /**
   * Calculate new price based on demand and supply
   * Formula: price_delta = 0.01 * (demand - supply) + noise
   * Then: price_next = price_current * (1 + price_delta)
   * Then clamp(price_next, min, max)
   * 
   * @param {number} demand - Total units demanded this tick
   * @param {number} supply - Expected baseline supply per tick
   * @param {number} currentPrice - Current price per unit
   * @returns {number} New price (clamped to min/max)
   */
  calculatePriceChange(demand, supply, currentPrice) {
    // Fixed baseline supply expectation (equilibrium point)
    // This represents "normal" demand level where price stays stable
    const baselineSupply = supply > 0 ? supply : 3;
    
    // Calculate raw imbalance
    // Positive = more demand than expected → price up
    // Negative = less demand than expected → price down
    const imbalance = demand - baselineSupply;
    
    // Scale the imbalance to percentage change
    // 0.01 = 1% price change per unit of imbalance
    // Example: If demand=10 and baseline=3, imbalance=7 → 7% price increase
    const baseDelta = imbalance * 0.01;
    
    // Add noise for volatility: random between -0.5% and +0.5%
    const noise = (Math.random() - 0.5) * 0.01;
    
    const priceDelta = baseDelta + noise;
    
    // Calculate new price
    const newPrice = currentPrice * (1 + priceDelta);
    
    // Clamp to bounds
    return Math.max(this.minPrice, Math.min(this.maxPrice, newPrice));
  }

  /**
   * Calculate rolling average of prices
   * @param {number[]} prices - Array of prices
   * @returns {number} Average price
   */
  calculateRollingAverage(prices) {
    if (prices.length === 0) return 0;
    const sum = prices.reduce((a, b) => a + b, 0);
    return sum / prices.length;
  }
}


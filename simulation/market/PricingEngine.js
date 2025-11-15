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
   * Formula: price_delta = 0.05 * (demand - supply) + noise
   * Then: price_next = price_current * (1 + price_delta)
   * Then clamp(price_next, min, max)
   * 
   * @param {number} demand - Total units demanded this tick (net: buys - sells)
   * @param {number} supply - Expected baseline supply per tick (equilibrium point)
   * @param {number} currentPrice - Current price per unit
   * @returns {number} New price (clamped to min/max)
   */
  calculatePriceChange(demand, supply, currentPrice) {
    // Fixed baseline supply expectation (equilibrium point)
    // Set to 0 for maximum sensitivity - any net buying/selling moves price
    const baselineSupply = supply > 0 ? supply : 0;
    
    // Calculate raw imbalance
    // Positive = net buying pressure → price up
    // Negative = net selling pressure → price down
    // Zero = balanced → price stable (plus noise)
    const imbalance = demand - baselineSupply;
    
    // Scale the imbalance to percentage change
    // 0.05 = 5% price change per unit of net imbalance
    // Example: If net demand = +4, price increases 20%
    // Example: If net demand = -3, price decreases 15%
    const baseDelta = imbalance * 0.05;
    
    // Add noise for volatility: random between -1% and +1%
    const noise = (Math.random() - 0.5) * 0.02;
    
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


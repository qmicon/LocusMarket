/**
 * Global state for the market simulation
 * Shared across API routes
 */

// Store market engine instance
export let marketEngine = null;

// Store agent instances
export let agents = [];

// Store simulation interval
export let simulationInterval = null;

// Flag to indicate if simulation should be running (internal state)
let _isSimulationRunning = false;

// Lock to prevent concurrent simulation starts
let _isStarting = false;

// Getter for simulation running state
export function isSimulationRunning() {
  return _isSimulationRunning;
}

// Check if a start operation is in progress
export function isStarting() {
  return _isStarting;
}

// Set starting lock
export function setStarting(value) {
  console.log(`🔒 Setting starting lock to: ${value}`);
  _isStarting = value;
}

// Store event listeners for SSE
export const eventListeners = new Set();

/**
 * Set the market engine
 * @param {import('../simulation/market/MarketEngine.js').MarketEngine} engine
 */
export function setMarketEngine(engine) {
  marketEngine = engine;
}

/**
 * Set the agents
 * @param {Array} agentList
 */
export function setAgents(agentList) {
  agents = agentList;
}

/**
 * Set the simulation interval
 * @param {NodeJS.Timeout} interval
 */
export function setSimulationInterval(interval) {
  simulationInterval = interval;
}

/**
 * Clear simulation interval/timeout
 */
export function clearSimulationInterval() {
  console.log('🔴 Clearing simulation timeout and setting flag to false');
  _isSimulationRunning = false;
  if (simulationInterval) {
    clearTimeout(simulationInterval); // Works for both setTimeout and setInterval
    simulationInterval = null;
    console.log('✅ Timeout cleared');
  } else {
    console.log('⚠️  No timeout to clear');
  }
}

/**
 * Set simulation running flag
 * @param {boolean} running
 */
export function setSimulationRunning(running) {
  console.log(`🟢 Setting simulation running flag to: ${running}`);
  _isSimulationRunning = running;
}

/**
 * Broadcast event to all SSE listeners
 * @param {any} data
 */
export function broadcastEvent(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const listener of eventListeners) {
    try {
      listener(message);
    } catch (error) {
      // Remove broken listeners
      eventListeners.delete(listener);
    }
  }
}


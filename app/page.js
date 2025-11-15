'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [market, setMarket] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completionMessage, setCompletionMessage] = useState(null);

  // Fetch market data
  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await fetch('/api/market');
        if (res.ok) {
          const data = await res.json();
          setMarket(data);
          
          // Check if simulation should stop (inventory depleted or max ticks reached)
          const maxTicks = parseInt(process.env.NEXT_PUBLIC_MAX_TICKS || '0');
          const shouldStop = data.market.seller_inventory <= 0 || 
                            (maxTicks > 0 && data.market.tick >= maxTicks);
          
          if (data.market && shouldStop) {
            setIsRunning(false);
            setCompletionMessage({
              tick: data.market.tick,
              revenue: data.market.seller_revenue,
              price: data.market.current_price,
              inventory: data.market.seller_inventory,
              reason: data.market.seller_inventory <= 0 ? 'inventory' : 'ticks',
            });
          }
        } else {
          // Market stopped (503)
          if (market && market.market && market.market.seller_inventory <= 0) {
            // Keep showing completion message
            setIsRunning(false);
          }
        }
      } catch (err) {
        // Market not initialized yet
      }
    };

    fetchMarket();
    // Poll at half the simulation tick rate for responsive UI
    // Or every 2 seconds minimum for good responsiveness
    const pollInterval = Math.max(2000, parseInt(process.env.NEXT_PUBLIC_SIMULATION_TICK_MS || '5000') / 2);
    const interval = setInterval(fetchMarket, pollInterval);
    return () => clearInterval(interval);
  }, []); // Empty dependency array - only run once on mount

  // Handle start/stop
  const handleControl = async (action) => {
    // Prevent duplicate requests
    if (isLoading) {
      console.log('⚠️ Request already in progress, ignoring duplicate');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Clear completion message when starting new simulation
    if (action === 'start') {
      setCompletionMessage(null);
    }
    
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        // If it's a 409 (conflict), it means simulation is already running/starting
        if (res.status === 409) {
          console.log('⚠️ Simulation already active:', data.message);
          // Don't treat as error, just ignore
          return;
        }
        throw new Error(data.message || 'Failed to ' + action);
      }

      setIsRunning(action === 'start');
      
      // Refresh market data
      setTimeout(async () => {
        const marketRes = await fetch('/api/market');
        if (marketRes.ok) {
          const marketData = await marketRes.json();
          setMarket(marketData);
        }
      }, 1000);
      
    } catch (err) {
      setError(err.message);
      console.error('Control error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const personalityColors = {
    frugal: 'bg-green-100 text-green-800 border-green-300',
    impulsive: 'bg-red-100 text-red-800 border-red-300',
    skeptical: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-2">
              🍎 AI Fruit Market
            </h1>
            <p className="text-gray-600">
              Watch 3 AI agents compete in a dynamic marketplace
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => handleControl('start')}
              disabled={isRunning || isLoading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {isLoading && !isRunning ? 'Starting...' : '▶️ Start'}
            </button>
            <button
              onClick={() => handleControl('stop')}
              disabled={!isRunning || isLoading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              ⏸️ Stop
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg">
            ❌ {error}
          </div>
        )}

        {completionMessage && (
          <div className="mb-6 p-6 bg-green-50 border-2 border-green-400 rounded-lg shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">🎉</span>
              <div>
                <h3 className="text-2xl font-bold text-green-900">Simulation Complete!</h3>
                <p className="text-green-700">
                  {completionMessage.reason === 'inventory' 
                    ? 'All inventory has been sold out' 
                    : `Maximum ticks reached`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="bg-white p-3 rounded border border-green-200">
                <div className="text-sm text-gray-600">Total Ticks</div>
                <div className="text-2xl font-bold text-gray-900">{completionMessage.tick}</div>
              </div>
              <div className="bg-white p-3 rounded border border-green-200">
                <div className="text-sm text-gray-600">Total Revenue</div>
                <div className="text-2xl font-bold text-green-600">${completionMessage.revenue.toFixed(2)}</div>
              </div>
              <div className="bg-white p-3 rounded border border-green-200">
                <div className="text-sm text-gray-600">Final Price</div>
                <div className="text-2xl font-bold text-blue-600">${completionMessage.price.toFixed(4)}</div>
              </div>
              <div className="bg-white p-3 rounded border border-green-200">
                <div className="text-sm text-gray-600">Remaining Inventory</div>
                <div className="text-2xl font-bold text-orange-600">{completionMessage.inventory} 🍎</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Click "Start" to run a new simulation
            </div>
          </div>
        )}

        {/* Market Stats */}
        {market && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="text-gray-500 text-sm font-medium mb-1">Current Price</div>
                <div className="text-3xl font-bold text-gray-900">
                  ${market.market.current_price.toFixed(4)}
                </div>
                <div className="text-xs text-gray-400 mt-1">USDC per apple</div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="text-gray-500 text-sm font-medium mb-1">Inventory</div>
                <div className="text-3xl font-bold text-gray-900">
                  {market.market.seller_inventory} 🍎
                </div>
                <div className="text-xs text-gray-400 mt-1">apples remaining</div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="text-gray-500 text-sm font-medium mb-1">Revenue</div>
                <div className="text-3xl font-bold text-green-600">
                  ${market.market.seller_revenue.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-1">USDC earned</div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="text-gray-500 text-sm font-medium mb-1">Tick</div>
                <div className="text-3xl font-bold text-purple-600">
                  #{market.market.tick}
                </div>
                <div className="text-xs text-gray-400 mt-1">simulation steps</div>
              </div>
            </div>

            {/* Agents */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">🤖 AI Agents</h2>
              <div className="grid grid-cols-3 gap-6">
                {market.agents.map((agent) => {
                  const lastAction = agent.history.actions.slice(-1)[0];
                  const colorClass = personalityColors[agent.personality];

                  return (
                    <div
                      key={agent.id}
                      className={`bg-white p-6 rounded-lg shadow-md border-2 ${colorClass}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">{agent.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${colorClass}`}>
                          {agent.personality.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">💰 Money:</span>
                          <span className="font-bold">${agent.money.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">🍎 Inventory:</span>
                          <span className="font-bold">{agent.inventory} apples</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">💸 Total Spent:</span>
                          <span className="font-bold">${agent.long_term.total_spent.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">📊 Avg Price:</span>
                          <span className="font-bold">
                            ${agent.long_term.avg_purchase_price > 0 
                              ? agent.long_term.avg_purchase_price.toFixed(4) 
                              : '0.0000'}
                          </span>
                        </div>
                      </div>

                      {lastAction && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-xs text-gray-500 mb-1">Last Action:</div>
                          <div className="font-semibold text-sm">
                            {lastAction.action === 'buy' 
                              ? `✅ Bought ${lastAction.qty} apples` 
                              : '⏸️ Waited'}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 italic">
                            "{lastAction.note}"
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Transactions */}
            {market.history && market.history.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">📜 Recent Activity (All {market.history.length} Ticks)</h2>
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    {[...market.history].reverse().map((tick) => (
                      <div key={tick.tick} className="border-b border-gray-100 p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-gray-900">Tick #{tick.tick}</div>
                          <div className="text-sm text-gray-600">
                            Price: ${tick.price_before.toFixed(4)} → ${tick.price_after.toFixed(4)}
                          </div>
                        </div>
                        {tick.executed_transactions.length > 0 ? (
                          <div className="space-y-1">
                            {tick.executed_transactions.map((tx) => (
                              <div key={tx.id} className="text-sm text-gray-700">
                                <div>
                                  <span className="font-semibold">{tx.agent_name}</span> bought{' '}
                                  <span className="font-bold">{tx.quantity} 🍎</span> for{' '}
                                  <span className="text-green-600 font-bold">${tx.total_cost.toFixed(4)}</span>
                                </div>
                                {tx.note && (
                                  <div className="text-xs text-gray-500 italic ml-4 mt-0.5">
                                    "{tx.note}"
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 italic">No purchases this tick</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!market && !isRunning && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">🍎</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Market Not Started</h2>
            <p className="text-gray-600 mb-6">
              Click "Start" to begin the simulation with 3 AI agents!
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <div>🟢 Frugal Fred - Conservative buyer</div>
              <div>🔴 Impulsive Ivan - Emotional buyer</div>
              <div>🔵 Skeptical Sarah - Data-driven buyer</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
    
    // Clear completion message and market data when starting
    if (action === 'start') {
      setCompletionMessage(null);
      setMarket(null); // Clear market to show initialization UI
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
          setIsLoading(false);
          return;
        }
        throw new Error(data.message || 'Failed to ' + action);
      }

      setIsRunning(action === 'start');
      
      // For start action, wait a bit for first tick to complete
      if (action === 'start') {
        setTimeout(() => {
          setIsLoading(false);
        }, 2000);
      } else {
        setIsLoading(false);
      }
      
    } catch (err) {
      setError(err.message);
      console.error('Control error:', err);
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
              🍎 Apple Trading Exchange
            </h1>
            <p className="text-gray-600">
              Live AI-powered trading simulation with real USDC settlements
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => handleControl('start')}
              disabled={isRunning || isLoading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {isLoading && !isRunning ? 'Starting...' : '▶️ Start Trading'}
            </button>
            <button
              onClick={() => handleControl('stop')}
              disabled={!isRunning || isLoading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              ⏸️ Stop Trading
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
                <h3 className="text-2xl font-bold text-green-900">Trading Session Complete!</h3>
                <p className="text-green-700">
                  {completionMessage.reason === 'inventory' 
                    ? 'Market inventory depleted - all apples traded' 
                    : `Maximum trading ticks reached`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="bg-white p-3 rounded border border-green-200">
                <div className="text-sm text-gray-600">Trading Ticks</div>
                <div className="text-2xl font-bold text-gray-900">{completionMessage.tick}</div>
              </div>
              <div className="bg-white p-3 rounded border border-green-200">
                <div className="text-sm text-gray-600">Total Volume</div>
                <div className="text-2xl font-bold text-green-600">${completionMessage.revenue.toFixed(2)}</div>
              </div>
              <div className="bg-white p-3 rounded border border-green-200">
                <div className="text-sm text-gray-600">Final Price</div>
                <div className="text-2xl font-bold text-blue-600">${completionMessage.price.toFixed(4)}</div>
              </div>
              <div className="bg-white p-3 rounded border border-green-200">
                <div className="text-sm text-gray-600">Market Depth</div>
                <div className="text-2xl font-bold text-orange-600">{completionMessage.inventory} 🍎</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Click "Start Trading" to begin a new session
            </div>
          </div>
        )}

        {/* Market Stats */}
        {market && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="text-gray-500 text-sm font-medium mb-1">Spot Price</div>
                <div className="text-3xl font-bold text-gray-900">
                  ${market.market.current_price.toFixed(4)}
                </div>
                <div className="text-xs text-gray-400 mt-1">USDC per 🍎</div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="text-gray-500 text-sm font-medium mb-1">Market Depth</div>
                <div className="text-3xl font-bold text-gray-900">
                  {market.market.seller_inventory} 🍎
                </div>
                <div className="text-xs text-gray-400 mt-1">available supply</div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="text-gray-500 text-sm font-medium mb-1">Volume Traded</div>
                <div className="text-3xl font-bold text-green-600">
                  ${market.market.seller_revenue.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-1">total USDC</div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="text-gray-500 text-sm font-medium mb-1">Trading Tick</div>
                <div className="text-3xl font-bold text-purple-600">
                  #{market.market.tick}
                </div>
                <div className="text-xs text-gray-400 mt-1">current round</div>
              </div>
            </div>

            {/* Price Chart */}
            {market.history && market.history.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-gray-900">📈 Price Chart</h2>
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={[
                        // Add tick 0 with initial price (before first transaction)
                        { tick: 0, price: market.history[0].price_before },
                        // Then add all ticks with their after-transaction prices
                        ...market.history.map(tick => ({
                          tick: tick.tick,
                          price: tick.price_after,
                        }))
                      ]}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="tick" 
                        label={{ value: 'Trading Round', position: 'insideBottom', offset: -5 }}
                        stroke="#6b7280"
                      />
                      <YAxis 
                        label={{ value: 'Price (USDC)', angle: -90, position: 'insideLeft' }}
                        stroke="#6b7280"
                        tickFormatter={(value) => `$${value.toFixed(4)}`}
                      />
                      <Tooltip 
                        formatter={(value) => [`$${value.toFixed(4)}`, 'Spot Price']}
                        labelFormatter={(label) => `Round ${label}`}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '8px 12px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 3 }}
                        activeDot={{ r: 5, fill: '#2563eb' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-center">
                    <div className="text-sm text-gray-600">
                      {market.history.length > 0 && (
                        <>
                          <span className="font-semibold">Change: </span>
                          <span className={`font-bold ${
                            market.history[market.history.length - 1].price_after > market.history[0].price_before
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {market.history[market.history.length - 1].price_after > market.history[0].price_before ? '↑' : '↓'}
                            {' '}
                            {(((market.history[market.history.length - 1].price_after - market.history[0].price_before) / market.history[0].price_before) * 100).toFixed(2)}%
                          </span>
                          <span className="text-gray-400 mx-2">|</span>
                          <span className="text-gray-600">
                            From ${market.history[0].price_before.toFixed(4)} to ${market.history[market.history.length - 1].price_after.toFixed(4)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Agents */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">📊 Active Traders</h2>
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
                          <span className="text-gray-600">💰 Balance:</span>
                          <span className="font-bold">${agent.money.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">🍎 Position:</span>
                          <span className="font-bold">{agent.inventory} 🍎</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">💸 Total Bought:</span>
                          <span className="font-bold text-red-600">${agent.long_term.total_spent.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">💵 Total Sold:</span>
                          <span className="font-bold text-green-600">${agent.long_term.total_revenue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">📈 Net P&L:</span>
                          <span className={`font-bold ${agent.long_term.realized_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {agent.long_term.realized_profit >= 0 ? '+' : ''}${agent.long_term.realized_profit.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">📊 Avg Entry:</span>
                          <span className="font-bold">
                            ${agent.long_term.avg_purchase_price > 0 
                              ? agent.long_term.avg_purchase_price.toFixed(4) 
                              : '0.0000'}
                          </span>
                        </div>
                      </div>

                      {lastAction && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-xs text-gray-500 mb-1">Last Trade:</div>
                          <div className="font-semibold text-sm">
                            {lastAction.action === 'buy' 
                              ? `✅ Bought ${lastAction.qty} 🍎` 
                              : lastAction.action === 'sell'
                              ? `💰 Sold ${lastAction.qty} 🍎`
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
                <h2 className="text-2xl font-bold mb-4 text-gray-900">📊 Trading History (All {market.history.length} Rounds)</h2>
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    {[...market.history].reverse().map((tick) => (
                      <div key={tick.tick} className="border-b border-gray-100 p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-gray-900">Round #{tick.tick}</div>
                          <div className="text-sm text-gray-600">
                            Spot: ${tick.price_before.toFixed(4)} → ${tick.price_after.toFixed(4)}
                          </div>
                        </div>
                        {tick.executed_transactions.length > 0 ? (
                          <div className="space-y-1">
                            {tick.executed_transactions.map((tx) => (
                              <div key={tx.id} className="text-sm text-gray-700">
                                <div>
                                  <span className="font-semibold">{tx.agent_name}</span>{' '}
                                  {tx.action === 'buy' ? (
                                    <>
                                      <span className="text-blue-600">BUY</span>{' '}
                                      <span className="font-bold">{tx.quantity} 🍎</span> @{' '}
                                      <span className="text-red-600 font-bold">${tx.total_cost.toFixed(4)}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-orange-600">SELL</span>{' '}
                                      <span className="font-bold">{tx.quantity} 🍎</span> @{' '}
                                      <span className="text-green-600 font-bold">${tx.total_cost.toFixed(4)}</span>
                                    </>
                                  )}
                                </div>
                                {tx.note && (
                                  <div className="text-xs text-gray-500 italic ml-4 mt-0.5">
                                    "{tx.note}"
                                  </div>
                                )}
                                {tx.transaction_hash && tx.transaction_hash !== 'N/A' && (
                                  <div className="text-xs text-gray-400 ml-4 mt-0.5 font-mono">
                                    🔗 TX: {tx.transaction_hash.substring(0, 16)}...
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 italic">No trades this round</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!market && isLoading && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4 animate-bounce">🍎</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Initializing Exchange...</h2>
            <p className="text-gray-600 mb-6">
              Setting up AI traders and connecting to blockchain...
            </p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <div className="mt-6 text-sm text-gray-500 space-y-2">
              <div>⚙️ Initializing market engine...</div>
              <div>🤖 Connecting AI agents to Locus MCP...</div>
              <div>💰 Fetching wallet balances...</div>
              <div>🔄 Preparing first trading round...</div>
            </div>
          </div>
        )}

        {!market && !isRunning && !isLoading && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">🍎</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Exchange Offline</h2>
            <p className="text-gray-600 mb-6">
              Click "Start Trading" to launch the exchange with 3 AI traders!
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <div>🟢 Frugal Fred - Conservative trader</div>
              <div>🔴 Impulsive Ivan - Aggressive trader</div>
              <div>🔵 Skeptical Sarah - Data-driven trader</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


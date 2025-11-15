import { NextResponse } from 'next/server';
import { MarketEngine } from '../../../simulation/market/MarketEngine.js';
import { FrugalBuyer, ImpulsiveBuyer, SkepticalBuyer } from '../../../simulation/agents/index.js';
import {
  marketEngine,
  agents,
  simulationInterval,
  setMarketEngine,
  setAgents,
  setSimulationInterval,
  clearSimulationInterval,
  isSimulationRunning,
  setSimulationRunning,
  isStarting,
  setStarting,
  broadcastEvent,
} from '../../../lib/globals.js';

/**
 * POST /api/control
 * Start or stop the simulation
 * Body: { action: 'start' | 'stop' }
 */
export async function POST(request) {
  const { action } = await request.json();

  if (action === 'start') {
    // CRITICAL: Comprehensive check - reject if ANYTHING indicates we're busy
    if (isStarting() || isSimulationRunning() || marketEngine || agents.length > 0 || simulationInterval) {
      const reason = isStarting() ? 'Start already in progress' :
                    isSimulationRunning() ? 'Simulation already running' :
                    'Simulation not properly cleaned up';
      
      console.log(`🚫 Rejecting start request: ${reason}`);
      
      return NextResponse.json({
        error: 'Cannot start',
        message: reason + '. Stop the current simulation first.',
      }, { status: 409 });
    }
    
    // Set lock immediately BEFORE any async operation
    setStarting(true);
    console.log('🔒 Start lock acquired');
    
    try {
      console.log('\n🚀 Starting market simulation...\n');

      // Create agent states
      const frugalState = {
        id: 'buyer_1',
        name: 'Frugal Fred',
        type: 'buyer',
        personality: 'frugal',
        money: 0, // Will be fetched from Locus
        inventory: 0,
        preferences: {
          good: 'apple',
          max_qty_per_tick: 3,
          threshold: 0.015,
        },
        history: {
          prices_seen: [],
          actions: [],
          last_tick_seen: 0,
        },
        long_term: {
          total_spent: 0,
          total_qty_bought: 0,
          avg_purchase_price: 0,
          max_single_tick_purchase: 0,
        },
        credentials: {
          clientId: process.env.FRUGAL_BUYER_CLIENT_ID,
          clientSecret: process.env.FRUGAL_BUYER_CLIENT_SECRET,
          apiKey: process.env.ANTHROPIC_API_KEY,
        },
      };

      const impulsiveState = {
        id: 'buyer_2',
        name: 'Impulsive Ivan',
        type: 'buyer',
        personality: 'impulsive',
        money: 0, // Will be fetched from Locus
        inventory: 0,
        preferences: {
          good: 'apple',
          max_qty_per_tick: 5,
        },
        history: {
          prices_seen: [],
          actions: [],
          last_tick_seen: 0,
        },
        long_term: {
          total_spent: 0,
          total_qty_bought: 0,
          avg_purchase_price: 0,
          max_single_tick_purchase: 0,
        },
        credentials: {
          clientId: process.env.IMPULSIVE_BUYER_CLIENT_ID,
          clientSecret: process.env.IMPULSIVE_BUYER_CLIENT_SECRET,
          apiKey: process.env.ANTHROPIC_API_KEY,
        },
      };

      const skepticalState = {
        id: 'buyer_3',
        name: 'Skeptical Sarah',
        type: 'buyer',
        personality: 'skeptical',
        money: 0, // Will be fetched from Locus
        inventory: 0,
        preferences: {
          good: 'apple',
          max_qty_per_tick: 4,
        },
        history: {
          prices_seen: [],
          actions: [],
          last_tick_seen: 0,
        },
        long_term: {
          total_spent: 0,
          total_qty_bought: 0,
          avg_purchase_price: 0,
          max_single_tick_purchase: 0,
        },
        credentials: {
          clientId: process.env.SKEPTICAL_BUYER_CLIENT_ID,
          clientSecret: process.env.SKEPTICAL_BUYER_CLIENT_SECRET,
          apiKey: process.env.ANTHROPIC_API_KEY,
        },
      };

      // Create agent instances
      const frugalAgent = new FrugalBuyer(frugalState);
      const impulsiveAgent = new ImpulsiveBuyer(impulsiveState);
      const skepticalAgent = new SkepticalBuyer(skepticalState);

      const allAgents = [frugalAgent, impulsiveAgent, skepticalAgent];

      // Initialize market engine
      const initialPrice = parseFloat(process.env.INITIAL_PRICE || '0.02');
      const initialInventory = parseInt(process.env.INITIAL_INVENTORY || '1000');
      
      const engine = new MarketEngine(
        initialPrice,
        initialInventory,
        [frugalState, impulsiveState, skepticalState]
      );

      setMarketEngine(engine);
      setAgents(allAgents);

      console.log('📊 Market Engine initialized');
      console.log(`   Price: $${initialPrice}`);
      console.log(`   Inventory: ${initialInventory} apples\n`);

      // Initialize all agents
      console.log('🤖 Initializing AI agents...');
      await Promise.all(allAgents.map(agent => agent.initialize()));
      console.log('✅ All agents initialized!\n');

      // Fetch real balances from Locus
      console.log('💰 Fetching actual balances from Locus wallets...');
      for (const agent of allAgents) {
        const state = agent.getState();
        try {
          const paymentContextTool = agent.locusTools.find(t => t.name === 'get_payment_context');
          if (paymentContextTool) {
            const contextResult = await paymentContextTool.invoke({});
            
            // Parse the text response from Locus
            // Format: "Remaining: $9.874 USDC out of $10 USDC"
            const remainingMatch = contextResult.match(/Remaining:\s*\$?([\d.]+)\s*USDC/i);
            
            if (remainingMatch && remainingMatch[1]) {
              const balance = parseFloat(remainingMatch[1]);
              state.money = balance;
              console.log(`   ✓ ${state.name}: $${balance.toFixed(4)} USDC`);
            } else {
              console.log(`   ⚠️  ${state.name}: Could not parse balance from response`);
              console.log(`   Raw response: ${contextResult.substring(0, 100)}...`);
              console.log(`   ⚠️  Using fallback $10.00`);
              state.money = 10.0;
            }
          } else {
            console.log(`   ⚠️  ${state.name}: get_payment_context tool not found, using fallback $10.00`);
            state.money = 10.0;
          }
        } catch (error) {
          console.error(`   ❌ ${state.name} balance fetch error:`, error.message);
          console.log(`   ⚠️  Using fallback balance of $10.00`);
          state.money = 10.0;
        }
      }
      console.log('✅ Balances loaded!\n');

      // Start simulation loop
      const tickMs = parseInt(process.env.SIMULATION_TICK_MS || '5000');
      console.log(`      ⏰ Starting tick loop (every ${tickMs}ms)...\n`);
      
      // Set running flag
      setSimulationRunning(true);

      // Use recursive setTimeout instead of setInterval to prevent overlap
      const scheduleNextTick = async () => {
        try {
          // CRITICAL: Check if simulation should still be running BEFORE doing anything
          // This prevents zombie intervals from continuing after stop
          if (!isSimulationRunning()) {
            console.log('⏹️  Simulation stopped, exiting tick callback...');
            return;
          }
          
          // CRITICAL: Check if THIS engine is still the CURRENT engine
          // This prevents zombie intervals from duplicate starts
          if (!marketEngine || marketEngine !== engine) {
            console.log('⏹️  Stale interval detected (engine mismatch), exiting...');
            return;
          }
          
          const marketState = marketEngine.getMarketState();
          
          console.log(`\n${'='.repeat(60)}`);
          console.log(`📈 TICK ${marketState.tick + 1} - Price: $${marketState.current_price.toFixed(4)}`);
          console.log(`${'='.repeat(60)}`);
          
          // Get decisions from all agents
          const decisions = {};
          const currentAgents = agents; // Get current agents from global
          
          if (currentAgents.length === 0) {
            console.log('⏹️  No agents available, exiting tick callback...');
            return;
          }
          
          for (const agent of currentAgents) {
            // Check running state before EACH agent decision
            if (!isSimulationRunning()) {
              console.log('⏹️  Simulation stopped during agent decisions, exiting...');
              return;
            }
            
            const decision = await agent.makeDecision(marketState);
            decisions[agent.getState().id] = decision;
          }
          
          // Final check before executing tick
          if (!isSimulationRunning() || !marketEngine) {
            console.log('⏹️  Simulation stopped before tick execution, exiting...');
            return;
          }

          // Execute tick using global engine
          const result = await marketEngine.executeTick(decisions);
          
          console.log(`\n💰 Results:`);
          console.log(`   Price: $${result.price_before.toFixed(4)} → $${result.price_after.toFixed(4)}`);
          console.log(`   Transactions: ${result.executed_transactions.length}`);
          console.log(`   Inventory: ${result.market_state.seller_inventory} apples`);
          console.log(`${'='.repeat(60)}\n`);

          // Broadcast to SSE clients
          broadcastEvent({
            type: 'tick',
            tick: result.tick,
            market: result.market_state,
            agents: marketEngine.getAgents(),
            transactions: result.executed_transactions,
          });

          // Check if simulation should stop
          const maxTicks = parseInt(process.env.MAX_TICKS || '0');
          const shouldStop = result.market_state.seller_inventory <= 0 || 
                            (maxTicks > 0 && result.tick >= maxTicks);
          
          if (shouldStop) {
            const reason = result.market_state.seller_inventory <= 0 
              ? 'All inventory sold out!' 
              : `Maximum ticks (${maxTicks}) reached!`;
            
            console.log(`\n🎉 SIMULATION COMPLETE - ${reason}`);
            console.log(`📊 Final Statistics:`);
            console.log(`   Total Ticks: ${result.tick}`);
            console.log(`   Total Revenue: $${result.market_state.seller_revenue.toFixed(2)}`);
            console.log(`   Final Price: $${result.market_state.current_price.toFixed(4)}`);
            console.log(`   Remaining Inventory: ${result.market_state.seller_inventory} apples`);
            console.log(`${'='.repeat(60)}\n`);
            
            // Stop simulation (recursive setTimeout will not schedule next tick)
            setSimulationRunning(false);
            clearSimulationInterval();
            setMarketEngine(null);
            setAgents([]);
            
            // Broadcast simulation ended event
            broadcastEvent({
              type: 'simulation_ended',
              reason: result.market_state.seller_inventory <= 0 ? 'inventory_depleted' : 'max_ticks_reached',
              final_tick: result.tick,
              final_revenue: result.market_state.seller_revenue,
              final_price: result.market_state.current_price,
              remaining_inventory: result.market_state.seller_inventory,
            });
          }

        } catch (error) {
          console.error('❌ Simulation tick error:', error);
        }
        
        // Schedule next tick AFTER this one completes (recursive setTimeout)
        // Only schedule if simulation is still running
        if (isSimulationRunning()) {
          const timeoutId = setTimeout(scheduleNextTick, tickMs);
          setSimulationInterval(timeoutId);
        }
      };

      // Start the first tick
      const initialTimeout = setTimeout(scheduleNextTick, tickMs);
      setSimulationInterval(initialTimeout);
      
      // Release lock - simulation is now running
      setStarting(false);

      return NextResponse.json({
        status: 'started',
        message: 'Simulation started successfully',
        market: engine.getMarketState(),
        agents: allAgents.map(a => ({
          id: a.getState().id,
          name: a.getState().name,
          personality: a.getState().personality,
        })),
      });

    } catch (error) {
      console.error('❌ Failed to start simulation:', error);
      
      // Release lock on error
      setStarting(false);
      
      // Cleanup on error
      clearSimulationInterval();
      setMarketEngine(null);
      setAgents([]);
      
      return NextResponse.json({
        error: 'Start failed',
        message: error.message,
      }, { status: 500 });
    }
  }

  if (action === 'stop') {
    console.log('\n🛑 Stopping simulation...\n');
    
    // Clear interval and reset all state
    clearSimulationInterval();
    setMarketEngine(null);
    setAgents([]);
    
    console.log('✅ Simulation stopped and state cleared\n');
    
    return NextResponse.json({
      status: 'stopped',
      message: 'Simulation stopped successfully',
    });
  }

  return NextResponse.json({
    error: 'Invalid action',
    message: 'Action must be "start" or "stop"',
  }, { status: 400 });
}


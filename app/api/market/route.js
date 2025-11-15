import { NextResponse } from 'next/server';
import { marketEngine } from '../../../lib/globals.js';

/**
 * GET /api/market
 * Returns complete market state, agents, and history
 */
export async function GET() {
  if (!marketEngine) {
    return NextResponse.json({
      error: 'Market not initialized',
      message: 'Start the simulation first',
    }, { status: 503 });
  }

  const marketState = marketEngine.getMarketState();
  const agents = marketEngine.getAgents();
  const history = marketEngine.getTickHistory();

  return NextResponse.json({
    market: marketState,
    agents,
    history, // All ticks
    isRunning: true,
  });
}


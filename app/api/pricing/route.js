import { NextResponse } from 'next/server';
import { marketEngine } from '../../../lib/globals.js';

/**
 * GET /api/pricing
 * Returns current market price for apples
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId') || 'apple';
  
  // Get current price from market engine
  const currentPrice = marketEngine?.getMarketState().current_price || parseFloat(process.env.INITIAL_PRICE || '0.02');
  
  return NextResponse.json({
    price: currentPrice,
    pricePerUnit: currentPrice,
    currency: 'USDC',
    productId,
    productName: 'Fresh Apple',
    description: 'Delicious market apples',
  });
}


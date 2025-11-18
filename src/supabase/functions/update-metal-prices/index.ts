
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

const GOLD_API_KEY = Deno.env.get('GOLD_API_KEY');
const API_URL = `https://www.goldapi.io/api/XAU,XAG/USD`;

Deno.serve(async (_req) => {
  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GOLD_API_KEY) {
      throw new Error("Gold API key is not set in environment variables.");
    }
    
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch prices from Gold API
    const response = await fetch(API_URL, {
      headers: {
        'x-access-token': GOLD_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to parse API error response." }));
        let errorMessage = `Gold API request failed with status ${response.status}.`;
        if (errorData && errorData.error) {
           errorMessage = errorData.error;
           if (errorMessage.includes("monthly quota")) {
             throw new Error("Monthly API quota exceeded. Please upgrade your Gold API plan.");
           }
        }
        throw new Error(errorMessage);
    }
    
    const prices = await response.json();
    
    const goldPrice = prices.price_gram_24k_usd * 31.1035; // Convert from gram to troy ounce
    const silverPrice = prices.xag_price_gram_24k_usd * 31.1035; // Convert from gram to troy ounce

    if (!goldPrice || !silverPrice) {
      throw new Error("Invalid price data received from Gold API.");
    }

    // Upsert prices into the database
    const { error: dbError } = await supabaseAdmin.from('metal_prices').upsert([
      { metal_symbol: 'gold', price: goldPrice, last_updated: new Date().toISOString() },
      { metal_symbol: 'silver', price: silverPrice, last_updated: new Date().toISOString() }
    ], { onConflict: 'metal_symbol' });

    if (dbError) {
      throw new Error(`Database update failed: ${dbError.message}`);
    }

    return new Response(JSON.stringify({ message: "Metal prices updated successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in update-metal-prices function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

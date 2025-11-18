
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Stripe } from 'https://esm.sh/stripe@14.24.0';
import { corsHeaders } from '../cors.ts';

// --- Initialize Clients & Config ---
let stripe, supabaseAdmin;
let initError = null;

try {
  console.log("[Fn Start] 'create-checkout-session' initializing...");

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    throw new Error("CRITICAL: 'STRIPE_SECRET_KEY' is not set in environment variables.");
  }
  console.log("[Init] STRIPE_SECRET_KEY loaded successfully.");

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("CRITICAL: Supabase URL or Service Role Key is not set.");
  }
  
  stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  console.log("[Init] Stripe and Supabase clients initialized successfully.");

} catch (error) {
  console.error('[Init Error] Critical failure during initialization:', error.message);
  initError = error;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  }

  try {
    if (initError) {
      throw new Error(`Function cannot run due to initialization failure: ${initError.message}`);
    }

    const body = await req.json();
    // 1. Log all input parameters received
    console.log('[API Input] Received parameters:', JSON.stringify(body, null, 2));
    const { userId, userEmail, targetWeight, targetUnit, metal, investmentAmount } = body;
    
    // --- Validation ---
    if (!userId || !userEmail || !targetWeight || !targetUnit || !metal || !investmentAmount) {
      throw new Error("Validation Error: Missing required parameters in the request body.");
    }
    const parsedInvestmentAmount = parseInt(investmentAmount, 10);
    if (isNaN(parsedInvestmentAmount) || parsedInvestmentAmount < 1) {
      throw new Error(`Validation Error: Invalid investment amount: '${investmentAmount}'. Must be a whole number >= 1.`);
    }

    // --- Customer Management ---
    let customerId;
    const { data: userRoleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (roleError && roleError.code !== 'PGRST116') {
        throw new Error(`Database Error fetching user role: ${roleError.message}`);
    }

    if (userRoleData?.stripe_customer_id) {
      customerId = userRoleData.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({ email: userEmail, metadata: { supabase_user_id: userId } });
      customerId = customer.id;
      
      const { error: upsertError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: userId, stripe_customer_id: customerId, role: 'user' }, { onConflict: 'user_id', ignoreDuplicates: false });
      if(upsertError) {
        // Log as a warning instead of throwing, as the checkout can proceed.
        console.warn(`Database Warning: Could not persist Stripe Customer ID for user ${userId}: ${upsertError.message}`);
      }
    }

    // --- Subscription Record ---
    const { data: subscriptionData, error: dbError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        metal: metal,
        plan_name: `${metal.charAt(0).toUpperCase() + metal.slice(1)} Plan`,
        target_weight: targetWeight,
        target_unit: targetUnit,
        monthly_investment: parsedInvestmentAmount,
        quantity: 1,
        accumulated_value: 0,
        accumulated_weight: 0,
        status: 'pending_payment',
        stripe_customer_id: customerId,
        target_price: 0,
      })
      .select('id')
      .single();

    if (dbError) {
      throw new Error(`Database connection issue: ${dbError.message}`);
    }
    const pendingSubscriptionId = subscriptionData.id;

    // --- Stripe Session Creation ---
    const returnUrl = `${Deno.env.get('SITE_URL')}/return?session_id={CHECKOUT_SESSION_ID}`;
    const sessionPayload = {
      ui_mode: 'embedded',
      customer: customerId,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${metal.charAt(0).toUpperCase() + metal.slice(1)} Plan Subscription`,
            description: `A dynamic monthly investment of $${parsedInvestmentAmount}.`,
          },
          unit_amount: parsedInvestmentAmount * 100, // Convert dollars to cents
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      return_url: returnUrl,
      automatic_payment_methods: { enabled: true },
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          pending_subscription_id: pendingSubscriptionId,
        },
      },
    };
    
    // 2. Log the complete sessionPayload before sending to Stripe
    console.log("[Stripe Call] Creating Checkout Session with payload:", JSON.stringify(sessionPayload, null, 2));
    const session = await stripe.checkout.sessions.create(sessionPayload);
    
    // 3. Log the full session object returned from Stripe
    console.log('[Stripe Response] Full session object received:', JSON.stringify(session, null, 2));

    // --- Response ---
    if (!session.client_secret) {
        throw new Error("Stripe session created successfully, but client_secret was missing from the response.");
    }
    
    const clientResponse = { clientSecret: session.client_secret };
    
    // 4. Log the exact response being returned to the client
    console.log('[API Response] Sending to client:', JSON.stringify(clientResponse, null, 2));

    return new Response(JSON.stringify(clientResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      status: 200,
    });

  } catch (error) {
    // 5. Enhanced error logging
    console.error('[Edge Function Fatal Error] An error occurred:', error);
    
    const errorPayload = { 
      error: { 
        message: error.message,
        type: error.type, // Include Stripe error type if available
        stack: error.stack?.split('\n'), // Provide stack trace for easier debugging
      } 
    };
    console.error('[API Error Response] Sending to client:', JSON.stringify(errorPayload, null, 2));
    
    return new Response(JSON.stringify(errorPayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      status: 500,
    });
  }
});

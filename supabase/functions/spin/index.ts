import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://iamajeeth.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

const prizes = [
  { title: 'Hair Clip + 5% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'CLIP5', weight: 500 },
  { title: 'Keychain + 5% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'KEY5', weight: 200 },
  { title: 'Hairband + 5% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'BAND5', weight: 100 },
  { title: 'Kerchief + 5% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'KERCHIEF5', weight: 100 },
  { title: 'Pet Jar + 5% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'JAR5', weight: 100 },
  { title: 'Towel + 10% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'TOWEL10', weight: 10 },
  { title: 'Towel + 20% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'TOWEL20', weight: 5 },
  { title: 'Towel + 50% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'TOWEL50', weight: 1 }
] as const;

const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);

function corsHeaders(origin: string | null) {
  const acceptedOrigin = origin && allowedOrigins.has(origin)
    ? origin
    : 'https://iamajeeth.github.io';

  return {
    'Access-Control-Allow-Origin': acceptedOrigin,
    'Access-Control-Allow-Headers': 'apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function json(origin: string | null, status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function selectPrizeIndex() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  let roll = values[0] % totalWeight;

  for (let index = 0; index < prizes.length; index += 1) {
    roll -= prizes[index].weight;
    if (roll < 0) return index;
  }

  return 0;
}

Deno.serve(async request => {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== 'POST') {
    return json(origin, 405, { error: 'Method not allowed.' });
  }

  if (origin && !allowedOrigins.has(origin)) {
    return json(origin, 403, { error: 'This contest request is not allowed.' });
  }

  let payload: { mobile?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json(origin, 400, { error: 'Invalid request.' });
  }

  const digits = String(payload.mobile ?? '').replace(/\D/g, '');
  const mobile = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits;

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return json(origin, 400, { error: 'Enter a valid 10-digit Indian mobile number.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json(origin, 500, { error: 'Contest service is not configured.' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const prizeIndex = selectPrizeIndex();
  const prize = prizes[prizeIndex];
  const { error } = await supabase.from('spins').insert({
    mobile,
    prize_index: prizeIndex,
    prize_title: prize.title,
    prize_code: prize.code
  });

  if (error?.code === '23505') {
    return json(origin, 409, { error: 'This mobile number has already used its spin.' });
  }

  if (error) {
    console.error('Unable to save contest result:', error.code);
    return json(origin, 500, { error: 'Unable to save your result. Please try again.' });
  }

  return json(origin, 200, {
    prizeIndex,
    prize: { title: prize.title, detail: prize.detail, code: prize.code }
  });
});

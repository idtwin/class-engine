import { NextResponse } from 'next/server';

// Diagnostic endpoint — checks which env vars are present WITHOUT exposing values.
// Visit /api/debug/env-check to verify Vercel environment configuration.
export async function GET() {
  const checks = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  const missing = Object.entries(checks)
    .filter(([, present]) => !present)
    .map(([key]) => key);

  return NextResponse.json({
    status: missing.length === 0 ? 'ALL_OK' : 'MISSING_VARS',
    checks,
    missing,
  });
}

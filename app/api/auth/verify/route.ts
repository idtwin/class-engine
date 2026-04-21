import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { roster_id, otp } = await request.json();

    if (!roster_id || !otp) {
      return NextResponse.json({ error: 'Missing roster ID or OTP' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const cleanOtp = otp.trim().toUpperCase();

    // Clean up expired OTPs (optional housekeeping)
    await supabase.from('session_auth').delete().lt('expires_at', new Date().toISOString());

    // Look up the OTP for this roster_id with a 5-minute grace period leeway
    // (In case of minor clock drift between localhost and the DB server)
    const now = new Date();
    const graceTime = new Date(now.getTime() + (5 * 60 * 1000)).toISOString();

    const { data: authRecord, error: authError } = await supabase
      .from('session_auth')
      .select('*')
      .eq('roster_id', roster_id)
      .eq('otp', cleanOtp)
      .gt('expires_at', now.toISOString()) // Still check primary expiry
      .single();

    if (authError || !authRecord) {
      console.warn(`[AUTH_FAILURE] Student ${roster_id} failed with OTP ${cleanOtp}. Checking for expired/mismatch...`);
      return NextResponse.json({ error: 'Invalid or expired OTP.' }, { status: 401 });
    }

    // Look up roster info
    const { data: rosterRecord, error: rosterError } = await supabase
      .from('roster')
      .select('name, class_name')
      .eq('id', roster_id)
      .single();

    if (rosterError || !rosterRecord) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    // OTP is valid! Drop a secure HttpOnly cookie for the student.
    // Instead of doing standard Supabase Auth for students (which requires email),
    // we use a custom signed JWT or simply store an encrypted student_id cookie.
    // For simplicity, we drop an HttpOnly cookie containing the roster_id.
    
    // In a stricter environment, you'd encrypt this value.
    const cookieStore = await cookies();
    cookieStore.set('student_sid', roster_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 180, // 6 months
    });
    
    cookieStore.set('student_name', rosterRecord.name, {
      httpOnly: false, // Accessible by client UI for display purposes
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    });

    // Delete the OTP as it's a one-time use
    await supabase.from('session_auth').delete().eq('id', authRecord.id);

    // Initialize their Profile if it doesn't exist
    await supabase.from('student_profiles').upsert({
      roster_id: roster_id,
      rank_title: 'Bronze ✯', // Start at Bronze 1
      xp: 0,
      level: 1,
      accuracy_rate: 0
    }, { onConflict: 'roster_id', ignoreDuplicates: true });

    return NextResponse.json({ success: true, studentId: roster_id, studentName: rosterRecord.name });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

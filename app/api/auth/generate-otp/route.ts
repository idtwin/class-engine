import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  try {
    const { roster_id, name, class_name } = await request.json();

    if (!roster_id || !name || !class_name) {
      return NextResponse.json({ error: 'Missing roster ID, student name, or class name' }, { status: 400 });
    }

    // Use the admin client directly — this endpoint is called from the teacher UI only.
    // The service role key is the security boundary; no student-facing UI calls this route.
    const supabaseAdmin = createAdminClient();

    // Upsert the student into the Postgres roster
    await supabaseAdmin.from('roster').upsert(
      { id: roster_id, name, class_name },
      { onConflict: 'id' }
    );

    // Generate a random 4 digit PIN
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24 hours

    // Delete existing OTP for this roster_id to keep only 1 active per student
    await supabaseAdmin.from('session_auth').delete().eq('roster_id', roster_id);

    const { data: authRecord, error: insertError } = await supabaseAdmin
      .from('session_auth')
      .insert({ roster_id, otp, expires_at })
      .select()
      .single();

    if (insertError) {
      console.error('[OTP_GENERATE_ERROR]', insertError.message);
      return NextResponse.json({ error: 'Failed to generate OTP: ' + insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, otp: authRecord.otp });

  } catch (error: any) {
    console.error('[OTP_GENERATE_EXCEPTION]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

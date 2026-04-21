import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { roster_id, name, class_name } = await request.json();

    if (!roster_id || !name || !class_name) {
      return NextResponse.json({ error: 'Missing roster ID, student name, or class name' }, { status: 400 });
    }

    // 1. Verify Teacher is logged in (Authentication check)
    const cookieStore = await cookies();
    const supabaseUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Teacher login required.' }, { status: 401 });
    }

    // 2. Upsert the student into the Postgres roster using admin client
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin.from('roster').upsert(
      { id: roster_id, name, class_name },
      { onConflict: 'id' }
    );

    // 3. Generate a random 4 digit PIN
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // Valid for 24 hours

    // 3. Upsert into session_auth using admin client (to bypass RLS for inserting)

    // delete existing OTP for this roster_id if any to keep 1 active
    await supabaseAdmin.from('session_auth').delete().eq('roster_id', roster_id);

    const { data: authRecord, error: insertError } = await supabaseAdmin
      .from('session_auth')
      .insert({
        roster_id,
        otp,
        expires_at
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to generate OTP: ' + insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, otp: authRecord.otp });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

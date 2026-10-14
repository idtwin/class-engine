import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterActive = searchParams.get('active') === 'true';
    
    const supabase = createAdminClient();
    
    let query = supabase
      .from('roster')
      .select('id, name, class_name');

    // If requested, only show students who have an active PIN waiting
    if (filterActive) {
      // We join with session_auth. 
      // Note: we fetch the roster where a record exists in session_auth with a valid expiry.
      const now = new Date().toISOString();
      const { data: activeIds, error: authError } = await supabase
        .from('session_auth')
        .select('roster_id')
        .gt('expires_at', now);

      if (authError) throw authError;
      
      const ids = activeIds.map(a => a.roster_id);
      if (ids.length === 0) {
        return NextResponse.json({ roster: [] });
      }
      query = query.in('id', ids);
    }

    const { data: roster, error } = await query
      .order('class_name', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ roster });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/xp/leaderboard
 * Returns the top students based on total XP.
 * 
 * Query Params:
 * - class_name (optional): Filter leaderboard to a specific class.
 * - limit (optional): Number of results (default 10).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const className = searchParams.get('class_name');
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = createAdminClient();

    let query = supabase
      .from('student_xp_totals')
      .select('*')
      .order('total_xp', { ascending: false })
      .limit(limit);

    if (className) {
      query = query.eq('class_name', className);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      leaderboard: data || []
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

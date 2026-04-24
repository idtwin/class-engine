import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/xp/totals?class_name=XI-1
 * Returns aggregated XP totals for all students in a class.
 *
 * Returns: { totals: { [student_id]: number } }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const className = searchParams.get('class_name');

    if (!className) {
      return NextResponse.json(
        { error: 'Missing required query parameter: class_name' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('student_xp_totals')
      .select('student_id, total_xp')
      .eq('class_name', className);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Convert to { [student_id]: total_xp } map
    const totals: Record<string, number> = {};
    for (const row of data || []) {
      totals[row.student_id] = row.total_xp;
    }

    return NextResponse.json({ totals });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

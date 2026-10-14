import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getRankForXp } from '@/utils/ranks';

/**
 * POST /api/xp/award
 * Awards XP to a student and returns the new total + rank info.
 *
 * Body: { student_id, class_name, event_type, xp_amount, game_type? }
 * Returns: { success, new_total_xp, rank_info, rank_changed }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { student_id, class_name, event_type, xp_amount, game_type } = body;

    if (!student_id || !class_name || !event_type || typeof xp_amount !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: student_id, class_name, event_type, xp_amount' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Insert XP event
    const { error: insertError } = await supabase
      .from('xp_events')
      .insert({
        student_id,
        class_name,
        event_type,
        xp_amount,
        game_type: game_type || null,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Fetch updated total XP for this student
    const { data: totalData, error: totalError } = await supabase
      .from('student_xp_totals')
      .select('total_xp')
      .eq('student_id', student_id)
      .maybeSingle();

    if (totalError) {
      return NextResponse.json({ error: totalError.message }, { status: 500 });
    }

    const newTotalXp = totalData?.total_xp ?? xp_amount;
    const newRank = getRankForXp(newTotalXp);

    return NextResponse.json({
      success: true,
      new_total_xp: newTotalXp,
      rank_info: newRank,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

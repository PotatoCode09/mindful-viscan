'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export async function syncCounselorRole() {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Not authenticated' };

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata as any)?.role;

    if (role !== 'counselor') {
      return { success: false, error: 'Not a counselor in Clerk' };
    }

    // Direct Supabase Update (Bypass RLS using Service Role)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Counselor',
        role: 'counselor',
      }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase Sync Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Sync Action Error:', error);
    return { success: false, error: error.message };
  }
}

export async function submitApplication(formData: FormData) {
  try {
    // Authenticate the user
    const { userId } = await auth();

    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Extract form data
    const legalName = formData.get('legalName') as string;
    const experience = formData.get('experience') as string;

    // Split name for Clerk profile
    const nameParts = legalName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // Update user metadata and profile using clerkClient
    const client = await clerkClient();

    // 1. Update Profile (Triggers webhook to sync name to Supabase)
    await client.users.updateUser(userId, {
      firstName,
      lastName,
    });

    // 2. Update Metadata
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: 'applicant', // Demote to applicant until approved
        counselor_status: 'pending',
      },
      unsafeMetadata: {
        legalName,
        experience,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error submitting application:', error);
    throw error;
  }
}

export async function ensureApplicantMetadata() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const currentRole = (user.publicMetadata as any)?.role as string | undefined;
  const currentStatus = (user.publicMetadata as any)?.counselor_status as string | undefined;

  if (currentRole === 'applicant' || currentRole === 'counselor' || currentStatus === 'pending') {
    return { updated: false };
  }

  try {
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: 'applicant',
        counselor_status: 'pending',
      },
    });
    return { updated: true };
  } catch (error) {
    console.error("Error updating metadata:", error);
    throw error;
  }
}

export async function saveMoodLogAction(rating: number, summary: string, note: string, logId?: string) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get or create user record to ensure integrity (Self-Healing)
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!userData) {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';

      await supabase.from('users').insert({
        id: userId,
        full_name: fullName,
        role: 'student'
      });
    }

    let error;

    if (logId) {
      // Update existing
      const { error: updateError } = await supabase
        .from('mood_logs')
        .update({ rating, summary, note })
        .eq('id', logId);
      error = updateError;
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('mood_logs')
        .insert({
          user_id: userId,
          rating,
          summary,
          note
        });
      error = insertError;
    }

    if (error) {
      console.error('Error in saveMoodLogAction DB query:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('saveMoodLogAction Exception:', error);
    return { success: false, error: error.message };
  }
}

export async function requestCounselingSessionAction(title: string, type: string) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get or create user record to ensure integrity (Self-Healing)
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!userData) {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';

      await supabase.from('users').insert({
        id: userId,
        full_name: fullName,
        role: 'student'
      });
    }

    const { error: insertError } = await supabase
      .from('counseling_sessions')
      .insert({
        student_id: userId,
        title: title.trim(),
        type: type,
        status: 'Pending'
      });

    if (insertError) {
      console.error('Error in requestCounselingSessionAction DB query:', insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('requestCounselingSessionAction Exception:', error);
    return { success: false, error: error.message };
  }
}

export async function getMoodLogsAction() {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'User not authenticated', data: [] };
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching mood logs in getMoodLogsAction:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getMoodLogsAction Exception:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getStudentSessionsAction() {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'User not authenticated', data: [] };
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch counseling sessions for this student
    const { data: sessionData, error: sessionError } = await supabase
      .from('counseling_sessions')
      .select('*')
      .eq('student_id', userId)
      .order('scheduled_at', { ascending: false });

    if (sessionError) {
      console.error('Error fetching student sessions:', sessionError);
      return { success: false, error: sessionError.message, data: [] };
    }

    if (!sessionData || sessionData.length === 0) {
      return { success: true, data: [] };
    }

    // Fetch counselor details securely if counselor_id exists
    const counselorIds = [...new Set(sessionData.map(s => s.counselor_id).filter(Boolean))];
    let counselorMap = new Map();

    if (counselorIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', counselorIds);

      counselorMap = new Map(usersData?.map(u => [u.id, u]));
    }

    const joinedSessions = sessionData.map(s => ({
      ...s,
      counselor: s.counselor_id ? counselorMap.get(s.counselor_id) || null : null
    }));

    return { success: true, data: joinedSessions };
  } catch (error: any) {
    console.error('getStudentSessionsAction Exception:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getTodayStatusAction() {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'User not authenticated', mood: null, thoughts: '' };
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Fetch today's mood
    const { data: moodData } = await supabase
      .from('mood_logs')
      .select('rating')
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString())
      .maybeSingle();

    // 2. Fetch today's thoughts
    const { data: thoughtData } = await supabase
      .from('thoughts')
      .select('content')
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString())
      .maybeSingle();

    return {
      success: true,
      mood: moodData ? moodData.rating : null,
      thoughts: thoughtData ? thoughtData.content : ''
    };
  } catch (error: any) {
    console.error('getTodayStatusAction Exception:', error);
    return { success: false, error: error.message, mood: null, thoughts: '' };
  }
}

export async function saveThoughtsAction(content: string) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('thoughts')
      .insert({
        user_id: userId,
        content: content.trim()
      });

    if (error) {
      console.error('Error saving thoughts:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('saveThoughtsAction Exception:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteSessionsAction(sessionIds: string[]) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('counseling_sessions')
      .delete()
      .in('id', sessionIds)
      .eq('student_id', userId); // Secure constraint

    if (error) {
      console.error('Error deleting sessions in deleteSessionsAction:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('deleteSessionsAction Exception:', error);
    return { success: false, error: error.message };
  }
}





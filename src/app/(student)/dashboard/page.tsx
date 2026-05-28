'use client';

import { useUser, useSession } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import CalendarWidget from '@/app/components/dashboard/CalendarWidget';
import MoodTracker from '@/app/components/dashboard/MoodTracker';
import SessionHistory from '@/app/components/dashboard/SessionHistory';
import { createAuthenticatedClient } from '@/lib/supabaseClient';







// This interface is likely used in children, but since we are extracting children, we just need the default export
export default function StudentDashboard() {
  const { user, isLoaded } = useUser();
  const { session } = useSession();

  // Record Daily Login
  useEffect(() => {
    const recordLogin = async () => {
      if (!user || !session) return;
      try {
        const token = await session.getToken({ template: 'supabase' });
        const supabase = createAuthenticatedClient(token || '');

        // 1. Ensure user exists in Supabase (Self-Healing)
        // This prevents FK violation if webhook hasn't fired yet
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!existingUser) {
          const { error: userError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              full_name: user.fullName || user.firstName || 'User',
              role: 'student'
            });

          if (userError) {
            console.error("Failed to ensure user exists for login tracking:", JSON.stringify(userError, null, 2));
          }
        }

        // 2. Attempt to insert login record for today
        const { error: loginError } = await supabase
          .from('daily_logins')
          .insert({
            user_id: user.id
          });

        if (loginError) {
          // Ignore unique constraint violations (already logged in today)
          if (loginError.code !== '23505') {
            console.error("Error recording daily login:", JSON.stringify(loginError, null, 2));
          }
        }

      } catch (error) {
        // Ignore errors (especially unique constraint violations)
        // console.log("Login already recorded or error:", error);
      }
    };

    recordLogin();
  }, [user, session]);

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen flex-col p-0 bg-[linear-gradient(110deg,var(--color-mindful-green)_0%,var(--color-mindful-dark)_100%)]">
        <div className="flex flex-grow items-center justify-center p-6 pt-24">
          <div className="text-gray-200">Loading...</div>
        </div>
      </main>
    );
  }

  // Get user's name from Clerk
  const userName = user?.firstName || user?.fullName || 'User';



  return (
    <main className="flex min-h-screen flex-col p-0 bg-[linear-gradient(110deg,var(--color-mindful-green)_0%,var(--color-mindful-dark)_100%)]">
      <div className="flex flex-grow p-4 md:p-8 pt-24">
        {/* Main card with padding to show gradient background around it */}
        <div className="w-full mx-auto">
          <div className="rounded-2xl bg-[#031207] p-6 md:p-8 lg:p-10 border border-gray-900/50 shadow-[4px_4px_0px_0px_rgba(34,197,94,0.15)] min-h-[calc(100vh-10rem)] flex flex-col">
            {/* Two-column grid layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[68%_32%] gap-6 flex-1">
              {/* Left Column - Wider */}
              <div className="flex flex-col flex-1">
                {/* Welcome Header */}
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-kodchasan font-bold mb-6 bg-gradient-to-r from-[#42734D] via-[#5A9F5F] to-[#6A9F6F] bg-clip-text text-transparent">
                  Welcome! How are you today, {userName}?
                </h1>

                {/* Session History Section - Card with green border */}
                <SessionHistory />
              </div>

              {/* Right Column - Narrower */}
              <div className="flex flex-col gap-6">
                {/* Upcoming Events Calendar */}
                <CalendarWidget />

                {/* Mood & Thoughts Section */}
                <MoodTracker />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


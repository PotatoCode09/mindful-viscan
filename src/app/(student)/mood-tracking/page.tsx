'use client';

import { useState, useEffect, useCallback } from 'react';
import { SignedIn, SignedOut, RedirectToSignIn, useUser, useSession } from '@clerk/nextjs';
import MoodHeatmap from '@/app/components/mood/MoodHeatmap';
import MoodEntry from '@/app/components/mood/MoodEntry';
import MoodStats from '@/app/components/mood/MoodStats';
import { getMoodLogsAction } from '@/app/actions';

interface MoodLog {
    id: string;
    created_at: string;
    rating: number; // 1-5
    note?: string;
    summary?: string;
}

export default function MoodTrackingPage() {
    const { user, isLoaded } = useUser();
    const { session } = useSession();
    const [logs, setLogs] = useState<MoodLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = useCallback(async () => {
        if (!user || !session) return;
        try {
            const res = await getMoodLogsAction();

            if (!res.success) {
                console.error("Error fetching mood logs:", res.error);
            } else {
                setLogs(res.data as MoodLog[] || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user, session]);

    useEffect(() => {
        if (isLoaded && user) {
            fetchLogs();
        }
    }, [isLoaded, user, fetchLogs]);

    // Check for today's log to disable duplicate entries
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find log created after today 00:00
    const todayLog = logs.find(log => new Date(log.created_at) >= today);

    return (
        <main className="flex min-h-screen flex-col p-0 bg-[linear-gradient(110deg,var(--color-mindful-green)_0%,var(--color-mindful-dark)_100%)]">

            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>

            <SignedIn>
                <div className="flex flex-grow p-8 md:p-12 pt-24">
                    <div className="w-full mx-auto">
                        <div className="rounded-2xl bg-[#031207] p-6 md:p-10 lg:p-12 border border-gray-900/50 shadow-[4px_4px_0px_0px_rgba(34,197,94,0.15)] min-h-[calc(100vh-14rem)] flex flex-col space-y-8">

                            {/* Header */}
                            <div>
                                <h1 className="text-3xl font-kodchasan font-bold text-white mb-2">Mood Tracking</h1>
                                <p className="text-gray-400">Track your daily mood and build your streak.</p>
                            </div>

                            {/* Components */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column (2/3) - Heatmap & Entry Form */}
                                <div className="lg:col-span-2 space-y-8">
                                    {/* 1. Heatmap */}
                                    <div className="w-full bg-[#031207] border border-gray-900/50 rounded-2xl p-6 min-h-[200px]">
                                        <h2 className="text-xl font-kodchasan font-semibold text-white mb-6 pl-2 border-l-4 border-mindful-green">
                                            Your Year in Pixels
                                        </h2>
                                        {loading && logs.length === 0 ? (
                                            <div className="flex justify-center items-center h-[140px] text-gray-500 animate-pulse">
                                                Loading history...
                                            </div>
                                        ) : (
                                            <MoodHeatmap logs={logs} />
                                        )}
                                    </div>

                                    {/* 2. Mood Entry Form */}
                                    <MoodEntry onEntryAdded={fetchLogs} currentLog={todayLog || null} />
                                </div>

                                {/* Right Column (1/3) - Mood Stats */}
                                <div className="lg:col-span-1">
                                    <MoodStats logs={logs} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </SignedIn>
        </main>
    );
}

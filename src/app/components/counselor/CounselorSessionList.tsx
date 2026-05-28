'use client';

import { useState, useEffect } from 'react';
import { useSession, useUser } from '@clerk/nextjs';
import { getCounselorSessionsAction, updateSessionStatusAction } from '@/app/actions';
import { createAuthenticatedClient } from '@/lib/supabaseClient';

interface Student {
    id: string;
    full_name?: string;
    email?: string;
}

interface Session {
    id: string;
    student_id: string;
    status: string;
    title: string;
    type: string;
    scheduled_at: string | null;
    created_at: string;
    counselor_id?: string;
    student?: Student;
}

export default function CounselorSessionList() {
    const { user } = useUser();
    const { session } = useSession();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<'requests' | 'my-sessions'>('requests');

    const fetchSessions = async () => {
        if (!session || !user) return;

        try {
            setLoading(true);
            const res = await getCounselorSessionsAction();

            if (!res.success) {
                console.error('Error fetching sessions:', res.error);
                setSessions([]);
                return;
            }

            setSessions(res.data as Session[] || []);
        } catch (error) {
            console.error('Unexpected error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (sessionId: string, action: 'Accept' | 'Decline' | 'Complete') => {
        if (!session || !user) return;
        setActionLoading(sessionId);

        try {
            const res = await updateSessionStatusAction(sessionId, action);

            if (!res.success) {
                console.error(`Error performing ${action}:`, res.error);
                alert(`Failed to ${action.toLowerCase()} session.`);
            } else {
                fetchSessions();
            }
        } catch (error) {
            console.error('Action error:', error);
        } finally {
            setActionLoading(null);
        }
    };

    useEffect(() => {
        let channel: any;

        const setupRealtime = async () => {
            if (!session) return;
            fetchSessions(); // Initial fetch

            const token = await session.getToken({ template: 'supabase' });
            const supabase = createAuthenticatedClient(token || '');

            channel = supabase
                .channel('counselor-sessions-changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*', // Listen to ALL events (INSERT, UPDATE, DELETE)
                        schema: 'public',
                        table: 'counseling_sessions',
                    },
                    (payload) => {
                        console.log('Realtime change detected:', payload);
                        fetchSessions(); // Re-fetch to get full joined data (student details)
                        // Note: For pure optimization we could manually merge, but re-fetching ensures clean join with Users table.
                    }
                )
                .subscribe();
        };

        setupRealtime();

        return () => {
            if (channel) {
                // accessing supabase instance to remove channel would require storing client in ref or state, 
                // but just unmounting active listener is usually sufficient or requires storing the client.
                // ideally we utilize a `supabase` instance if available in scope or cleanup properly.
                // simplistic cleanup:
                channel.unsubscribe();
            }
        };
    }, [session]);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'active': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    // Filter Logic
    const availableRequests = sessions.filter(s => s.status === 'Pending' && !s.counselor_id); // Show unassigned pending
    // Note: If a request is 'Pending' but somehow has a counselor_id, it shouldn't be in pool.
    // Also include 'Pending' requests that MIGHT be assigned to *me* (edge case) but usually Pending=Unassigned.
    // Let's stick to Pending = Request pool.

    const mySessions = sessions.filter(s =>
        (s.counselor_id === user?.id) || // Assigned to me
        (s.status === 'Pending' && s.counselor_id === user?.id) // (Edge case, shouldn't happen usually)
    );

    // Filtered display based on tab
    // For 'requests', we actually want to show ALL 'Pending' sessions that are NOT assigned to someone else.
    // Actually, simple rule:
    // Tab Request: Status = Pending AND (counselor_id is null OR counselor_id = me)
    // Tab My Sessions: Counselor_id = me AND Status != Pending (Active/Completed/Cancelled)

    const requestsList = sessions.filter(s => s.status === 'Pending' && (!s.counselor_id || s.counselor_id === user?.id));
    const mySessionsList = sessions.filter(s => s.counselor_id === user?.id && s.status !== 'Pending');

    const displayedSessions = activeTab === 'requests' ? requestsList : mySessionsList;


    if (loading) {
        return <div className="text-gray-400 p-4">Loading sessions...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex space-x-1 bg-[#0F1E0F] p-1 rounded-xl w-fit border border-gray-800">
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`
                        px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                        ${activeTab === 'requests'
                            ? 'bg-mindful-green text-white shadow-lg'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }
                    `}
                >
                    Available Requests
                    {requestsList.length > 0 && (
                        <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${activeTab === 'requests' ? 'bg-white/20 text-white' : 'bg-mindful-green text-white'}`}>
                            {requestsList.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('my-sessions')}
                    className={`
                        px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                        ${activeTab === 'my-sessions'
                            ? 'bg-mindful-green text-white shadow-lg'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }
                    `}
                >
                    My Sessions
                </button>
            </div>

            {/* List */}
            <div className="space-y-4">
                {displayedSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-[#0F1E0F] border border-gray-800 rounded-2xl">
                        <p className="text-gray-300 font-medium">
                            {activeTab === 'requests' ? 'No pending requests found.' : 'You have no active sessions.'}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                            {activeTab === 'requests' ? 'Check back later for student requests.' : 'Accept a request to get started.'}
                        </p>
                    </div>
                ) : (
                    displayedSessions.map((session) => (
                        <div
                            key={session.id}
                            className="bg-[#0F1E0F] border border-gray-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6 animate-in fade-in transition-all duration-300 hover:border-gray-700"
                        >
                            {/* Main Info */}
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider border ${getStatusColor(session.status)}`}>
                                        {session.status}
                                    </span>
                                    <span className="text-gray-500 text-sm">
                                        {new Date(session.created_at).toLocaleDateString()}
                                    </span>
                                    {session.type && (
                                        <span className="text-gray-400 text-sm border border-gray-700 px-2 py-0.5 rounded">
                                            {session.type}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-gray-100">{session.title}</h3>
                                    <p className="text-mindful-green text-sm mt-1 font-medium">
                                        Student: {session.student?.full_name || 'Unknown Student'}
                                    </p>
                                </div>

                                <div className="text-gray-400 text-sm">
                                    {session.scheduled_at
                                        ? `Requested for: ${new Date(session.scheduled_at).toLocaleString()}`
                                        : 'No specific time requested.'}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-row md:flex-col justify-center gap-3 min-w-[140px]">
                                {session.status === 'Pending' && (
                                    <>
                                        <button
                                            onClick={() => handleAction(session.id, 'Accept')}
                                            disabled={!!actionLoading}
                                            className="px-4 py-2 bg-mindful-green text-white rounded-xl hover:bg-[#5a9f5f] transition-all font-medium text-sm shadow-lg shadow-mindful-green/10"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleAction(session.id, 'Decline')}
                                            disabled={!!actionLoading}
                                            className="px-4 py-2 bg-transparent border border-gray-600 text-gray-300 rounded-xl hover:bg-red-900/20 hover:text-red-400 hover:border-red-800 transition-all font-medium text-sm"
                                        >
                                            Decline
                                        </button>
                                    </>
                                )}

                                {session.status === 'Active' && session.counselor_id === user?.id && (
                                    <>
                                        <a
                                            href={`/counselor-dashboard/counseling?session=${session.id}`}
                                            className="px-4 py-2 bg-mindful-green/20 text-mindful-green border border-mindful-green/50 rounded-xl hover:bg-mindful-green/30 transition-all font-medium text-sm text-center"
                                        >
                                            Open Chat
                                        </a>
                                        <button
                                            onClick={() => handleAction(session.id, 'Complete')}
                                            disabled={!!actionLoading}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all font-medium text-sm"
                                        >
                                            Mark Complete
                                        </button>
                                    </>
                                )}

                                {(session.status === 'Completed' || session.status === 'Cancelled') && (
                                    <span className="text-center text-gray-500 text-sm italic py-2">
                                        No actions
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

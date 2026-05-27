'use client';

import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, RedirectToSignIn, useUser, useSession } from '@clerk/nextjs';
import { createAuthenticatedClient } from '@/lib/supabaseClient';
import CounselingSidebar, { Session } from '@/app/components/counseling/CounselingSidebar';
import ChatInterface, { Message } from '@/app/components/counseling/ChatInterface';

export default function CounselingChatPage() {
    const { user } = useUser();
    const { session } = useSession();

    const [sessions, setSessions] = useState<Session[]>([]);

    // Get session ID from URL if present
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const initialSessionId = searchParams?.get('session');

    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionId || null);
    const [currentUserId, setCurrentUserId] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setCurrentUserId(user.id);
        }
    }, [user]);

    // Fetch Sessions
    const fetchSessions = async () => {
        if (!session) return;
        try {
            setLoading(true);
            const token = await session.getToken({ template: 'supabase' });
            const supabase = createAuthenticatedClient(token || '');

            const { data: sessionData, error } = await supabase
                .from('counseling_sessions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching sessions:', error);
                setSessions([]);
                return;
            }

            if (sessionData && sessionData.length > 0) {
                const studentIds = [...new Set(sessionData.map(s => s.student_id))];
                const { data: usersData } = await supabase
                    .from('users')
                    .select('id, full_name') // Add email if available in your schema
                    .in('id', studentIds);

                const userMap = new Map(usersData?.map(u => [u.id, u]));

                const joinedSessions = sessionData.map(s => ({
                    ...s,
                    student: userMap.get(s.student_id)
                }));
                // Cast to Session type manually if needed for strictness, but structure matches
                setSessions(joinedSessions as Session[]);
            } else {
                setSessions([]);
            }
        } catch (error) {
            console.error('Unexpected error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchSessions();
        }
    }, [session]);

    // Fetch Messages
    useEffect(() => {
        if (!selectedSessionId || !session) return;

        const fetchMessages = async () => {
            setLoadingMessages(true);
            const token = await session.getToken({ template: 'supabase' });
            const supabase = createAuthenticatedClient(token || '');

            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('session_id', selectedSessionId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error("Error fetching messages:", error);
            } else {
                setMessages(data || []);
            }
            setLoadingMessages(false);
        };

        fetchMessages();

        // Realtime Subscription
        const setupSubscription = async () => {
            const token = await session.getToken({ template: 'supabase' });
            const supabase = createAuthenticatedClient(token || '');

            const channel = supabase
                .channel(`session-${selectedSessionId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `session_id=eq.${selectedSessionId}`
                }, (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages((prev) => {
                        // Prevent duplicates (Realtime vs Optimistic)
                        if (prev.some(m => m.id === newMsg.id)) {
                            return prev;
                        }
                        return [...prev, newMsg];
                    });
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        const unsubscribePromise = setupSubscription();

        return () => {
            unsubscribePromise.then(unsubscribe => unsubscribe());
        };

    }, [selectedSessionId, session]);


    const handleSelectSession = (id: string) => {
        setSelectedSessionId(id);
    };

    const handleSendMessage = async (content: string) => {
        if (!selectedSessionId || !currentUserId || !session) return;

        // Optimistic Update
        const optimisticId = `temp-${Date.now()}`;
        const newOptimisticMsg: Message = {
            id: optimisticId,
            session_id: selectedSessionId,
            sender_id: currentUserId,
            content: content,
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, newOptimisticMsg]);

        try {
            const token = await session.getToken({ template: 'supabase' });
            const supabase = createAuthenticatedClient(token || '');

            const { data, error } = await supabase
                .from('messages')
                .insert({
                    session_id: selectedSessionId,
                    sender_id: currentUserId,
                    content: content
                })
                .select()
                .single();

            if (error) {
                console.error("Error sending message:", error);
                alert("Failed to send message. Please try again.");
                // Rollback
                setMessages((prev) => prev.filter(m => m.id !== optimisticId));
            } else if (data) {
                // Replace optimistic message
                setMessages((prev) => prev.map(m => m.id === optimisticId ? data : m));
            }
        } catch (error) {
            console.error("Error sending message:", error);
            // Rollback
            setMessages((prev) => prev.filter(m => m.id !== optimisticId));
        }
    };

    const selectedSession = sessions.find(s => s.id === selectedSessionId);

    return (
        <main className="flex h-screen flex-col p-0 bg-[linear-gradient(110deg,var(--color-mindful-green)_0%,var(--color-mindful-dark)_100%)] overflow-hidden">

            {/* Enforce Auth */}
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>

            <SignedIn>
                <div className="flex flex-col flex-grow p-4 md:p-8 lg:p-12 pt-24 h-full overflow-hidden">
                    <div className="w-full mx-auto flex max-md:flex-col gap-0 h-full shadow-[4px_4px_0px_0px_rgba(34,197,94,0.15)] rounded-2xl overflow-hidden border border-gray-900/50 bg-[#031207] mb-10">

                        {/* Left Sidebar */}
                        <div className="max-md:w-full max-md:h-1/3 max-md:border-b max-md:border-r-0 w-80 md:w-96 flex-shrink-0 h-full border-r border-gray-800 bg-[#031207]">
                            <CounselingSidebar
                                sessions={sessions}
                                selectedSessionId={selectedSessionId}
                                onSelectSession={handleSelectSession}
                            />
                        </div>

                        {/* Right Chat Area */}
                        <div className="flex-1 h-full bg-[#031207] max-md:min-h-0">
                            <ChatInterface
                                sessionId={selectedSessionId}
                                sessionTitle={selectedSession ? `Session with ${selectedSession.student?.full_name || 'Student'}` : undefined}
                                currentUserId={currentUserId}
                                messages={messages}
                                onSendMessage={handleSendMessage}
                                loading={loadingMessages}
                                isSessionClosed={selectedSession ? ['Completed', 'Cancelled'].includes(selectedSession.status) : false}
                            />
                        </div>
                    </div>
                </div>
            </SignedIn>
        </main>
    );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { SignedIn, SignedOut, RedirectToSignIn, useUser, useSession } from '@clerk/nextjs';
import CounselingSidebar, { Session } from '@/app/components/counseling/CounselingSidebar';
import ChatInterface, { Message } from '@/app/components/counseling/ChatInterface';
import { useSearchParams } from 'next/navigation';
import { getStudentSessionsAction, getMessagesAction, sendMessageAction } from '@/app/actions';
import { createAuthenticatedClient } from '@/lib/supabaseClient';


function StudentCounselingContent() {
    const { user } = useUser();
    const { session } = useSession();
    const searchParams = useSearchParams();
    const initialSessionId = searchParams.get('session');

    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionId);
    const [currentUserId, setCurrentUserId] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setCurrentUserId(user.id);
        }
    }, [user]);

    // Fetch Sessions (Filtered for Student)
    const fetchSessions = async () => {
        if (!session || !user) return;
        try {
            setLoading(true);
            const res = await getStudentSessionsAction();

            if (!res.success) {
                console.error('Error fetching sessions:', res.error);
                setSessions([]);
                return;
            }

            const joinedSessions = (res.data || []).map((s: any) => ({
                ...s,
                student: s.counselor || { email: 'Pending Assignment', full_name: 'Waiting for Counselor' }
            }));

            setSessions(joinedSessions as Session[]);
        } catch (error) {
            console.error('Unexpected error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session && user) {
            fetchSessions();
        }
    }, [session, user]);

    // Fetch Messages & Subscribe to Realtime Updates
    useEffect(() => {
        if (!selectedSessionId || !session) return;

        let channel: any;

        const setupChatRealtime = async () => {
            setLoadingMessages(true);
            try {
                // 1. Initial secure server-side message fetch
                const res = await getMessagesAction(selectedSessionId);
                if (res.success) {
                    setMessages(res.data as Message[] || []);
                } else {
                    console.error("Error fetching messages:", res.error);
                }
            } catch (error) {
                console.error("Error fetching messages:", error);
            } finally {
                setLoadingMessages(false);
            }

            // 2. Set up realtime postgres insert listener for the active session
            try {
                const token = await session.getToken({ template: 'supabase' });
                const supabase = createAuthenticatedClient(token || '');

                channel = supabase
                    .channel(`session-chat-${selectedSessionId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'messages',
                            filter: `session_id=eq.${selectedSessionId}`
                        },
                        (payload) => {
                            const newMsg = payload.new as Message;
                            setMessages((prev) => {
                                // Prevent duplicates and link optimistic UI temporary messages
                                const exists = prev.some(
                                    (m) => m.id === newMsg.id || 
                                    (m.content === newMsg.content && m.sender_id === newMsg.sender_id && Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 5000)
                                );
                                if (exists) {
                                    return prev.map((m) => m.id.startsWith('temp-') && m.content === newMsg.content ? newMsg : m);
                                }
                                return [...prev, newMsg];
                            });
                        }
                    )
                    .subscribe();
            } catch (realtimeErr) {
                console.error("Realtime subscription setup failed:", realtimeErr);
            }
        };

        setupChatRealtime();

        return () => {
            if (channel) {
                channel.unsubscribe();
            }
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
            const res = await sendMessageAction(selectedSessionId, content);

            if (!res.success) {
                console.error("Error sending message:", res.error);
                alert("Failed to send message. Please try again.");
                // Rollback if error
                setMessages((prev) => prev.filter(m => m.id !== optimisticId));
            } else if (res.data) {
                // Replace optimistic message
                setMessages((prev) => prev.map(m => m.id === optimisticId ? res.data as Message : m));
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
                                showPending={true} // Enable Pending for students
                            />
                        </div>

                        {/* Right Chat Area */}
                        <div className="flex-1 h-full bg-[#031207] max-md:min-h-0">
                            <ChatInterface
                                sessionId={selectedSessionId}
                                sessionTitle={selectedSession ? `Session with ${selectedSession.student?.full_name || 'Counselor'}` : undefined}
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

export default function StudentCounselingPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-white">Loading...</div>}>
            <StudentCounselingContent />
        </Suspense>
    );
}

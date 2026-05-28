'use client';

import { useState } from 'react';
import { useSession, useUser } from '@clerk/nextjs';
import { createAuthenticatedClient } from '@/lib/supabaseClient';

interface RequestSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const SESSION_TYPES = [
    { id: 'Academic', label: 'Academic 📚' },
    { id: 'Health', label: 'Health ❤️' },
    { id: 'Social', label: 'Social 👥' },
    { id: 'Personal', label: 'Personal 🧘' },
];

export default function RequestSessionModal({ isOpen, onClose, onSuccess }: RequestSessionModalProps) {
    const { user } = useUser();
    const { session } = useSession();

    const [title, setTitle] = useState('');
    const [type, setType] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id || !session) return;

        // Basic validation
        if (!title.trim() || !type) {
            setError('Please fill in all fields');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');

            const token = await session.getToken({ template: 'supabase' });
            const supabase = createAuthenticatedClient(token || '');



            // Get user's Supabase ID
            let studentId = user.id;
            const { data: userData } = await supabase
                .from('users')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            if (!userData) {
                // User definitely not in Supabase. Attempt to self-register (Upsert).
                const fullName = user.fullName || user.firstName || 'User';

                const { error: upsertError } = await supabase
                    .from('users')
                    .upsert({
                        id: user.id, // Use Clerk ID as ID
                        full_name: fullName,
                        role: 'student', // Default
                    }, { onConflict: 'id' });

                if (upsertError) {
                    console.error('Failed to auto-create user record:', upsertError);
                    throw new Error('User synchronization failed. Please refresh and try again.');
                }
                studentId = user.id;
            } else {
                studentId = userData.id;
            }

            const { error: insertError } = await supabase
                .from('counseling_sessions')
                .insert({
                    student_id: studentId,
                    title: title.trim(),
                    type: type,
                    scheduled_at: null, // No specific time requested
                    status: 'Pending', // Default status
                });

            if (insertError) {
                throw insertError;
            }

            // Reset and close
            setTitle('');
            setType('');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error requesting session:', err);
            setError(err.message || 'Failed to request session');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#031207] border border-mindful-green/30 rounded-2xl shadow-[0px_0px_20px_0px_rgba(34,197,94,0.2)] p-6 m-4 animate-in fade-in zoom-in duration-200">
                <h2 className="text-2xl font-kodchasan font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-6 text-center">
                    Request Navigation Session
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/40 border border-red-800 rounded-lg text-red-200 text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div className="space-y-1">
                        <label className="text-sm text-gray-400 font-medium ml-1">Topic / Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What would you like to discuss?"
                            className="w-full px-4 py-3 bg-[#0F1E0F] border border-gray-700 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-mindful-green focus:ring-1 focus:ring-mindful-green transition-all"
                        />
                    </div>

                    {/* Type Grid */}
                    <div className="space-y-1">
                        <label className="text-sm text-gray-400 font-medium ml-1">Session Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            {SESSION_TYPES.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setType(t.id)}
                                    className={`
                    px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200
                    ${type === t.id
                                            ? 'bg-mindful-green/20 border-mindful-green text-mindful-green shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                                            : 'bg-[#0F1E0F] border-gray-800 text-gray-400 hover:border-gray-600 hover:bg-[#152615]'
                                        }
                  `}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-6 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-transparent border border-gray-700 text-gray-300 rounded-xl hover:bg-gray-800/50 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-3 bg-mindful-green text-white rounded-xl hover:bg-[#5a9f5f] transition-all shadow-lg shadow-mindful-green/20 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {isSubmitting ? 'Requesting...' : 'Request Session'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

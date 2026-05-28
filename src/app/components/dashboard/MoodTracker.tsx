'use client';

import { useUser, useSession } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { getTodayStatusAction, saveMoodLogAction, saveThoughtsAction } from '@/app/actions';

export default function MoodTracker() {
    const { user, isLoaded } = useUser();
    const { session } = useSession();

    // Mood & Thoughts state
    const [selectedMood, setSelectedMood] = useState<number | null>(null);
    const [thoughts, setThoughts] = useState('');
    const [isSavingMood, setIsSavingMood] = useState(false);
    const [isSavingThoughts, setIsSavingThoughts] = useState(false);
    const maxThoughtsLength = 50;

    // Mood emojis (1 = Awful, 5 = Great)
    const moodEmojis = ['😫', '☹️', '😐', '🙂', '🤩'];

    useEffect(() => {
        const fetchDailyStatus = async () => {
            if (!user?.id || !session) return;

            try {
                const res = await getTodayStatusAction();
                if (res.success) {
                    if (res.mood) {
                        setSelectedMood(res.mood);
                    }
                    if (res.thoughts) {
                        setThoughts(res.thoughts);
                    }
                } else {
                    console.error('Error fetching daily status:', res.error);
                }
            } catch (error) {
                console.error('Error fetching daily status:', error);
            }
        };

        if (isLoaded && user) {
            fetchDailyStatus();
        }
    }, [user, isLoaded, session]);

    // Handle mood selection and save to Supabase
    const handleMoodClick = async (moodRating: number) => {
        if (!user?.id || isSavingMood || !session) return;

        try {
            setIsSavingMood(true);

            // Check if already logged today
            const status = await getTodayStatusAction();
            if (status.success && status.mood !== null) {
                console.warn("You have already logged your mood for today.");
                setSelectedMood(status.mood);
                setIsSavingMood(false);
                return;
            }

            setSelectedMood(moodRating);

            // Insert mood log using server action
            const res = await saveMoodLogAction(moodRating, '', '');

            if (!res.success) {
                console.error('Error saving mood:', res.error);
                setSelectedMood(null);
            }
        } catch (error) {
            console.error('Error saving mood:', error);
            setSelectedMood(null);
        } finally {
            setIsSavingMood(false);
        }
    };

    // Handle thoughts save to Supabase
    const handleSaveThoughts = async () => {
        if (!user?.id || !thoughts.trim() || isSavingThoughts || !session) return;

        try {
            setIsSavingThoughts(true);

            // Check if already logged today
            const status = await getTodayStatusAction();
            if (status.success && status.thoughts) {
                console.warn("You have already logged your thoughts for today.");
                setIsSavingThoughts(false);
                return;
            }

            // Insert thought using server action
            const res = await saveThoughtsAction(thoughts);

            if (!res.success) {
                console.error('Error saving thoughts:', res.error);
            } else {
                // Clear thoughts after successful save
                setThoughts('');
                alert("Thoughts saved successfully!");
            }
        } catch (error) {
            console.error('Error saving thoughts:', error);
        } finally {
            setIsSavingThoughts(false);
        }
    };

    return (
        <div className="rounded-lg bg-[#031207] border border-gray-900/50 shadow-[4px_4px_0px_0px_rgba(34,197,94,0.15)] p-6">
            {/* Mood Selection */}
            <div className="mb-6">
                <div className="flex justify-center gap-4">
                    {moodEmojis.map((emoji, index) => {
                        const moodRating = index + 1;
                        const isSelected = selectedMood === moodRating;
                        return (
                            <button
                                key={moodRating}
                                onClick={() => handleMoodClick(moodRating)}
                                disabled={isSavingMood}
                                className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-2xl
                  transition-all duration-200
                  ${isSelected
                                        ? 'bg-mindful-green/30 border-2 border-mindful-green scale-110'
                                        : 'bg-[#0F1E0F] border-2 border-gray-700 hover:border-mindful-green/50 hover:scale-105'
                                    }
                  ${isSavingMood ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                                aria-label={`Mood rating ${moodRating}`}
                            >
                                {emoji}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Thoughts Input */}
            <div className="space-y-2">
                <textarea
                    value={thoughts}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= maxThoughtsLength) {
                            setThoughts(value);
                        }
                    }}
                    placeholder="Thoughts for the day?"
                    rows={4}
                    className="w-full px-4 py-3 bg-[#0F1E0F] border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-mindful-green resize-none"
                />

                {/* Character count and save button */}
                <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">
                        {thoughts.length}/{maxThoughtsLength}
                    </span>
                    <button
                        onClick={handleSaveThoughts}
                        disabled={!thoughts.trim() || isSavingThoughts || thoughts.length === 0}
                        className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
              ${thoughts.trim() && !isSavingThoughts
                                ? 'bg-mindful-green hover:bg-[#5a9f5f] text-white cursor-pointer'
                                : 'bg-[#0F1E0F] border border-gray-700 text-gray-500 cursor-not-allowed'
                            }
            `}
                        aria-label="Save thoughts"
                    >
                        {isSavingThoughts ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Save</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

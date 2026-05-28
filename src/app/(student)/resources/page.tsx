'use client';

import { useEffect, useState } from 'react';
import { useSession, useUser, RedirectToSignIn, SignedOut, SignedIn } from '@clerk/nextjs';
import ResourceGrid, { Resource } from '@/app/components/resources/ResourceGrid';
import { getResourcesAction } from '@/app/actions';

export default function ResourcesPage() {
    const { user, isLoaded } = useUser();
    const { session } = useSession();
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'All' | 'Article' | 'Video'>('All');
    const [filterCategory, setFilterCategory] = useState<string>('All');

    const filteredResources = resources.filter(res => {
        const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            res.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'All' || res.type === filterType;
        const matchesCategory = filterCategory === 'All' || res.content_type === filterCategory;

        return matchesSearch && matchesType && matchesCategory;
    });

    useEffect(() => {
        const fetchResources = async () => {
            if (!session) return;

            try {
                setLoading(true);
                const res = await getResourcesAction();

                if (!res.success) {
                    console.error('Error fetching resources:', res.error);
                } else {
                    setResources(res.data as Resource[] || []);
                }
            } catch (error) {
                console.error('Unexpected error:', error);
            } finally {
                setLoading(false);
            }
        };

        if (isLoaded && session) {
            fetchResources();
        }
    }, [isLoaded, session]);

    if (!isLoaded) {
        return (
            <main className="flex min-h-screen flex-col p-0 bg-[linear-gradient(110deg,var(--color-mindful-green)_0%,var(--color-mindful-dark)_100%)]">
                <div className="flex flex-grow items-center justify-center p-6 pt-24">
                    <div className="text-gray-200">Loading...</div>
                </div>
            </main>
        );
    }

    return (
        <main className="flex h-screen flex-col p-0 bg-[linear-gradient(110deg,var(--color-mindful-green)_0%,var(--color-mindful-dark)_100%)] overflow-hidden">

            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>

            <SignedIn>
                <div className="flex flex-col flex-1 min-h-0 p-6 md:p-10 pt-24 pb-10 overflow-hidden">
                    <div className="w-full mx-auto flex flex-col flex-1 min-h-0">
                        <div className="rounded-2xl bg-[#031207] border border-gray-900/50 shadow-[4px_4px_0px_0px_rgba(34,197,94,0.15)] flex flex-col flex-1 min-h-0 overflow-hidden relative">

                            {/* Header Section (Non-scrolling) */}
                            <div className="p-6 md:p-10 lg:p-12 pb-0 flex-shrink-0">
                                <div className="mb-0">
                                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-kodchasan font-bold bg-gradient-to-r from-[#42734D] via-[#5A9F5F] to-[#6A9F6F] bg-clip-text text-transparent">
                                        Resource Library
                                    </h1>
                                    <p className="text-gray-400 mt-2 font-medium">
                                        Explore curated articles and videos for your wellbeing.
                                    </p>
                                </div>

                                {/* Search and Filters */}
                                <div className="mt-8 mb-6 flex flex-col md:flex-row gap-4 items-start justify-between">
                                    {/* Search Input */}
                                    <div className="relative w-full md:w-80 group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="w-5 h-5 text-gray-500 group-focus-within:text-mindful-green transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search resources..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-[#0F1E0F] border border-gray-800 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:border-mindful-green focus:ring-1 focus:ring-mindful-green transition-all"
                                        />
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                        {/* Category Filter */}
                                        <div className="relative">
                                            <select
                                                value={filterCategory}
                                                onChange={(e) => setFilterCategory(e.target.value)}
                                                className="w-full sm:w-40 px-4 py-2.5 bg-[#0F1E0F] border border-gray-800 rounded-xl text-gray-200 focus:outline-none focus:border-mindful-green appearance-none cursor-pointer"
                                            >
                                                <option value="All">All Categories</option>
                                                <option value="Academic">Academic</option>
                                                <option value="Health">Health</option>
                                                <option value="Social">Social</option>
                                                <option value="Personal">Personal</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>

                                        {/* Format Filters (Buttons) */}
                                        <div className="flex bg-[#0F1E0F] p-1 rounded-xl border border-gray-800">
                                            {(['All', 'Article', 'Video'] as const).map((type) => (
                                                <button
                                                    key={type}
                                                    onClick={() => setFilterType(type)}
                                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${filterType === type
                                                        ? 'bg-mindful-green text-white shadow-lg shadow-mindful-green/20'
                                                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                                        }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Content Area */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 pt-0">
                                <ResourceGrid
                                    resources={filteredResources}
                                // No onDelete prop passed = Read Only mode
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </SignedIn>
        </main>
    );
}

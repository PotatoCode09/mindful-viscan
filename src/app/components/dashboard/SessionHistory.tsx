'use client';

import { useUser, useSession } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { getStudentSessionsAction, deleteSessionsAction } from '@/app/actions';
import RequestSessionModal from './RequestSessionModal';

interface CounselingSession {
    id: string;
    status: string;
    type: string;
    title?: string;
    scheduled_at: string;
    counselor: {
        id: string;
        email?: string;
        full_name?: string;
    } | null;
}

export default function SessionHistory() {
    const { user, isLoaded } = useUser();
    const { session } = useSession();
    const [sessions, setSessions] = useState<CounselingSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const rowsPerPage = 5;

    const fetchSessions = async () => {
        if (!user?.id || !session) return;

        try {
            setLoading(true);
            const res = await getStudentSessionsAction();

            if (!res.success) {
                console.error('Error fetching sessions:', res.error);
                setSessions([]);
                return;
            }

            const transformedSessions = (res.data || []).map((session: any) => ({
                id: session.id,
                status: session.status || 'Pending',
                type: session.type || 'General',
                title: session.title,
                scheduled_at: session.scheduled_at,
                counselor: session.counselor ? {
                    id: session.counselor.id,
                    full_name: session.counselor.full_name,
                    email: session.counselor.email,
                } : null,
            }));

            setSessions(transformedSessions);
        } catch (error) {
            console.error('Unexpected error fetching sessions:', error);
            setSessions([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch counseling sessions
    useEffect(() => {
        if (isLoaded && user) {
            fetchSessions();
        }
    }, [user, isLoaded, session]);

    const handleDeleteSelected = async () => {
        if (!user || !session || selectedRows.size === 0) return;

        try {
            setIsDeleting(true);

            const res = await deleteSessionsAction(Array.from(selectedRows));

            if (!res.success) {
                console.error('Error deleting sessions:', res.error);
                alert('Failed to delete sessions. Please try again.');
            } else {
                setSelectedRows(new Set());
                fetchSessions();
            }
        } catch (error) {
            console.error('Error deleting sessions:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    // Filter sessions
    const filteredSessions = sessions.filter(session => {
        if (!filter) return true;
        const searchTerm = filter.toLowerCase();
        return (
            session.status?.toLowerCase().includes(searchTerm) ||
            session.type?.toLowerCase().includes(searchTerm) ||
            session.title?.toLowerCase().includes(searchTerm) ||
            session.counselor?.full_name?.toLowerCase().includes(searchTerm) ||
            session.counselor?.email?.toLowerCase().includes(searchTerm)
        );
    });

    // Pagination
    const totalPages = Math.ceil(filteredSessions.length / rowsPerPage);
    const paginatedSessions = filteredSessions.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    // Handle row selection
    const toggleRowSelection = (sessionId: string) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(sessionId)) {
            newSelected.delete(sessionId);
        } else {
            if (newSelected.size >= 10) {
                alert("You can select up to 10 sessions at a time.");
                return;
            }
            newSelected.add(sessionId);
        }
        setSelectedRows(newSelected);
    };

    const toggleAllSelection = () => {
        if (selectedRows.size === paginatedSessions.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(paginatedSessions.map(s => s.id)));
        }
    };

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    // Get counselor display name/email
    const getCounselorDisplay = (counselor: CounselingSession['counselor']) => {
        if (!counselor) return 'N/A';
        return counselor.email || counselor.full_name || 'Unknown';
    };

    return (
        <div className="flex flex-col flex-1 rounded-lg bg-[#031207] border-t border-l border-gray-900/50 border-r-2 border-b-2 border-r-mindful-green/60 border-b-mindful-green/60 shadow-[4px_4px_0px_0px_rgba(34,197,94,0.15)] p-6 min-h-[400px] h-full">
            <div className="flex flex-col flex-1 gap-4 overflow-hidden">
                <h2 className="text-gray-200 text-lg font-medium">Session History</h2>

                {/* Filter and Columns */}
                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="Filter sessions..."
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="flex-1 px-4 py-2 bg-[#0F1E0F] border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-mindful-green"
                    />
                    <button className="px-4 py-2 bg-[#0F1E0F] border border-gray-700 rounded-lg text-gray-200 hover:bg-[#1a2f1a] transition-colors flex items-center gap-2">
                        Columns
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-12 bg-[#0F1E0F] rounded animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto flex-1 overflow-y-auto min-h-0 border-b border-gray-800 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-[#0F1E0F] border-b border-gray-700">
                                        <th className="px-4 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.size === paginatedSessions.length && paginatedSessions.length > 0}
                                                onChange={toggleAllSelection}
                                                className="rounded border-gray-600 bg-[#0F1E0F] text-mindful-green focus:ring-mindful-green"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-gray-200 text-sm font-medium">Status</th>
                                        <th className="px-4 py-3 text-left text-gray-200 text-sm font-medium">Topic</th>
                                        <th className="px-4 py-3 text-left text-gray-200 text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                Counselor
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                                </svg>
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-gray-200 text-sm font-medium">Date</th>
                                        <th className="px-4 py-3 text-left text-gray-200 text-sm font-medium">Session Type</th>
                                        <th className="px-4 py-3 text-left text-gray-200 text-sm font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedSessions.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                                No sessions found
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedSessions.map((session, index) => (
                                            <tr
                                                key={session.id}
                                                className={`border-b border-gray-800 ${index % 2 === 0 ? 'bg-[#031207]' : 'bg-[#0a1a0a]'
                                                    } hover:bg-[#0F1E0F] transition-colors`}
                                            >
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.has(session.id)}
                                                        onChange={() => toggleRowSelection(session.id)}
                                                        className="rounded border-gray-600 bg-[#0F1E0F] text-mindful-green focus:ring-mindful-green"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-gray-200 text-sm">{session.status || 'N/A'}</td>
                                                <td className="px-4 py-3 text-gray-200 text-sm font-medium text-mindful-green">{session.title || 'No Topic'}</td>
                                                <td className="px-4 py-3 text-gray-200 text-sm">
                                                    {getCounselorDisplay(session.counselor)}
                                                </td>
                                                <td className="px-4 py-3 text-gray-200 text-sm">
                                                    {session.scheduled_at ? formatDate(session.scheduled_at) : 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-200 text-sm">{session.type || 'N/A'}</td>
                                                <td className="px-4 py-3">
                                                    {['Active', 'Completed', 'Cancelled', 'Pending'].includes(session.status) && (
                                                        <a
                                                            href={`/counseling?session=${session.id}`}
                                                            className="text-xs bg-mindful-green/10 text-mindful-green border border-mindful-green/20 px-3 py-1.5 rounded-lg hover:bg-mindful-green/20 transition-colors"
                                                        >
                                                            Chat
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination and Selection Info */}
                        <div className="flex items-center justify-between">
                            <div className="text-gray-400 text-sm">
                                {selectedRows.size} of {filteredSessions.length} row(s) selected.
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 bg-[#0F1E0F] border border-gray-700 rounded-lg text-gray-200 hover:bg-[#1a2f1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 bg-[#0F1E0F] border border-gray-700 rounded-lg text-gray-200 hover:bg-[#1a2f1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons - Pushed to bottom */}
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={handleDeleteSelected}
                                disabled={selectedRows.size === 0 || isDeleting}
                                className="px-4 py-2 bg-[#0F1E0F] border border-gray-700 rounded-lg text-gray-200 hover:bg-[#1a2f1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete Selected'}
                            </button>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="px-4 py-2 bg-mindful-green hover:bg-[#5a9f5f] text-white rounded-lg transition-colors font-medium"
                            >
                                Request new session
                            </button>
                        </div>
                    </>
                )}
            </div>

            <RequestSessionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    fetchSessions();
                }}
            />
        </div>
    );
}

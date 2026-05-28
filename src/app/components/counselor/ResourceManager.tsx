'use client';

import { useState, useEffect } from 'react';
import { useSession, useUser } from '@clerk/nextjs';
import ResourceGrid, { Resource } from '@/app/components/resources/ResourceGrid';
import AddResourceModal from './AddResourceModal';
import { getResourcesAction, deleteResourceAction } from '@/app/actions';

export default function ResourceManager() {
    const { user, isLoaded } = useUser();
    const { session } = useSession();

    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [resourceToEdit, setResourceToEdit] = useState<Resource | null>(null);

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

    const handleDeleteResource = async (id: string) => {
        if (!confirm('Are you sure you want to delete this resource?')) return;
        if (!session) return;

        try {
            const res = await deleteResourceAction(id);

            if (!res.success) {
                console.error('Error deleting resource:', res.error);
                alert('Failed to delete resource');
            } else {
                fetchResources(); // Refresh list
            }
        } catch (error) {
            console.error('Error deleting resource:', error);
        }
    };

    const handleEditResource = (resource: Resource) => {
        setResourceToEdit(resource);
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setResourceToEdit(null);
    };

    useEffect(() => {
        if (isLoaded && session) {
            fetchResources();
        }
    }, [isLoaded, session]);

    return (
        <div className="flex flex-col h-full gap-6">
            {/* Header / Actions (Fixed) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-kodchasan font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        Resource Library
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Manage curative materials for student well-being
                    </p>
                </div>

                <button
                    onClick={() => {
                        setResourceToEdit(null);
                        setIsAddModalOpen(true);
                    }}
                    className="px-5 py-2.5 bg-mindful-green text-white rounded-xl hover:bg-[#5a9f5f] transition-all font-medium shadow-lg shadow-mindful-green/20 flex items-center gap-2 self-start md:self-auto"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Resource
                </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-start justify-between shrink-0">
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

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-2">
                <ResourceGrid
                    resources={filteredResources}
                    isLoading={loading}
                    onDelete={handleDeleteResource}
                    onEdit={handleEditResource}
                />
            </div>

            {/* Modal */}
            <AddResourceModal
                isOpen={isAddModalOpen}
                onClose={handleCloseModal}
                onSuccess={fetchResources}
                resourceToEdit={resourceToEdit}
            />
        </div>
    );
}

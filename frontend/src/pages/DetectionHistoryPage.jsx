import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Search, Filter, FileVideo, Calendar, Clock, Eye, Trash2 } from 'lucide-react';

const API_URL = import.meta.env.MODE === "development" ? "http://localhost:5000/api/detection" : "/api/detection";
const DETECTION_API_URL = 'http://localhost:5001';

axios.defaults.withCredentials = true;

const DetectionHistoryPage = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchReports();
        fetchStats();
    }, [currentPage, filterType, searchQuery]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                limit: 10
            };

            if (filterType !== 'all') {
                params.detectionType = filterType;
            }

            if (searchQuery) {
                params.search = searchQuery;
            }

            const response = await axios.get(`${API_URL}/history`, { params });
            
            if (response.data.success) {
                setReports(response.data.reports);
                setTotalPages(response.data.totalPages);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/stats/summary`);
            if (response.data.success) {
                setStats(response.data.stats);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchReports();
    };

    const handleDeleteReport = async (reportId) => {
        if (window.confirm('Are you sure you want to delete this report?')) {
            try {
                await axios.delete(`${API_URL}/${reportId}`);
                fetchReports();
                fetchStats();
            } catch (error) {
                console.error('Error deleting report:', error);
                alert('Failed to delete report');
            }
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className='min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center relative overflow-hidden p-4'>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className='max-w-7xl w-full bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden'
            >
                {/* Header */}
                <div className='bg-gray-800 p-6 border-b border-gray-700'>
                    <div className='flex items-center justify-between mb-4'>
                        <button
                            onClick={() => navigate('/detection')}
                            className='flex items-center text-gray-400 hover:text-white transition-colors'
                        >
                            <ArrowLeft className='mr-2' size={20} />
                            Back to Detection
                        </button>
                        <h1 className='text-3xl font-bold text-white'>Detection History</h1>
                        <div className='w-32'></div>
                    </div>

                    {/* Stats Summary */}
                    {stats && (
                        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mt-6'>
                            <div className='bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg p-4 text-white'>
                                <div className='text-sm opacity-90'>Total Reports</div>
                                <div className='text-3xl font-bold'>{stats.totalReports}</div>
                            </div>
                            <div className='bg-gradient-to-br from-green-500 to-green-700 rounded-lg p-4 text-white'>
                                <div className='text-sm opacity-90'>Video Detections</div>
                                <div className='text-3xl font-bold'>
                                    {stats.typeBreakdown?.find(t => t._id === 'video')?.count || 0}
                                </div>
                            </div>
                            <div className='bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg p-4 text-white'>
                                <div className='text-sm opacity-90'>Image Detections</div>
                                <div className='text-3xl font-bold'>
                                    {stats.typeBreakdown?.find(t => t._id === 'image')?.count || 0}
                                </div>
                            </div>
                            <div className='bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg p-4 text-white'>
                                <div className='text-sm opacity-90'>Processing Time</div>
                                <div className='text-2xl font-bold'>
                                    {stats.processingStats?.totalProcessingTime?.toFixed(1) || 0}s
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search and Filters */}
                    <div className='flex flex-col md:flex-row gap-4 mt-6'>
                        <form onSubmit={handleSearch} className='flex-1 flex gap-2'>
                            <div className='relative flex-1'>
                                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={20} />
                                <input
                                    type='text'
                                    placeholder='Search by object name (e.g., person, car)...'
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className='w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500'
                                />
                            </div>
                            <button
                                type='submit'
                                className='px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors'
                            >
                                Search
                            </button>
                        </form>
                        
                        <div className='flex gap-2'>
                            <button
                                onClick={() => { setFilterType('all'); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    filterType === 'all' 
                                        ? 'bg-green-600 text-white' 
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => { setFilterType('video'); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    filterType === 'video' 
                                        ? 'bg-green-600 text-white' 
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                Video
                            </button>
                            <button
                                onClick={() => { setFilterType('image'); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    filterType === 'image' 
                                        ? 'bg-green-600 text-white' 
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                Image
                            </button>
                        </div>
                    </div>
                </div>

                {/* Reports List */}
                <div className='p-6'>
                    {loading ? (
                        <div className='text-center py-20'>
                            <div className='inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500'></div>
                            <p className='text-gray-400 mt-4'>Loading reports...</p>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className='text-center py-20'>
                            <FileVideo className='mx-auto text-gray-600' size={64} />
                            <p className='text-gray-400 mt-4 text-lg'>No detection reports found</p>
                            <p className='text-gray-500 mt-2'>Start detecting objects to see your history here</p>
                        </div>
                    ) : (
                        <div className='space-y-4'>
                            {reports.map((report) => (
                                <motion.div
                                    key={report._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className='bg-gray-700 rounded-lg p-6 hover:bg-gray-650 transition-colors border border-gray-600'
                                >
                                    <div className='flex items-start justify-between'>
                                        <div className='flex-1'>
                                            <div className='flex items-center gap-3 mb-3'>
                                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                    report.detectionType === 'video' 
                                                        ? 'bg-green-500 text-white' 
                                                        : 'bg-purple-500 text-white'
                                                }`}>
                                                    {report.detectionType === 'video' ? '📹 Video' : '🖼️ Image'}
                                                </span>
                                                <div className='flex items-center text-gray-400 text-sm'>
                                                    <Calendar size={16} className='mr-1' />
                                                    {formatDate(report.createdAt)}
                                                </div>
                                                {report.processingTime && (
                                                    <div className='flex items-center text-gray-400 text-sm'>
                                                        <Clock size={16} className='mr-1' />
                                                        {report.processingTime.toFixed(1)}s
                                                    </div>
                                                )}
                                            </div>

                                            {/* Detection Summary */}
                                            <div className='mb-3'>
                                                <div className='text-white font-semibold mb-2'>
                                                    Detected {report.totalDetections} objects
                                                    {report.videoData?.totalCrossings && 
                                                        ` (${report.videoData.totalCrossings} line crossings)`
                                                    }
                                                </div>
                                                <div className='flex flex-wrap gap-2'>
                                                    {report.detectedObjects.map((obj, idx) => (
                                                        <span
                                                            key={idx}
                                                            className='bg-gray-600 text-gray-200 px-3 py-1 rounded-full text-sm'
                                                        >
                                                            {obj.class}: {obj.count}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Video Info */}
                                            {report.videoData && (
                                                <div className='text-gray-400 text-sm space-y-1'>
                                                    <div>Duration: {report.videoData.duration?.toFixed(1)}s</div>
                                                    <div>Line Position: {(report.videoData.countingLinePosition * 100)?.toFixed(0)}%</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className='flex gap-2 ml-4'>
                                            {report.reportUrl && (
                                                <button
                                                    onClick={() => window.open(`${DETECTION_API_URL}${report.reportUrl}`, '_blank')}
                                                    className='p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors'
                                                    title='View Report'
                                                >
                                                    <Eye size={20} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteReport(report._id)}
                                                className='p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors'
                                                title='Delete Report'
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className='flex justify-center gap-2 mt-8'>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className='px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                            >
                                Previous
                            </button>
                            <div className='px-4 py-2 bg-gray-700 text-white rounded-lg'>
                                Page {currentPage} of {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className='px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default DetectionHistoryPage;

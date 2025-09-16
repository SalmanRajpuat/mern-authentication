import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { formatDate } from '../utils/date';
import { User, LogOut, Upload, Camera, Play, Image, FileVideo, Zap, Video, Eye } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const DETECTION_API_URL = 'http://localhost:5001';

const DashboardPage = () => {

    const { user, logout } = useAuthStore();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectionResults, setDetectionResults] = useState(null);
    const [detectionMode, setDetectionMode] = useState('image'); // 'image', 'video', 'webcam'
    const [isWebcamActive, setIsWebcamActive] = useState(false);
    const [annotatedImage, setAnnotatedImage] = useState(null);
    const dropdownRef = useRef(null);
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);

    const handleLogout = () =>{
        logout();
    };

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            setDetectionResults(null);
            setAnnotatedImage(null);
            
            // Set detection mode based on file type
            if (file.type.startsWith('image/')) {
                setDetectionMode('image');
            } else if (file.type.startsWith('video/')) {
                setDetectionMode('video');
            }
        }
    };

    const startDetection = async () => {
        if (!selectedFile && detectionMode !== 'webcam') return;
        
        setIsDetecting(true);
        setDetectionResults(null);
        setAnnotatedImage(null);

        try {
            // First test connection
            console.log('Testing API connection...');
            const testResponse = await axios.get(`${DETECTION_API_URL}/`, {
                timeout: 5000,
                withCredentials: false
            });
            console.log('API connection test:', testResponse.data);

            let response;
            const formData = new FormData();

            if (detectionMode === 'image') {
                formData.append('image', selectedFile);
                console.log('Sending image detection request...');
                response = await axios.post(`${DETECTION_API_URL}/detect/image`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 30000,
                    withCredentials: false
                });
                
                if (response.data.annotated_image) {
                    setAnnotatedImage(response.data.annotated_image);
                }
            } else if (detectionMode === 'video') {
                formData.append('video', selectedFile);
                console.log('Sending video detection request...');
                response = await axios.post(`${DETECTION_API_URL}/detect/video`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 90000,
                    withCredentials: false
                });
            } else if (detectionMode === 'webcam') {
                console.log('Sending webcam detection request...');
                response = await axios.post(`${DETECTION_API_URL}/detect/webcam/start`, {}, {
                    timeout: 30000,
                    withCredentials: false
                });
                setIsWebcamActive(true);
            }

            console.log('Detection response:', response.data);

            if (response.data.status === 'success') {
                setDetectionResults({
                    detected_objects: response.data.detections || [],
                    total_detections: response.data.detections?.length || 0,
                    processing_time: response.data.processing_time || 'N/A',
                    message: response.data.message
                });
            }
        } catch (error) {
            console.error('Detection error details:', error);
            
            let errorMessage = 'Detection failed. ';
            if (error.code === 'ECONNREFUSED' || error.code === 'ERR_CONNECTION_REFUSED') {
                errorMessage += 'Cannot connect to Python API. Make sure it\'s running on port 5001.';
            } else if (error.code === 'ECONNRESET' || error.message.includes('ERR_CONNECTION_RESET')) {
                errorMessage += 'Connection was reset. The API might be restarting.';
            } else if (error.code === 'ETIMEDOUT') {
                errorMessage += 'Request timed out. The API might be overloaded.';
            } else if (error.response) {
                errorMessage += `Server error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`;
            } else {
                errorMessage += `Network error: ${error.message}`;
            }
            
            alert(errorMessage);
        } finally {
            setIsDetecting(false);
        }
    };

    const openFileDialog = () => {
        fileInputRef.current?.click();
    };

    const startWebcam = async () => {
        setDetectionMode('webcam');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Webcam access denied:', error);
            alert('Please allow webcam access for live detection.');
        }
    };

    const stopWebcam = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsWebcamActive(false);
        setDetectionMode('image');
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        // Add event listener when dropdown is open
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        // Cleanup event listener
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className='w-full min-h-screen p-8 bg-gray-800 bg-opacity-80 backdrop-filter backdrop-blur-lg'
        >
            {/* Header with Profile Avatar */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className='flex justify-between items-center mb-8'
            >
                <div></div> {/* Empty div for spacing */}
                
                {/* Profile Avatar with Dropdown */}
                <div className='relative' ref={dropdownRef}>
                    <motion.div 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleDropdown}
                        className='flex items-center space-x-3 bg-gray-800 bg-opacity-50 rounded-full py-2 px-4 border border-gray-700 cursor-pointer'
                    >
                        <div className='w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center'>
                            <User className='w-6 h-6 text-white' />
                        </div>
                    </motion.div>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className='absolute right-0 mt-2 w-64 bg-gray-800 bg-opacity-90 backdrop-blur-lg rounded-lg border border-gray-700 shadow-2xl z-50'
                        >
                            <div className='p-4'>
                                {/* User Name */}
                                <p className='text-white font-bold text-lg mb-1'>
                                    {user?.name || 'User'}
                                </p>
                                
                                {/* User Email */}
                                <p className='text-gray-400 text-sm mb-4'>
                                    {user?.email || 'user@example.com'}
                                </p>
                                
                                {/* Logout Button */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleLogout}
                                    className='w-full flex items-center justify-center space-x-2 py-2 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-colors'
                                >
                                    <LogOut className='w-4 h-4' />
                                    <span>Logout</span>
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>

            <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-br from-green-400 to-emerald-600 text-transparent bg-clip-text">
                AI Object Detection Dashboard
            </h2>

                {/* Detection Interface */}
            <div className='max-w-6xl mx-auto space-y-6'>
                
                {/* Detection Mode Selector */}
                <motion.div 
                    className='bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h3 className='text-lg font-semibold text-white mb-4'>Choose Detection Mode</h3>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setDetectionMode('image')}
                            className={`flex items-center justify-center space-x-3 p-4 rounded-lg border-2 transition-colors ${
                                detectionMode === 'image' 
                                    ? 'border-emerald-500 bg-emerald-500 bg-opacity-20 text-emerald-400'
                                    : 'border-gray-600 text-gray-300 hover:border-gray-500'
                            }`}
                        >
                            <Image className='w-6 h-6' />
                            <span>Image Detection</span>
                        </motion.button>
                        
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setDetectionMode('video')}
                            className={`flex items-center justify-center space-x-3 p-4 rounded-lg border-2 transition-colors ${
                                detectionMode === 'video' 
                                    ? 'border-emerald-500 bg-emerald-500 bg-opacity-20 text-emerald-400'
                                    : 'border-gray-600 text-gray-300 hover:border-gray-500'
                            }`}
                        >
                            <Video className='w-6 h-6' />
                            <span>Video Detection</span>
                        </motion.button>
                        
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            onClick={startWebcam}
                            className={`flex items-center justify-center space-x-3 p-4 rounded-lg border-2 transition-colors ${
                                detectionMode === 'webcam' 
                                    ? 'border-emerald-500 bg-emerald-500 bg-opacity-20 text-emerald-400'
                                    : 'border-gray-600 text-gray-300 hover:border-gray-500'
                            }`}
                        >
                            <Eye className='w-6 h-6' />
                            <span>Live Detection</span>
                        </motion.button>
                    </div>
                </motion.div>

                {/* Upload Section or Webcam */}
                <motion.div 
                    className='bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className='flex items-center space-x-3 mb-4'>
                        <Zap className='w-6 h-6 text-emerald-400' />
                        <h3 className='text-xl font-semibold text-white'>
                            {detectionMode === 'webcam' ? 'Live Detection' : 'Upload & Detect'}
                        </h3>
                    </div>
                    
                    {detectionMode === 'webcam' ? (
                        /* Webcam Section */
                        <div className='space-y-4'>
                            <div className='relative bg-black rounded-lg overflow-hidden'>
                                <video 
                                    ref={videoRef}
                                    autoPlay 
                                    playsInline 
                                    className='w-full h-64 object-cover'
                                />
                                {!isWebcamActive && (
                                    <div className='absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50'>
                                        <p className='text-white'>Click "Start Live Detection" to begin</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className='flex space-x-4'>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={startDetection}
                                    disabled={!isWebcamActive || isDetecting}
                                    className={`flex items-center justify-center space-x-2 py-3 px-6 rounded-lg font-semibold transition-colors ${
                                        isWebcamActive && !isDetecting
                                            ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700'
                                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    {isDetecting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            <span>Detecting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className='w-5 h-5' />
                                            <span>Start Live Detection</span>
                                        </>
                                    )}
                                </motion.button>
                                
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={stopWebcam}
                                    className='py-3 px-6 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors'
                                >
                                    Stop Webcam
                                </motion.button>
                            </div>
                        </div>
                    ) : (
                        /* File Upload Section */
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            {/* File Upload Area */}
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                onClick={openFileDialog}
                                className='border-2 border-dashed border-gray-600 rounded-lg p-6 cursor-pointer hover:border-emerald-500 transition-colors'
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={detectionMode === 'image' ? 'image/*' : 'video/*'}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <div className='text-center'>
                                    <Upload className='w-12 h-12 text-gray-400 mx-auto mb-3' />
                                    <p className='text-white font-medium mb-2'>
                                        {selectedFile ? selectedFile.name : `Choose ${detectionMode === 'image' ? 'Image' : 'Video'}`}
                                    </p>
                                    <p className='text-gray-400 text-sm'>
                                        {detectionMode === 'image' ? 'Supports: JPG, PNG, WEBP' : 'Supports: MP4, AVI, MOV'}
                                    </p>
                                </div>
                            </motion.div>

                            {/* Detection Button */}
                            <div className='flex flex-col justify-center space-y-4'>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={startDetection}
                                    disabled={!selectedFile || isDetecting}
                                    className={`flex items-center justify-center space-x-2 py-3 px-6 rounded-lg font-semibold transition-colors ${
                                        selectedFile && !isDetecting
                                            ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700'
                                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    {isDetecting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            <span>Detecting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className='w-5 h-5' />
                                            <span>Start Detection</span>
                                        </>
                                    )}
                                </motion.button>

                                {selectedFile && (
                                    <div className='text-center'>
                                        <p className='text-emerald-400 text-sm'>
                                            {selectedFile.type.startsWith('image/') ? '📷 Image' : '🎥 Video'} Ready
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Annotated Image Display */}
                {annotatedImage && (
                    <motion.div 
                        className='bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700'
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h3 className='text-xl font-semibold text-emerald-400 mb-4'>Detection Result</h3>
                        <div className='rounded-lg overflow-hidden'>
                            <img 
                                src={annotatedImage} 
                                alt="Detection Result" 
                                className='w-full max-h-96 object-contain bg-black'
                            />
                        </div>
                    </motion.div>
                )}                {/* Detection Results */}
                {detectionResults && (
                    <motion.div 
                        className='bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700'
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h3 className='text-xl font-semibold text-emerald-400 mb-4'>Detection Results</h3>
                        
                        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
                            <div className='bg-gray-700 rounded-lg p-3 text-center'>
                                <p className='text-2xl font-bold text-white'>{detectionResults.total_detections}</p>
                                <p className='text-gray-400 text-sm'>Total Objects</p>
                            </div>
                            <div className='bg-gray-700 rounded-lg p-3 text-center'>
                                <p className='text-2xl font-bold text-emerald-400'>{detectionResults.detected_objects.length}</p>
                                <p className='text-gray-400 text-sm'>Object Types</p>
                            </div>
                            <div className='bg-gray-700 rounded-lg p-3 text-center'>
                                <p className='text-2xl font-bold text-blue-400'>{detectionResults.processing_time}</p>
                                <p className='text-gray-400 text-sm'>Process Time</p>
                            </div>
                            <div className='bg-gray-700 rounded-lg p-3 text-center'>
                                <p className='text-2xl font-bold text-purple-400'>AI</p>
                                <p className='text-gray-400 text-sm'>YOLOv11</p>
                            </div>
                        </div>

                        <div className='space-y-2'>
                            <h4 className='text-white font-medium mb-3'>Detected Objects:</h4>
                            {detectionResults.detected_objects.map((obj, index) => (
                                <div key={index} className='flex justify-between items-center bg-gray-700 rounded-lg p-3'>
                                    <div className='flex items-center space-x-3'>
                                        <div className='w-3 h-3 bg-emerald-500 rounded-full'></div>
                                        <span className='text-white capitalize'>{obj.class}</span>
                                    </div>
                                    <div className='flex items-center space-x-4'>
                                        <span className='text-gray-300'>Count: {obj.count}</span>
                                        <span className='text-emerald-400'>{(obj.confidence * 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Quick Stats */}
                <motion.div 
                    className='bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <h3 className='text-xl font-semibold text-white mb-4'>Detection Capabilities</h3>
                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                        <div className='text-center'>
                            <User className='w-8 h-8 text-blue-400 mx-auto mb-2' />
                            <p className='text-white font-medium'>Pedestrians</p>
                        </div>
                        <div className='text-center'>
                            <div className='w-8 h-8 bg-emerald-500 rounded mx-auto mb-2'></div>
                            <p className='text-white font-medium'>Vehicles</p>
                        </div>
                        <div className='text-center'>
                            <div className='w-8 h-8 bg-purple-500 rounded mx-auto mb-2'></div>
                            <p className='text-white font-medium'>Bicycles</p>
                        </div>
                        <div className='text-center'>
                            <div className='w-8 h-8 bg-yellow-500 rounded mx-auto mb-2'></div>
                            <p className='text-white font-medium'>Trucks</p>
                        </div>
                    </div>
                </motion.div>
            </div>

        </motion.div>
    )
}

export default DashboardPage

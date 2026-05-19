import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { formatDate } from '../utils/date';
import { User, LogOut, Upload, Camera, Play, Image, FileVideo, Video, Eye, History } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const DETECTION_API_URL = 'http://localhost:5001';

const UserDetectionPage = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
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
    const canvasRef = useRef(null);
    const detectionIntervalRef = useRef(null);
    const [videoProgress, setVideoProgress] = useState(0);
    const [isProcessingVideo, setIsProcessingVideo] = useState(false);
    const [countingLinePosition, setCountingLinePosition] = useState(50);
    const [videoPreview, setVideoPreview] = useState(null);
    const [isDraggingLine, setIsDraggingLine] = useState(false);
    const videoPreviewRef = useRef(null);
    const [currentSessionId, setCurrentSessionId] = useState(null);

    const handleLogout = () => {
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
            
            if (file.type.startsWith('image/')) {
                setDetectionMode('image');
                setVideoPreview(null);
            } else if (file.type.startsWith('video/')) {
                setDetectionMode('video');
                const videoURL = URL.createObjectURL(file);
                setVideoPreview(videoURL);
                setCountingLinePosition(50);
            }
        }
    };

    const handleLineMouseMove = async (e) => {
        if (!isDraggingLine || !videoPreviewRef.current) return;
        
        const rect = videoPreviewRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const percentage = Math.max(10, Math.min(90, (y / rect.height) * 100));
        setCountingLinePosition(Math.round(percentage));
    };

    const handleLineMouseUp = () => {
        setIsDraggingLine(false);
        // Remove cursor style override
        document.body.style.cursor = '';
    };

    const handleLineMouseDown = (e) => {
        e.preventDefault();
        setIsDraggingLine(true);
        // Set cursor style for whole document while dragging
        document.body.style.cursor = 'ns-resize';
    };

    const handleDetect = async () => {
        if (!selectedFile && detectionMode !== 'webcam') {
            alert('Please select a file first');
            return;
        }

        setIsDetecting(true);
        setDetectionResults(null);
        setAnnotatedImage(null);

        try {
            if (detectionMode === 'image') {
                await detectImage();
            } else if (detectionMode === 'video') {
                await detectVideo();
            }
        } catch (error) {
            console.error('Detection error:', error);
            alert('Detection failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsDetecting(false);
        }
    };

    const detectImage = async () => {
        const formData = new FormData();
        formData.append('image', selectedFile);

        const response = await axios.post(`${DETECTION_API_URL}/detect/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            withCredentials: false
        });

        if (response.data.success) {
            setDetectionResults(response.data);
            if (response.data.annotated_image) {
                setAnnotatedImage(`data:image/jpeg;base64,${response.data.annotated_image}`);
            }
        }
    };

    const detectVideo = async () => {
        setIsProcessingVideo(true);
        const formData = new FormData();
        formData.append('video', selectedFile);
        formData.append('counting_line_position', countingLinePosition / 100);
        if (user && user._id) {
            formData.append('user_id', user._id);
        }

        const response = await axios.post(`${DETECTION_API_URL}/detect/video`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            withCredentials: false,
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setVideoProgress(percentCompleted);
            }
        });

        if (response.data.success) {
            setCurrentSessionId(response.data.session_id);
            
            const pollInterval = setInterval(async () => {
                try {
                    const statusResponse = await axios.get(
                        `${DETECTION_API_URL}/detect/video/status/${response.data.session_id}`,
                        { withCredentials: false }
                    );

                    // Always update progress for live feedback
                    if (statusResponse.data.progress !== undefined) {
                        setVideoProgress(statusResponse.data.progress);
                    }

                    if (statusResponse.data.status === 'completed') {
                        clearInterval(pollInterval);
                        setDetectionResults(statusResponse.data);
                        setIsProcessingVideo(false);
                        setVideoProgress(100);
                        
                        if (statusResponse.data.annotated_video) {
                            const videoBlob = await fetch(`data:video/mp4;base64,${statusResponse.data.annotated_video}`)
                                .then(res => res.blob());
                            const videoUrl = URL.createObjectURL(videoBlob);
                            setAnnotatedImage(videoUrl);
                        }
                    } else if (statusResponse.data.status === 'failed') {
                        clearInterval(pollInterval);
                        setIsProcessingVideo(false);
                        alert('Video processing failed: ' + (statusResponse.data.error || 'Unknown error'));
                    }
                } catch (error) {
                    console.error('Error polling status:', error);
                }
            }, 1000); // Poll every 1 second for better live feedback
        }
    };

    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setIsWebcamActive(true);
                setDetectionMode('webcam');
                startWebcamDetection();
            }
        } catch (error) {
            console.error('Error accessing webcam:', error);
            alert('Could not access webcam. Please check permissions.');
        }
    };

    const stopWebcam = () => {
        if (videoRef.current?.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
        }
        
        setIsWebcamActive(false);
        setDetectionResults(null);
    };

    const captureAndDetectFrame = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            
            const formData = new FormData();
            formData.append('image', blob, 'frame.jpg');
            
            try {
                const response = await axios.post(`${DETECTION_API_URL}/detect/image`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    withCredentials: false
                });
                
                if (response.data.success) {
                    setDetectionResults(response.data);
                }
            } catch (error) {
                console.error('Frame detection error:', error);
            }
        }, 'image/jpeg');
    };

    const startWebcamDetection = () => {
        detectionIntervalRef.current = setInterval(() => {
            captureAndDetectFrame();
        }, 1000);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDraggingLine) {
            document.addEventListener('mousemove', handleLineMouseMove);
            document.addEventListener('mouseup', handleLineMouseUp);
        }

        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('mousemove', handleLineMouseMove);
            document.removeEventListener('mouseup', handleLineMouseUp);
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, [isDropdownOpen, isDraggingLine]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className='max-w-7xl w-full mx-auto mt-10 p-8 bg-gray-900 bg-opacity-80 backdrop-filter backdrop-blur-lg rounded-xl shadow-2xl border border-gray-800'
        >
            {/* Header */}
            <div className='flex justify-between items-center mb-6'>
                <div>
                    <h2 className='text-3xl font-bold mb-2 bg-gradient-to-r from-green-400 to-emerald-600 text-transparent bg-clip-text'>
                        Object Detection
                    </h2>
                    <p className='text-gray-400'>Upload images or videos for detection</p>
                </div>
                
                <div className='flex items-center gap-3'>
                    <button
                        onClick={() => navigate('/detection/history')}
                        className='flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors'
                    >
                        <History size={20} />
                        <span>View History</span>
                    </button>
                    
                    <div className='relative' ref={dropdownRef}>
                        <button
                            onClick={toggleDropdown}
                            className='flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors'
                        >
                            <User size={20} />
                            <span>{user.name}</span>
                        </button>
                        
                        {isDropdownOpen && (
                            <div className='absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50'>
                                <div className='p-3 border-b border-gray-700'>
                                    <p className='text-sm text-gray-400'>Role</p>
                                    <p className='text-white font-medium capitalize'>{user.role}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className='w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 flex items-center space-x-2'
                                >
                                    <LogOut size={18} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* User Info Card */}
            <motion.div
                className='bg-gray-800 bg-opacity-50 rounded-lg p-6 mb-6 border border-gray-700'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <div>
                        <p className='text-gray-400 text-sm'>Email</p>
                        <p className='text-white font-medium'>{user.email}</p>
                    </div>
                    <div>
                        <p className='text-gray-400 text-sm'>Gender</p>
                        <p className='text-white font-medium'>{user.gender}</p>
                    </div>
                    <div>
                        <p className='text-gray-400 text-sm'>Last Login</p>
                        <p className='text-white font-medium'>{formatDate(user.lastLogin)}</p>
                    </div>
                </div>
            </motion.div>

            {/* Detection Mode Selection */}
            <div className='mb-6'>
                <h3 className='text-xl font-semibold text-white mb-4'>Select Detection Mode</h3>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <button
                        onClick={() => {
                            setDetectionMode('image');
                            setSelectedFile(null);
                            setDetectionResults(null);
                            setAnnotatedImage(null);
                            stopWebcam();
                        }}
                        className={`p-6 rounded-lg border-2 transition-all ${
                            detectionMode === 'image'
                                ? 'border-green-500 bg-green-500 bg-opacity-10'
                                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        }`}
                    >
                        <Image className='mx-auto mb-3' size={40} color={detectionMode === 'image' ? '#22c55e' : '#9ca3af'} />
                        <h4 className='text-lg font-semibold text-white mb-2'>Image Detection</h4>
                        <p className='text-gray-400 text-sm'>Upload and detect objects in images</p>
                    </button>

                    <button
                        onClick={() => {
                            setDetectionMode('video');
                            setSelectedFile(null);
                            setDetectionResults(null);
                            setAnnotatedImage(null);
                            stopWebcam();
                        }}
                        className={`p-6 rounded-lg border-2 transition-all ${
                            detectionMode === 'video'
                                ? 'border-green-500 bg-green-500 bg-opacity-10'
                                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        }`}
                    >
                        <FileVideo className='mx-auto mb-3' size={40} color={detectionMode === 'video' ? '#22c55e' : '#9ca3af'} />
                        <h4 className='text-lg font-semibold text-white mb-2'>Video Detection</h4>
                        <p className='text-gray-400 text-sm'>Process videos with object counting</p>
                    </button>

                    <button
                        onClick={() => {
                            if (isWebcamActive) {
                                stopWebcam();
                            } else {
                                startWebcam();
                            }
                        }}
                        className={`p-6 rounded-lg border-2 transition-all ${
                            detectionMode === 'webcam'
                                ? 'border-green-500 bg-green-500 bg-opacity-10'
                                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        }`}
                    >
                        <Camera className='mx-auto mb-3' size={40} color={detectionMode === 'webcam' ? '#22c55e' : '#9ca3af'} />
                        <h4 className='text-lg font-semibold text-white mb-2'>
                            {isWebcamActive ? 'Stop Webcam' : 'Live Webcam'}
                        </h4>
                        <p className='text-gray-400 text-sm'>Real-time detection from camera</p>
                    </button>
                </div>
            </div>

            {/* File Upload Section */}
            {(detectionMode === 'image' || detectionMode === 'video') && (
                <motion.div
                    className='mb-6'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className='bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-700 hover:border-green-500 transition-colors'>
                        <input
                            type='file'
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept={detectionMode === 'image' ? 'image/*' : 'video/*'}
                            className='hidden'
                        />
                        
                        <div className='text-center'>
                            <Upload className='mx-auto mb-4' size={48} color='#22c55e' />
                            <p className='text-white text-lg mb-2'>
                                {selectedFile ? selectedFile.name : `Choose ${detectionMode}`}
                            </p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className='bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-2 px-6 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all'
                            >
                                Browse Files
                            </button>
                        </div>
                    </div>

                    {/* Video Preview with Counting Line */}
                    {detectionMode === 'video' && videoPreview && (
                        <div className='mt-4 relative'>
                            <div className='flex items-center justify-between mb-2'>
                                <h4 className='text-white text-lg'>📹 Video Preview - Drag the yellow line to set counting position</h4>
                                <div className='flex items-center space-x-2'>
                                    {/* Preset positions */}
                                    <button
                                        onClick={() => setCountingLinePosition(25)}
                                        className='bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded'
                                    >
                                        Top (25%)
                                    </button>
                                    <button
                                        onClick={() => setCountingLinePosition(50)}
                                        className='bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded'
                                    >
                                        Middle (50%)
                                    </button>
                                    <button
                                        onClick={() => setCountingLinePosition(75)}
                                        className='bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded'
                                    >
                                        Bottom (75%)
                                    </button>
                                    <div className='bg-yellow-500 text-black px-3 py-1 rounded-lg font-bold'>
                                        {Math.round(countingLinePosition)}%
                                    </div>
                                </div>
                            </div>
                            <div 
                                ref={videoPreviewRef}
                                className='relative bg-black rounded-lg overflow-hidden border-2 border-gray-700'
                                style={{ maxHeight: '400px' }}
                            >
                                <video
                                    src={videoPreview}
                                    className='w-full'
                                    controls
                                    style={{ maxHeight: '400px' }}
                                />
                                {/* Enhanced Counting Line */}
                                <div
                                    className='absolute left-0 right-0 h-1 bg-yellow-400 cursor-ns-resize z-10 shadow-lg transition-all hover:h-2'
                                    style={{ 
                                        top: `${countingLinePosition}%`,
                                        boxShadow: '0 0 10px rgba(255, 255, 0, 0.8)',
                                        borderTop: '2px solid #fbbf24',
                                        borderBottom: '2px solid #fbbf24'
                                    }}
                                    onMouseDown={handleLineMouseDown}
                                >
                                    {/* Line Label */}
                                    <div className='absolute left-4 -top-8 bg-yellow-400 text-black text-sm font-bold px-3 py-1 rounded shadow-lg flex items-center space-x-2'>
                                        <span>⬍</span>
                                        <span>COUNTING LINE - Drag to Move</span>
                                        <span>⬍</span>
                                    </div>
                                    
                                    {/* Arrow indicators on line */}
                                    <div className='absolute left-1/4 -top-6 text-yellow-400 text-2xl'>↓</div>
                                    <div className='absolute left-1/2 -top-6 text-yellow-400 text-2xl'>↓</div>
                                    <div className='absolute left-3/4 -top-6 text-yellow-400 text-2xl'>↓</div>
                                    
                                    {/* Grab handle in center */}
                                    <div className='absolute left-1/2 -translate-x-1/2 -top-3 w-8 h-8 bg-yellow-400 rounded-full border-2 border-black flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg transition-transform hover:scale-110'>
                                        <span className='text-black text-xs font-bold'>⬍</span>
                                    </div>
                                </div>
                                
                                {/* Instructions overlay */}
                                <div className='absolute top-4 left-4 bg-black bg-opacity-80 text-white text-xs px-3 py-2 rounded border border-yellow-400'>
                                    <div className='font-bold mb-1 text-yellow-400'>ℹ️ Object Counting Line:</div>
                                    <div>✓ Objects crossing this line will be counted</div>
                                    <div>✓ Drag the line up or down to adjust position</div>
                                    <div>✓ Each object is counted only once per crossing</div>
                                    <div>✓ Works bidirectionally (up→down or down→up)</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedFile && !isProcessingVideo && (
                        <div className='mt-4 text-center'>
                            <button
                                onClick={handleDetect}
                                disabled={isDetecting}
                                className='bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-8 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto space-x-2'
                            >
                                {isDetecting ? (
                                    <>
                                        <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white'></div>
                                        <span>Detecting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Eye size={20} />
                                        <span>Start Detection</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Video Processing Progress */}
                    {isProcessingVideo && (
                        <div className='mt-4 bg-gray-800 rounded-lg p-4 border-2 border-green-500'>
                            <div className='flex items-center justify-between mb-3'>
                                <div className='flex items-center space-x-2'>
                                    <div className='animate-pulse h-3 w-3 bg-green-500 rounded-full'></div>
                                    <span className='text-white font-semibold'>Processing Video...</span>
                                </div>
                                <span className='text-green-400 font-bold text-lg'>{videoProgress}%</span>
                            </div>
                            <div className='w-full bg-gray-700 rounded-full h-3 overflow-hidden'>
                                <div
                                    className='bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-300 relative'
                                    style={{ width: `${videoProgress}%` }}
                                >
                                    <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse'></div>
                                </div>
                            </div>
                            <p className='text-gray-400 text-sm mt-2'>Objects are being detected and counted as they cross the line...</p>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Webcam Section */}
            {detectionMode === 'webcam' && isWebcamActive && (
                <motion.div
                    className='mb-6'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className='bg-gray-800 rounded-lg p-6'>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className='w-full rounded-lg mb-4'
                        />
                        <canvas ref={canvasRef} className='hidden' />
                    </div>
                </motion.div>
            )}

            {/* Detection Results */}
            {detectionResults && (
                <motion.div
                    className='bg-gray-800 rounded-lg p-6 border border-gray-700'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h3 className='text-2xl font-semibold text-white mb-4'>Detection Results</h3>
                    
                    {/* Annotated Image/Video */}
                    {annotatedImage && (
                        <div className='mb-6'>
                            <h4 className='text-lg text-white mb-2'>Annotated Result</h4>
                            {detectionMode === 'video' && (
                                <div className='mb-2 bg-yellow-500 bg-opacity-20 border border-yellow-500 rounded p-2 text-sm text-yellow-200'>
                                    <strong>ℹ️ Video Counting:</strong> The yellow line in the video shows where objects were counted. 
                                    Objects are counted only when they cross this line. Counting line was set at {Math.round(countingLinePosition)}% height.
                                </div>
                            )}
                            {detectionMode === 'video' ? (
                                <video src={annotatedImage} controls className='w-full rounded-lg' />
                            ) : (
                                <img src={annotatedImage} alt='Detection Result' className='w-full rounded-lg' />
                            )}
                        </div>
                    )}

                    {/* Video Detection Report Button */}
                    {detectionMode === 'video' && detectionResults.report && (
                        <div className='mb-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 border-2 border-blue-400'>
                            <div className='flex items-center justify-between'>
                                <div>
                                    <h4 className='text-xl font-bold text-white mb-2'>📊 Detailed Detection Report Available</h4>
                                    <p className='text-blue-100 text-sm mb-3'>
                                        View comprehensive analysis with crossing timeline, object breakdown, and statistics
                                    </p>
                                    <div className='flex flex-wrap gap-4 text-sm text-blue-100'>
                                        <div className='flex items-center'>
                                            <span className='font-semibold mr-2'>Total Crossings:</span>
                                            <span className='bg-white bg-opacity-20 px-2 py-1 rounded'>{detectionResults.report.total_crossings || 0}</span>
                                        </div>
                                        <div className='flex items-center'>
                                            <span className='font-semibold mr-2'>Object Types:</span>
                                            <span className='bg-white bg-opacity-20 px-2 py-1 rounded'>
                                                {Object.keys(detectionResults.report.objects_passed || {}).length}
                                            </span>
                                        </div>
                                        {detectionResults.report.video_duration && (
                                            <div className='flex items-center'>
                                                <span className='font-semibold mr-2'>Video Duration:</span>
                                                <span className='bg-white bg-opacity-20 px-2 py-1 rounded'>
                                                    {detectionResults.report.video_duration.toFixed(1)}s
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => window.open(`http://localhost:5001${detectionResults.report.report_url}`, '_blank')}
                                    className='bg-white text-blue-600 font-bold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors shadow-lg flex items-center space-x-2'
                                >
                                    <span>📄</span>
                                    <span>View Report</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Detection Statistics */}
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
                        <div className='bg-gray-700 rounded-lg p-4'>
                            <p className='text-gray-400 text-sm'>Total Objects</p>
                            <p className='text-2xl font-bold text-white'>{detectionResults.total_detections || 0}</p>
                        </div>
                        {detectionMode === 'video' && detectionResults.total_crossings !== undefined && (
                            <div className='bg-gray-700 rounded-lg p-4'>
                                <p className='text-gray-400 text-sm'>Line Crossings</p>
                                <p className='text-2xl font-bold text-green-400'>{detectionResults.total_crossings}</p>
                            </div>
                        )}
                        <div className='bg-gray-700 rounded-lg p-4'>
                            <p className='text-gray-400 text-sm'>Processing Time</p>
                            <p className='text-2xl font-bold text-white'>
                                {detectionResults.inference_time ? `${detectionResults.inference_time.toFixed(2)}s` : 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* Detected Objects */}
                    {detectionResults.detections && detectionResults.detections.length > 0 && (
                        <div>
                            <h4 className='text-lg text-white mb-3'>Detected Objects</h4>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                {detectionResults.detections.map((detection, index) => (
                                    <div key={index} className='bg-gray-700 rounded-lg p-3'>
                                        <div className='flex justify-between items-center'>
                                            <span className='text-white font-medium capitalize'>{detection.class}</span>
                                            <span className='text-green-400'>{(detection.confidence * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Object Summary */}
                    {detectionResults.object_summary && Object.keys(detectionResults.object_summary).length > 0 && (
                        <div className='mt-6'>
                            <h4 className='text-lg text-white mb-3'>
                                {detectionMode === 'video' ? '📊 Objects Counted (Crossed the Line)' : 'Object Count Summary'}
                            </h4>
                            {detectionMode === 'video' && (
                                <div className='mb-3 text-sm text-gray-400'>
                                    These counts represent unique objects that crossed the counting line during video processing.
                                </div>
                            )}
                            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                                {Object.entries(detectionResults.object_summary).map(([className, count]) => (
                                    <div key={className} className='bg-gradient-to-br from-green-600 to-emerald-700 rounded-lg p-4 text-center shadow-lg border border-green-500'>
                                        <p className='text-green-100 text-sm capitalize font-semibold'>{className}</p>
                                        <p className='text-4xl font-bold text-white mt-1'>{count}</p>
                                        {detectionMode === 'video' && (
                                            <p className='text-green-200 text-xs mt-1'>✓ Crossed line</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
};

export default UserDetectionPage;

import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { formatDate } from '../utils/date';
import { User, LogOut, Upload, Camera, Play, Image, FileVideo, Zap, Video, Eye, Shield } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const DETECTION_API_URL = 'http://localhost:5001';

const DashboardPage = () => {

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
    const [countingLinePosition, setCountingLinePosition] = useState(50); // 50% = center
    const [videoPreview, setVideoPreview] = useState(null);
    const [isDraggingLine, setIsDraggingLine] = useState(false);
    const videoPreviewRef = useRef(null);
    const [currentSessionId, setCurrentSessionId] = useState(null);

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
                setVideoPreview(null);
            } else if (file.type.startsWith('video/')) {
                setDetectionMode('video');
                // Create video preview
                const videoURL = URL.createObjectURL(file);
                setVideoPreview(videoURL);
                setCountingLinePosition(50); // Reset line to center
            }
        }
    };

    const handleLineMouseDown = (e) => {
        e.preventDefault();
        setIsDraggingLine(true);
    };

    const handleLineMouseMove = async (e) => {
        if (!isDraggingLine || !videoPreviewRef.current) return;
        
        const rect = videoPreviewRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const percentage = Math.max(10, Math.min(90, (y / rect.height) * 100));
        setCountingLinePosition(percentage);
        
        // Update line position in backend if video is processing
        if (currentSessionId && isProcessingVideo) {
            try {
                await axios.post(`${DETECTION_API_URL}/detect/video/update-line`, {
                    session_id: currentSessionId,
                    line_position: percentage / 100
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: false
                });
            } catch (error) {
                console.error('Error updating line position:', error);
            }
        }
    };

    const handleLineMouseUp = () => {
        setIsDraggingLine(false);
    };

    const captureAndDetectFrame = async () => {
        if (!videoRef.current || !canvasRef.current) {
            console.log('Video or canvas ref not available');
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Check if video is ready
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.log('Video not ready yet, skipping frame...');
            return;
        }
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        // Convert canvas to base64
        const frameData = canvas.toDataURL('image/jpeg', 0.8);
        
        console.log(`Sending frame for detection (${canvas.width}x${canvas.height})...`);
        
        try {
            const response = await axios.post(`${DETECTION_API_URL}/detect/webcam/frame`, 
                { frame: frameData },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000,
                    withCredentials: false
                }
            );

            console.log('Detection response:', response.data);

            if (response.data.status === 'success') {
                setAnnotatedImage(response.data.annotated_frame);
                setDetectionResults({
                    detected_objects: response.data.detections || [],
                    total_detections: response.data.total_objects || 0,
                    processing_time: 'Live',
                    message: 'Live detection active'
                });
                console.log('Detections:', response.data.detections);
            }
        } catch (error) {
            console.error('Frame detection error:', error);
            if (error.response) {
                console.error('Error response:', error.response.data);
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
                
                if (response.data.success) {
                    setDetectionResults({
                        detected_objects: response.data.detected_objects || [],
                        total_detections: response.data.detected_objects?.length || 0,
                        processing_time: 'N/A',
                        message: 'Detection complete'
                    });
                }
            } else if (detectionMode === 'video') {
                formData.append('video', selectedFile);
                formData.append('line_position', (countingLinePosition / 100).toString()); // Convert % to 0.0-1.0
                console.log('Uploading video for detection...');
                console.log('Counting line position:', countingLinePosition + '%');
                
                // Upload video first
                const uploadResponse = await axios.post(`${DETECTION_API_URL}/detect/video/upload`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 30000,
                    withCredentials: false
                });
                
                if (uploadResponse.data.status === 'success') {
                    const sessionId = uploadResponse.data.session_id;
                    const totalFrames = uploadResponse.data.total_frames;
                    console.log(`Video uploaded. Session: ${sessionId}, Total frames: ${totalFrames}`);
                    
                    setCurrentSessionId(sessionId);
                    setIsProcessingVideo(true);
                    setVideoProgress(0);
                    
                    // Process frames one by one
                    const allDetections = {};
                    
                    const processNextFrame = async () => {
                        try {
                            const frameResponse = await axios.post(
                                `${DETECTION_API_URL}/detect/video/process-frame`,
                                { session_id: sessionId },
                                {
                                    headers: { 'Content-Type': 'application/json' },
                                    timeout: 15000,
                                    withCredentials: false
                                }
                            );
                            
                            if (frameResponse.data.status === 'completed') {
                                console.log('Video processing completed!');
                                console.log('Saved video:', frameResponse.data.saved_video);
                                console.log('Final counts:', frameResponse.data.final_counts);
                                
                                // Convert final_counts object to array format
                                let finalCountsArray = [];
                                let totalCount = 0;
                                
                                if (frameResponse.data.final_counts) {
                                    if (Array.isArray(frameResponse.data.final_counts)) {
                                        finalCountsArray = frameResponse.data.final_counts;
                                        totalCount = finalCountsArray.reduce((sum, d) => sum + d.count, 0);
                                    } else {
                                        // It's an object like {car: 3, person: 5}
                                        finalCountsArray = Object.entries(frameResponse.data.final_counts).map(([className, count]) => ({
                                            class: className,
                                            count: count,
                                            confidence: 1.0
                                        }));
                                        totalCount = Object.values(frameResponse.data.final_counts).reduce((sum, count) => sum + count, 0);
                                    }
                                }
                                
                                setDetectionResults({
                                    detected_objects: finalCountsArray,
                                    total_detections: totalCount,
                                    processing_time: 'Complete',
                                    message: `✅ ${totalCount} unique objects crossed the line | Video saved`
                                });
                                
                                setIsProcessingVideo(false);
                                setVideoProgress(100);
                                setIsDetecting(false);
                                setCurrentSessionId(null);
                                
                                const countSummary = finalCountsArray.map(d => `${d.class}: ${d.count}`).join('\n');
                                alert(`✅ Video processing complete!\n\n📊 Objects That Crossed Line:\n${countSummary || 'None'}\n\n📁 Saved to: ${frameResponse.data.saved_video}`);
                                return;
                            }
                            
                            if (frameResponse.data.status === 'success') {
                                // Update annotated frame
                                setAnnotatedImage(frameResponse.data.annotated_frame);
                                
                                // Use crossed_counts from backend (objects that crossed the line)
                                let crossedCountsArray = [];
                                let totalCrossed = 0;
                                
                                if (frameResponse.data.crossed_counts) {
                                    if (typeof frameResponse.data.crossed_counts === 'object' && !Array.isArray(frameResponse.data.crossed_counts)) {
                                        // It's an object like {car: 3, person: 5}
                                        crossedCountsArray = Object.entries(frameResponse.data.crossed_counts).map(([className, count]) => ({
                                            class: className,
                                            count: count,
                                            confidence: 1.0
                                        }));
                                        totalCrossed = Object.values(frameResponse.data.crossed_counts).reduce((sum, count) => sum + count, 0);
                                    } else if (Array.isArray(frameResponse.data.crossed_counts)) {
                                        crossedCountsArray = frameResponse.data.crossed_counts;
                                        totalCrossed = crossedCountsArray.reduce((sum, d) => sum + d.count, 0);
                                    }
                                }
                                
                                setDetectionResults({
                                    detected_objects: crossedCountsArray,
                                    total_detections: totalCrossed,
                                    processing_time: 'Processing...',
                                    message: `Frame ${frameResponse.data.frame_number}/${totalFrames} | 🎯 ${totalCrossed} objects crossed`
                                });
                                
                                // Update progress
                                setVideoProgress(frameResponse.data.progress);
                                
                                // Process next frame with small delay
                                setTimeout(processNextFrame, 50);
                            }
                        } catch (error) {
                            console.error('Error processing frame:', error);
                            setIsProcessingVideo(false);
                            setIsDetecting(false);
                            alert('Error processing video: ' + error.message);
                        }
                    };
                    
                    // Start processing
                    processNextFrame();
                    return; // Don't set isDetecting to false
                }
            } else if (detectionMode === 'webcam') {
                console.log('Starting live webcam detection...');
                
                // Wait for video to be ready before starting detection
                if (videoRef.current && videoRef.current.videoWidth > 0) {
                    console.log('Video ready, starting detection interval');
                    // Start continuous detection loop
                    detectionIntervalRef.current = setInterval(captureAndDetectFrame, 1500); // Detect every 1.5 seconds
                    
                    // Also capture first frame immediately
                    setTimeout(captureAndDetectFrame, 500);
                } else {
                    console.log('Waiting for video to be ready...');
                    // Wait for video to load and then start
                    const checkVideo = setInterval(() => {
                        if (videoRef.current && videoRef.current.videoWidth > 0) {
                            clearInterval(checkVideo);
                            console.log('Video ready, starting detection interval');
                            detectionIntervalRef.current = setInterval(captureAndDetectFrame, 1500);
                            setTimeout(captureAndDetectFrame, 500);
                        }
                    }, 100);
                }
                return; // Don't set isDetecting to false
            }

            console.log('Detection response:', response?.data);

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
            if (detectionMode !== 'webcam') {
                setIsDetecting(false);
            }
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
                setIsWebcamActive(true);
            }
        } catch (error) {
            console.error('Webcam access denied:', error);
            alert('Please allow webcam access for live detection.');
        }
    };

    const stopWebcam = () => {
        // Stop detection interval
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }
        
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsWebcamActive(false);
        setIsDetecting(false);

    // Handle line dragging
    useEffect(() => {
        if (isDraggingLine) {
            document.addEventListener('mousemove', handleLineMouseMove);
            document.addEventListener('mouseup', handleLineMouseUp);
        } else {
            document.removeEventListener('mousemove', handleLineMouseMove);
            document.removeEventListener('mouseup', handleLineMouseUp);
        }
        
        return () => {
            document.removeEventListener('mousemove', handleLineMouseMove);
            document.removeEventListener('mouseup', handleLineMouseUp);
        };
    }, [isDraggingLine]);

    // Cleanup video preview URL
    useEffect(() => {
        return () => {
            if (videoPreview) {
                URL.revokeObjectURL(videoPreview);
            }
        };
    }, [videoPreview]);
    
        setDetectionMode('image');
        setAnnotatedImage(null);
        setDetectionResults(null);
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
                                <p className='text-gray-400 text-sm mb-2'>
                                    {user?.email || 'user@example.com'}
                                </p>
                                
                                {/* Role Badge */}
                                {user?.role === 'admin' && (
                                    <div className='flex items-center space-x-1 bg-emerald-500 bg-opacity-20 text-emerald-400 px-2 py-1 rounded text-xs font-semibold mb-4'>
                                        <Shield className='w-3 h-3' />
                                        <span>ADMIN</span>
                                    </div>
                                )}
                                
                                <div className='space-y-2'>
                                    {/* Admin Panel Button */}
                                    {user?.role === 'admin' && (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => navigate('/admin')}
                                            className='w-full flex items-center justify-center space-x-2 py-2 px-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-green-700 transition-colors'
                                        >
                                            <Shield className='w-4 h-4' />
                                            <span>Admin Panel</span>
                                        </motion.button>
                                    )}
                                    
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
                                <canvas ref={canvasRef} style={{ display: 'none' }} />
                                {!isWebcamActive && (
                                    <div className='absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50'>
                                        <p className='text-white'>Click "Start Live Detection" to begin</p>
                                    </div>
                                )}
                                {isDetecting && (
                                    <div className='absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center space-x-2'>
                                        <div className='w-2 h-2 bg-white rounded-full animate-pulse'></div>
                                        <span className='text-sm font-semibold'>LIVE</span>
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
                        <div className='space-y-4'>
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

                            {/* Video Preview with Interactive Line */}
                            {videoPreview && detectionMode === 'video' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className='bg-gray-900 rounded-lg overflow-hidden border border-gray-700'
                                >
                                    <div className='relative' ref={videoPreviewRef}>
                                        <video 
                                            src={videoPreview}
                                            className='w-full max-h-[600px] min-h-[400px] object-contain bg-black'
                                            muted
                                            autoPlay
                                            loop
                                        />
                                        {/* Interactive Counting Line */}
                                        <div 
                                            className='absolute w-full cursor-ns-resize hover:bg-yellow-400 transition-colors'
                                            style={{ 
                                                top: `${countingLinePosition}%`,
                                                height: '4px',
                                                backgroundColor: isDraggingLine ? '#facc15' : '#eab308',
                                                boxShadow: '0 0 10px rgba(234, 179, 8, 0.5)',
                                                transform: 'translateY(-50%)'
                                            }}
                                            onMouseDown={handleLineMouseDown}
                                        >
                                            <div className='absolute -top-6 left-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold'>
                                                📍 COUNTING LINE - {countingLinePosition.toFixed(0)}%
                                            </div>
                                        </div>
                                    </div>
                                    <div className='p-3 bg-gray-800 border-t border-gray-700'>
                                        <p className='text-sm text-gray-300 text-center'>
                                            {isDraggingLine ? (
                                                <span className='text-yellow-400 font-semibold'>✋ Adjusting line... {countingLinePosition.toFixed(0)}%</span>
                                            ) : (
                                                <span>🖱️ Drag the yellow line to set counting position {isProcessingVideo && '(Can adjust during processing!)'}</span>
                                            )}
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Detection Controls */}
                            <div className={`flex flex-col space-y-4 ${videoPreview ? 'w-full' : ''}`}>
                                <div className='flex gap-4'>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={startDetection}
                                        disabled={!selectedFile || isDetecting}
                                        className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-lg font-semibold transition-colors ${
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
                                    
                                    {videoPreview && (
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                setSelectedFile(null);
                                                setVideoPreview(null);
                                                setAnnotatedImage(null);
                                                setDetectionResults(null);
                                            }}
                                            className='py-3 px-6 rounded-lg font-semibold bg-gray-600 text-white hover:bg-gray-700 transition-colors'
                                        >
                                            Change Video
                                        </motion.button>
                                    )}
                                </div>

                                {selectedFile && (
                                    <div className='text-center space-y-2'>
                                        <p className='text-emerald-400 text-sm'>
                                            {selectedFile.type.startsWith('image/') ? '📷 Image' : '🎥 Video'} Ready
                                        </p>
                                        {isProcessingVideo && (
                                            <div className='space-y-1'>
                                                <div className='w-full bg-gray-700 rounded-full h-2'>
                                                    <div 
                                                        className='bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full transition-all duration-300'
                                                        style={{ width: `${videoProgress}%` }}
                                                    ></div>
                                                </div>
                                                <p className='text-xs text-gray-400'>{videoProgress.toFixed(1)}% Complete</p>
                                            </div>
                                        )}
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

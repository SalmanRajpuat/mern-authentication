import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { Upload, Trash2, CheckCircle, XCircle, Loader, Database, Plus, Shield, User, LogOut } from 'lucide-react';
import axios from 'axios';
import ImageAnnotator from '../components/ImageAnnotator';

const API_URL = import.meta.env.MODE === "development" ? "http://localhost:5000/api" : "/api";

const AdminPanel = () => {
    const { user, logout } = useAuthStore();
    const [customObjects, setCustomObjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isTraining, setIsTraining] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showAnnotator, setShowAnnotator] = useState(false);
    const dropdownRef = useRef(null);
    
    // Form state
    const [objectType, setObjectType] = useState('person'); // 'person' or 'object'
    const [objectName, setObjectName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedImages, setSelectedImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [annotations, setAnnotations] = useState(null);

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchCustomObjects();
        }

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [user, isDropdownOpen]);

    const fetchCustomObjects = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/objects`, {
                withCredentials: true
            });
            if (response.data.success) {
                setCustomObjects(response.data.objects);
            }
        } catch (error) {
            console.error('Error fetching custom objects:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
        
        if (files.length === 0) {
            alert('No valid image files found. Please select JPG, PNG, or other image formats.');
            return;
        }

        if (files.length + selectedImages.length > 10000) {
            alert('Maximum 10,000 images allowed');
            return;
        }

        setSelectedImages(prev => [...prev, ...files]);

        // Create previews (limit to first 100 for performance)
        const previewFiles = files.slice(0, Math.min(100, files.length));
        previewFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result]);
            };
            reader.readAsDataURL(file);
        });

        if (files.length > 100) {
            alert(`Loaded ${files.length} images. Showing preview of first 100 images.`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const minImages = objectType === 'person' ? 20 : 5;
        if (selectedImages.length < minImages) {
            alert(`Please upload at least ${minImages} training images for ${objectType === 'person' ? 'face recognition' : 'object detection'}`);
            return;
        }

        if (selectedImages.length > 10000) {
            alert('Maximum 10,000 images allowed');
            return;
        }

        // For custom objects, show annotator first
        if (objectType === 'object') {
            setShowAnnotator(true);
            return;
        }

        // For persons, proceed directly (no annotation needed for face recognition)
        await submitTraining(null);
    };

    const handleAnnotationComplete = (yoloAnnotations) => {
        setAnnotations(yoloAnnotations);
        setShowAnnotator(false);
        
        // Automatically submit after annotations are complete
        submitTraining(yoloAnnotations);
    };

    const submitTraining = async (yoloAnnotations) => {
        setIsTraining(true);

        try {
            const formData = new FormData();
            formData.append('name', objectName.toLowerCase().trim());
            formData.append('displayName', displayName.trim());
            formData.append('description', description);
            formData.append('objectType', objectType); // 'person' or 'object'
            
            if (yoloAnnotations) {
                formData.append('annotations', JSON.stringify(yoloAnnotations));
            }
            
            selectedImages.forEach(image => {
                formData.append('images', image);
            });

            const response = await axios.post(`${API_URL}/admin/objects/add`, formData, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 1800000, // 30 minutes for large batches
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    console.log(`Upload Progress: ${percentCompleted}%`);
                }
            });

            if (response.data.success) {
                alert('✅ Custom object added and trained successfully!');
                setShowAddForm(false);
                resetForm();
                fetchCustomObjects();
            }
        } catch (error) {
            console.error('Error adding custom object:', error);
            alert('Failed to add custom object: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsTraining(false);
        }
    };

    const resetForm = () => {
        setObjectType('person');
        setObjectName('');
        setDisplayName('');
        setDescription('');
        setSelectedImages([]);
        setImagePreviews([]);
        setAnnotations(null);
        setShowAnnotator(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this custom object?')) return;

        try {
            const response = await axios.delete(`${API_URL}/admin/objects/${id}`, {
                withCredentials: true
            });

            if (response.data.success) {
                alert('Object deleted successfully');
                fetchCustomObjects();
            }
        } catch (error) {
            console.error('Error deleting object:', error);
            alert('Failed to delete object');
        }
    };

    const handleToggleActive = async (id) => {
        try {
            const response = await axios.patch(`${API_URL}/admin/objects/${id}/toggle`, {}, {
                withCredentials: true
            });

            if (response.data.success) {
                fetchCustomObjects();
            }
        } catch (error) {
            console.error('Error toggling object:', error);
        }
    };

    const handleLogout = () => {
        logout();
    };

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    if (user?.role !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-gray-400">You need admin privileges to access this page</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen p-8 bg-gray-900"
        >
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
                        <p className="text-gray-400">Manage custom object detection training</p>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-semibold"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add Custom Object</span>
                        </motion.button>

                        <div className='relative' ref={dropdownRef}>
                            <button
                                onClick={toggleDropdown}
                                className='flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors border border-gray-700'
                            >
                                <User size={20} />
                                <span>{user.name}</span>
                                <Shield size={16} className="text-yellow-400" />
                            </button>
                            
                            {isDropdownOpen && (
                                <div className='absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50'>
                                    <div className='p-3 border-b border-gray-700'>
                                        <p className='text-sm text-gray-400'>Email</p>
                                        <p className='text-white text-sm'>{user.email}</p>
                                    </div>
                                    <div className='p-3 border-b border-gray-700'>
                                        <p className='text-sm text-gray-400'>Role</p>
                                        <p className='text-yellow-400 font-medium capitalize flex items-center space-x-1'>
                                            <Shield size={14} />
                                            <span>Administrator</span>
                                        </p>
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

                {/* Add Object Form */}
                {showAddForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700"
                    >
                        <h2 className="text-xl font-bold text-white mb-4">Train New Custom Detection</h2>
                        
                        {/* Object Type Selection */}
                        <div className="mb-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                            <label className="block text-gray-300 mb-3 font-semibold">What do you want to train?</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setObjectType('person')}
                                    className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                                        objectType === 'person' 
                                            ? 'bg-emerald-500/20 border-emerald-500' 
                                            : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                                    }`}
                                >
                                    <div className="flex items-start space-x-3">
                                        <input
                                            type="radio"
                                            name="objectType"
                                            checked={objectType === 'person'}
                                            onChange={() => setObjectType('person')}
                                            className="mt-1"
                                        />
                                        <div>
                                            <h3 className="text-white font-semibold flex items-center space-x-2">
                                                <User className="w-5 h-5" />
                                                <span>Person (Face Recognition)</span>
                                            </h3>
                                            <p className="text-gray-400 text-sm mt-1">
                                                Train the system to recognize a specific person by their face. Upload clear face photos.
                                            </p>
                                            <p className="text-emerald-400 text-xs mt-2">
                                                ✨ Uses advanced face recognition
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setObjectType('object')}
                                    className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                                        objectType === 'object' 
                                            ? 'bg-blue-500/20 border-blue-500' 
                                            : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                                    }`}
                                >
                                    <div className="flex items-start space-x-3">
                                        <input
                                            type="radio"
                                            name="objectType"
                                            checked={objectType === 'object'}
                                            onChange={() => setObjectType('object')}
                                            className="mt-1"
                                        />
                                        <div>
                                            <h3 className="text-white font-semibold flex items-center space-x-2">
                                                <Database className="w-5 h-5" />
                                                <span>Custom Object</span>
                                            </h3>
                                            <p className="text-gray-400 text-sm mt-1">
                                                Train the system to detect any custom object (logo, product, animal, etc.)
                                            </p>
                                            <p className="text-blue-400 text-xs mt-2">
                                                📦 For non-person objects
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-300 mb-2">
                                        {objectType === 'person' ? 'Person Name (Identifier)' : 'Object Name (Identifier)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={objectName}
                                        onChange={(e) => setObjectName(e.target.value)}
                                        placeholder={objectType === 'person' ? 'e.g., john_smith' : 'e.g., bicycle_red'}
                                        required
                                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-300 mb-2">Display Name</label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder={objectType === 'person' ? 'e.g., John Smith' : 'e.g., Red Bicycle'}
                                        required
                                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-300 mb-2">Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description of the object..."
                                    rows={3}
                                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-300 mb-2">
                                    Training Images ({selectedImages.length.toLocaleString()}/10,000) - 
                                    {objectType === 'person' 
                                        ? ' Minimum 20 face photos, Recommended 50+'
                                        : ' Minimum 5, Recommended 100+'}
                                </label>
                                
                                {objectType === 'person' && (
                                    <div className="mb-3 p-3 bg-emerald-900/30 border border-emerald-500/50 rounded-lg">
                                        <p className="text-emerald-300 text-sm font-semibold mb-1">📸 Tips for face photos:</p>
                                        <ul className="text-gray-300 text-xs space-y-1 ml-4 list-disc">
                                            <li>Upload clear, frontal face photos</li>
                                            <li>Good lighting and different angles/expressions</li>
                                            <li>Face should be clearly visible (no sunglasses/masks)</li>
                                            <li>More photos = better accuracy</li>
                                        </ul>
                                    </div>
                                )}
                                
                                {objectType === 'object' && (
                                    <div className="mb-3 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                                        <p className="text-blue-300 text-sm font-semibold mb-1">📦 Tips for object photos:</p>
                                        <ul className="text-gray-300 text-xs space-y-1 ml-4 list-disc">
                                            <li>Upload photos from different angles</li>
                                            <li>Vary lighting conditions and backgrounds</li>
                                            <li>Include close-ups and distant shots</li>
                                            <li>More variety = better detection</li>
                                        </ul>
                                    </div>
                                )}
                                
                                <div className="space-y-3">
                                    {/* Multiple Files Upload */}
                                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-emerald-500 transition-colors">
                                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageSelect}
                                            className="hidden"
                                            id="image-upload"
                                        />
                                        <label
                                            htmlFor="image-upload"
                                            className="cursor-pointer text-emerald-400 hover:text-emerald-300 font-semibold"
                                        >
                                            📁 Select Multiple Images
                                        </label>
                                        <p className="text-gray-500 text-sm mt-2">Ctrl+Click or Shift+Click to select multiple images</p>
                                    </div>

                                    {/* Folder Upload */}
                                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-emerald-500 transition-colors">
                                        <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            webkitdirectory=""
                                            directory=""
                                            onChange={handleImageSelect}
                                            className="hidden"
                                            id="folder-upload"
                                        />
                                        <label
                                            htmlFor="folder-upload"
                                            className="cursor-pointer text-emerald-400 hover:text-emerald-300 font-semibold"
                                        >
                                            📂 Select Entire Folder
                                        </label>
                                        <p className="text-gray-500 text-sm mt-2">Upload all images from a folder at once (up to 10,000)</p>
                                    </div>

                                    {/* Clear Button */}
                                    {selectedImages.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedImages([]);
                                                setImagePreviews([]);
                                            }}
                                            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                        >
                                            🗑️ Clear All ({selectedImages.length.toLocaleString()} images)
                                        </button>
                                    )}
                                </div>

                                {/* Image Previews */}
                                {imagePreviews.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-gray-400 text-sm mb-2">
                                            Preview: Showing {imagePreviews.length} of {selectedImages.length.toLocaleString()} images
                                        </p>
                                        <div className="grid grid-cols-6 gap-2">
                                        {imagePreviews.map((preview, idx) => (
                                            <img
                                                key={idx}
                                                src={preview}
                                                alt={`Preview ${idx + 1}`}
                                                className="w-full h-20 object-cover rounded border border-gray-600"
                                            />
                                        ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex space-x-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={isTraining || selectedImages.length < (objectType === 'person' ? 20 : 5)}
                                    className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg font-semibold ${
                                        isTraining || selectedImages.length < (objectType === 'person' ? 20 : 5)
                                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700'
                                    }`}
                                >
                                    {isTraining ? (
                                        <>
                                            <Loader className="w-5 h-5 animate-spin" />
                                            <span>
                                                {objectType === 'person' ? 'Training Face Recognition...' : 'Training Model...'}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            {objectType === 'person' ? <User className="w-5 h-5" /> : <Database className="w-5 h-5" />}
                                            <span>
                                                {objectType === 'person' ? 'Train Face Recognition' : 'Next: Annotate Objects →'}
                                            </span>
                                        </>
                                    )}
                                </motion.button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        resetForm();
                                    }}
                                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {/* Custom Objects List */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-bold text-white mb-4">Custom Objects ({customObjects.length})</h2>
                    
                    {isLoading ? (
                        <div className="text-center py-8">
                            <Loader className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                            <p className="text-gray-400 mt-2">Loading objects...</p>
                        </div>
                    ) : customObjects.length === 0 ? (
                        <div className="text-center py-8">
                            <Database className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">No custom objects yet</p>
                            <p className="text-gray-500 text-sm">Add your first custom object to start detecting it</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {customObjects.map((obj) => (
                                <motion.div
                                    key={obj._id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-gray-700 rounded-lg p-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-3 h-3 rounded-full ${
                                            obj.status === 'trained' ? 'bg-green-500' :
                                            obj.status === 'processing' ? 'bg-yellow-500' :
                                            obj.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                                        }`} />
                                        <div>
                                            <h3 className="text-white font-semibold">{obj.displayName}</h3>
                                            <p className="text-gray-400 text-sm">
                                                {obj.name} • {obj.trainingImageCount || 0} images • {obj.status}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleToggleActive(obj._id)}
                                            className={`p-2 rounded ${
                                                obj.isActive ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-500'
                                            }`}
                                            title={obj.isActive ? 'Active' : 'Inactive'}
                                        >
                                            {obj.isActive ? <CheckCircle className="w-5 h-5 text-white" /> : <XCircle className="w-5 h-5 text-gray-300" />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(obj._id)}
                                            className="p-2 bg-red-600 hover:bg-red-700 rounded"
                                        >
                                            <Trash2 className="w-5 h-5 text-white" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Image Annotator Modal */}
            {showAnnotator && selectedImages.length > 0 && (
                <ImageAnnotator
                    images={selectedImages}
                    objectName={displayName || objectName}
                    onComplete={handleAnnotationComplete}
                    onCancel={() => setShowAnnotator(false)}
                />
            )}
        </motion.div>
    );
};

export default AdminPanel;

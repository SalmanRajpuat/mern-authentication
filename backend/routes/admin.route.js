import express from 'express';
import multer from 'multer';
import { CustomObject } from '../models/customObject.model.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { verifyAdmin } from '../middleware/verifyAdmin.js';
import axios from 'axios';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 20 * 1024 * 1024, // 20MB per file
        files: 10000 // Maximum 10,000 files
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Get all custom objects (admin only)
router.get('/objects', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const objects = await CustomObject.find()
            .populate('addedBy', 'name email')
            .sort({ createdAt: -1 });
        
        res.status(200).json({ success: true, objects });
    } catch (error) {
        console.error('Error fetching custom objects:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch objects' });
    }
});

// Get active custom objects (for detection - all users)
router.get('/objects/active', verifyToken, async (req, res) => {
    try {
        const objects = await CustomObject.find({ 
            isActive: true, 
            status: 'trained' 
        }).select('name displayName modelVersion');
        
        res.status(200).json({ success: true, objects });
    } catch (error) {
        console.error('Error fetching active objects:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch active objects' });
    }
});

// Add new custom object with training images (admin only)
router.post('/objects/add', verifyToken, verifyAdmin, upload.array('images', 10000), async (req, res) => {
    try {
        const { name, displayName, description, objectType, annotations } = req.body;
        
        if (!name || !displayName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Object name and display name are required' 
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'At least one training image is required' 
            });
        }
        
        // Validate minimum images based on object type
        const minImages = objectType === 'person' ? 20 : 5;
        if (req.files.length < minImages) {
            return res.status(400).json({
                success: false,
                message: `At least ${minImages} images required for ${objectType === 'person' ? 'face recognition' : 'object detection'}`
            });
        }

        // For custom objects (not persons), annotations are required
        let parsedAnnotations = null;
        if (objectType === 'object' && annotations) {
            try {
                parsedAnnotations = JSON.parse(annotations);
            } catch (e) {
                console.warn('Failed to parse annotations:', e);
            }
        }

        // Check if object already exists
        const existingObject = await CustomObject.findOne({ 
            name: name.toLowerCase().trim() 
        });
        
        if (existingObject) {
            return res.status(400).json({ 
                success: false, 
                message: 'Object with this name already exists' 
            });
        }

        // Prepare training images for Python API (base64 encoded)
        const trainingImages = req.files.map(file => 
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
        );

        // Create custom object (without storing images in MongoDB)
        const customObject = new CustomObject({
            name: name.toLowerCase().trim(),
            displayName: displayName.trim(),
            description: description || '',
            trainingImageCount: req.files.length,
            objectType: objectType || 'object', // 'person' or 'object'
            addedBy: req.userId,
            status: 'pending'
        });

        await customObject.save();

        // Trigger training in Python backend
        try {
            const DETECTION_API_URL = process.env.DETECTION_API_URL || 'http://localhost:5001';
            
            const trainingPayload = {
                object_id: customObject._id.toString(),
                object_name: customObject.name,
                display_name: customObject.displayName,
                object_type: objectType || 'object', // Tell Python API if this is a person or object
                images: trainingImages
            };

            // Include annotations if available (for custom objects)
            if (parsedAnnotations) {
                trainingPayload.annotations = parsedAnnotations;
            }
            
            const trainingResponse = await axios.post(`${DETECTION_API_URL}/train/custom-object`, trainingPayload, {
                timeout: 300000, // 5 minutes timeout for training
                headers: { 'Content-Type': 'application/json' }
            });

            if (trainingResponse.data.success) {
                customObject.status = 'trained';
                customObject.trainedAt = new Date();
                customObject.accuracy = trainingResponse.data.accuracy || 0;
                await customObject.save();

                res.status(201).json({ 
                    success: true, 
                    message: `Custom object added and trained successfully with ${req.files.length} images`,
                    object: customObject,
                    imageCount: req.files.length
                });
            } else {
                customObject.status = 'failed';
                await customObject.save();
                
                res.status(500).json({ 
                    success: false, 
                    message: 'Training failed',
                    object: customObject
                });
            }
        } catch (trainingError) {
            console.error('Training error:', trainingError);
            customObject.status = 'processing'; // Will be trained later
            await customObject.save();
            
            res.status(201).json({ 
                success: true, 
                message: 'Custom object added, training queued',
                object: customObject,
                note: 'Training will be processed asynchronously'
            });
        }

    } catch (error) {
        console.error('Error adding custom object:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to add custom object',
            error: error.message 
        });
    }
});

// Delete custom object (admin only)
router.delete('/objects/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const object = await CustomObject.findByIdAndDelete(id);
        
        if (!object) {
            return res.status(404).json({ 
                success: false, 
                message: 'Object not found' 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Custom object deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting custom object:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete object' 
        });
    }
});

// Toggle object active status (admin only)
router.patch('/objects/:id/toggle', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const object = await CustomObject.findById(id);
        
        if (!object) {
            return res.status(404).json({ 
                success: false, 
                message: 'Object not found' 
            });
        }

        object.isActive = !object.isActive;
        await object.save();

        res.status(200).json({ 
            success: true, 
            message: `Object ${object.isActive ? 'activated' : 'deactivated'} successfully`,
            object 
        });
    } catch (error) {
        console.error('Error toggling object status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update object status' 
        });
    }
});

export default router;

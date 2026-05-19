import express from 'express';
import mongoose from 'mongoose';
import { DetectionReport } from '../models/detectionReport.model.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

// Save detection report to database
router.post('/save', async (req, res) => {
    try {
        const {
            userId,  // Accept userId directly from Python API
            detectionType,
            videoData,
            detectedObjects,
            objectSummary,
            crossingEvents,
            totalDetections,
            processingTime,
            reportUrl,
            reportPath
        } = req.body;

        // Use provided userId or get from verifyToken middleware
        const finalUserId = userId || req.userId;
        
        if (!finalUserId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Extract search tags from detected objects
        const searchTags = [...new Set(detectedObjects.map(obj => obj.class.toLowerCase()))];

        const report = new DetectionReport({
            userId: finalUserId,
            detectionType,
            videoData,
            detectedObjects,
            objectSummary,
            crossingEvents: crossingEvents?.slice(0, 100) || [], // Keep only last 100 events
            totalDetections,
            processingTime,
            reportUrl,
            reportPath,
            searchTags
        });

        await report.save();

        res.status(201).json({
            success: true,
            message: 'Detection report saved successfully',
            reportId: report._id
        });
    } catch (error) {
        console.error('Error saving detection report:', error);
        res.status(500).json({ success: false, message: 'Failed to save detection report', error: error.message });
    }
});

// Get all detection reports for current user
router.get('/history', verifyToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, detectionType, search } = req.query;

        const query = { userId: req.userId };
        
        // Filter by detection type if provided
        if (detectionType) {
            query.detectionType = detectionType;
        }

        // Search by object class if provided
        if (search) {
            query.searchTags = { $in: [search.toLowerCase()] };
        }

        const reports = await DetectionReport.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const count = await DetectionReport.countDocuments(query);

        res.json({
            success: true,
            reports,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            totalReports: count
        });
    } catch (error) {
        console.error('Error fetching detection history:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch detection history', error: error.message });
    }
});

// Get specific detection report by ID
router.get('/:reportId', verifyToken, async (req, res) => {
    try {
        const report = await DetectionReport.findOne({
            _id: req.params.reportId,
            userId: req.userId // Ensure user can only access their own reports
        });

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        res.json({
            success: true,
            report
        });
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch report', error: error.message });
    }
});

// Get detection statistics for current user
router.get('/stats/summary', verifyToken, async (req, res) => {
    try {
        const userId = req.userId;

        // Total detections count
        const totalReports = await DetectionReport.countDocuments({ userId });

        // Detection type breakdown
        const typeBreakdown = await DetectionReport.aggregate([
            { $match: { userId: mongoose.Types.ObjectId(userId) } },
            { $group: { _id: '$detectionType', count: { $sum: 1 } } }
        ]);

        // Most detected objects
        const objectStats = await DetectionReport.aggregate([
            { $match: { userId: mongoose.Types.ObjectId(userId) } },
            { $unwind: '$detectedObjects' },
            { $group: { 
                _id: '$detectedObjects.class', 
                totalCount: { $sum: '$detectedObjects.count' },
                occurrences: { $sum: 1 }
            }},
            { $sort: { totalCount: -1 } },
            { $limit: 10 }
        ]);

        // Total processing time
        const processingStats = await DetectionReport.aggregate([
            { $match: { userId: mongoose.Types.ObjectId(userId) } },
            { $group: { 
                _id: null,
                totalProcessingTime: { $sum: '$processingTime' },
                avgProcessingTime: { $avg: '$processingTime' }
            }}
        ]);

        res.json({
            success: true,
            stats: {
                totalReports,
                typeBreakdown,
                topDetectedObjects: objectStats,
                processingStats: processingStats[0] || { totalProcessingTime: 0, avgProcessingTime: 0 }
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch statistics', error: error.message });
    }
});

// Search detection reports by object class
router.get('/search/:objectClass', verifyToken, async (req, res) => {
    try {
        const { objectClass } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const reports = await DetectionReport.find({
            userId: req.userId,
            searchTags: objectClass.toLowerCase()
        })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const count = await DetectionReport.countDocuments({
            userId: req.userId,
            searchTags: objectClass.toLowerCase()
        });

        res.json({
            success: true,
            objectClass,
            reports,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            totalReports: count
        });
    } catch (error) {
        console.error('Error searching reports:', error);
        res.status(500).json({ success: false, message: 'Failed to search reports', error: error.message });
    }
});

// Delete detection report
router.delete('/:reportId', verifyToken, async (req, res) => {
    try {
        const report = await DetectionReport.findOneAndDelete({
            _id: req.params.reportId,
            userId: req.userId
        });

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        res.json({
            success: true,
            message: 'Report deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({ success: false, message: 'Failed to delete report', error: error.message });
    }
});

// Update report notes
router.patch('/:reportId/notes', verifyToken, async (req, res) => {
    try {
        const { notes } = req.body;

        const report = await DetectionReport.findOneAndUpdate(
            { _id: req.params.reportId, userId: req.userId },
            { notes },
            { new: true }
        );

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        res.json({
            success: true,
            message: 'Notes updated successfully',
            report
        });
    } catch (error) {
        console.error('Error updating notes:', error);
        res.status(500).json({ success: false, message: 'Failed to update notes', error: error.message });
    }
});

export default router;

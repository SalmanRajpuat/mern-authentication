import mongoose from "mongoose";

const detectionReportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    detectionType: {
        type: String,
        enum: ['image', 'video', 'camera'],
        required: true
    },
    // Video-specific data
    videoData: {
        duration: Number,
        totalFrames: Number,
        fps: Number,
        countingLinePosition: Number,
        totalCrossings: Number,
        videoPath: String,
        videoUrl: String
    },
    // Detection results
    detectedObjects: [{
        class: String,
        count: Number,
        confidence: Number
    }],
    objectSummary: {
        type: Map,
        of: Number
    },
    // Crossing events for video (simplified)
    crossingEvents: [{
        timestamp: Number,
        objectClass: String,
        direction: String, // 'up' or 'down'
        objectId: Number
    }],
    // Processing info
    totalDetections: {
        type: Number,
        default: 0
    },
    processingTime: {
        type: Number, // in seconds
        default: 0
    },
    // Report metadata
    reportUrl: String,
    reportPath: String,
    // Search and filtering
    searchTags: [String], // e.g., ['person', 'car', 'bicycle']
    notes: String,
}, { timestamps: true });

// Index for efficient searching
detectionReportSchema.index({ userId: 1, createdAt: -1 });
detectionReportSchema.index({ searchTags: 1 });
detectionReportSchema.index({ detectionType: 1 });

// Virtual for getting unique object classes
detectionReportSchema.virtual('uniqueObjectClasses').get(function() {
    return [...new Set(this.detectedObjects.map(obj => obj.class))];
});

export const DetectionReport = mongoose.model('DetectionReport', detectionReportSchema);

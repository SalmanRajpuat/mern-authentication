import mongoose from "mongoose";

const customObjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    displayName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    objectType: {
        type: String,
        enum: ['person', 'object'],
        default: 'object'
    },
    trainingImageCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'trained', 'failed'],
        default: 'pending'
    },
    modelVersion: {
        type: String,
        default: '1.0'
    },
    accuracy: {
        type: Number,
        default: 0
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    trainedAt: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const CustomObject = mongoose.model('CustomObject', customObjectSchema);

# Detection Report Database System

## Overview
This system automatically stores all detection reports in MongoDB and allows users to view, search, and manage their detection history.

## Features Implemented

### 1. **Simplified HTML Reports**
- Clean, simple HTML design (removed complex gradients and styling)
- Easy to read and print
- Shows key statistics:
  - Total crossings
  - Object types detected
  - Video duration and processing time
  - Object breakdown with directional counts (up/down)
- Saved in `DetectionModel/results/reports/` directory

### 2. **MongoDB Database Integration**
All detection reports are automatically saved to MongoDB with the following data:
- **User Information**: Linked to user ID for personalized history
- **Detection Type**: Image, video, or camera detection
- **Video Data**: Duration, frame rate, counting line position, total crossings
- **Detected Objects**: List of objects with counts and confidence scores
- **Crossing Events**: Timeline of when objects crossed the counting line
- **Processing Metrics**: Total detections, processing time
- **Search Tags**: Automatically generated for easy searching (e.g., "person", "car", "bicycle")

### 3. **Detection History Page**
New page at `/detection/history` showing:
- **Statistics Dashboard**:
  - Total reports count
  - Video vs image detection breakdown
  - Total processing time
- **Search & Filter**:
  - Search by object name (e.g., "person", "car")
  - Filter by detection type (all, video, image)
- **Report Cards**: Each showing:
  - Detection type and timestamp
  - Number of objects detected
  - Processing time
  - Video-specific info (duration, line position, crossings)
  - Actions: View report (HTML), Delete report
- **Pagination**: 10 reports per page

### 4. **Search Functionality**
Users can search their detection history by:
- **Object class**: Find all reports where a specific object was detected (e.g., "person", "car", "dog")
- **Detection type**: Filter by video or image detections
- **Date range**: View most recent detections first (sorted by date)

## How It Works

### Video Detection Flow:
1. User uploads video with counting line position
2. System passes `user_id` to Python detection API
3. Video is processed frame-by-frame
4. Report is generated and saved as HTML
5. **Automatic Database Save**:
   - Python API sends report data to Node.js backend
   - Backend saves to MongoDB with user reference
6. User receives detection results
7. User can view report immediately or access from history

### Accessing History:
1. Click **"View History"** button on detection page
2. See all your past detections with statistics
3. Search for specific objects
4. Filter by type (video/image)
5. Click **"View Report"** to open detailed HTML report
6. Click **"Delete"** to remove unwanted reports

## API Endpoints

### Backend (Node.js) - `/api/detection/`
- `POST /save` - Save detection report to database
- `GET /history` - Get user's detection history (paginated)
  - Query params: `page`, `limit`, `detectionType`, `search`
- `GET /stats/summary` - Get user's detection statistics
- `GET /:reportId` - Get specific report by ID
- `GET /search/:objectClass` - Search reports by object class
- `DELETE /:reportId` - Delete a report
- `PATCH /:reportId/notes` - Update report notes

### Python Detection API - `http://localhost:5001`
- `POST /detect/video` - Process video (now accepts `user_id`)
- `GET /detect/video/status/:session_id` - Get processing status
- `GET /results/reports/:filename` - Serve HTML report files
- `GET /results/videos/:filename` - Serve processed video files

## Database Schema

### DetectionReport Model
```javascript
{
  userId: ObjectId (ref: 'User'),
  detectionType: String ('image' | 'video' | 'camera'),
  videoData: {
    duration: Number,
    totalFrames: Number,
    fps: Number,
    countingLinePosition: Number,
    totalCrossings: Number,
    videoPath: String,
    videoUrl: String
  },
  detectedObjects: [{
    class: String,
    count: Number,
    confidence: Number
  }],
  objectSummary: Map (object class -> count),
  crossingEvents: [{
    timestamp: Number,
    objectClass: String,
    direction: String ('up' | 'down'),
    objectId: Number
  }],
  totalDetections: Number,
  processingTime: Number (seconds),
  reportUrl: String,
  reportPath: String,
  searchTags: [String], // Auto-generated for searching
  notes: String,
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

## Usage Examples

### Search for Reports with Specific Object:
1. Go to Detection History page
2. Enter object name in search box (e.g., "person")
3. Click "Search"
4. View all reports where that object was detected

### Filter by Detection Type:
1. Click "Video" button to see only video detections
2. Click "Image" button to see only image detections
3. Click "All" button to see everything

### View Detailed Report:
1. Find the detection in your history
2. Click the eye icon (👁️) button
3. Report opens in new tab showing:
   - Summary statistics
   - Object breakdown table
   - Configuration details

### Delete Old Reports:
1. Find unwanted report in history
2. Click the trash icon (🗑️) button
3. Confirm deletion
4. Report is removed from database

## Files Modified/Created

### New Files:
- `backend/models/detectionReport.model.js` - MongoDB schema
- `backend/routes/detection.route.js` - API routes for reports
- `frontend/src/pages/DetectionHistoryPage.jsx` - History UI

### Modified Files:
- `backend/index.js` - Added detection routes
- `DetectionModel/detection_api.py`:
  - Simplified HTML report generation
  - Added `user_id` support
  - Added `save_report_to_database()` function
  - Automatic database save after video processing
- `frontend/src/App.jsx` - Added history route
- `frontend/src/pages/UserDetectionPage.jsx`:
  - Added "View History" button
  - Sends user_id with video upload

## Benefits

✅ **Persistent Storage**: All detections saved permanently
✅ **User-Specific**: Each user only sees their own reports
✅ **Easy Search**: Find past detections by object type
✅ **Statistics**: Track detection usage over time
✅ **Report Access**: View detailed HTML reports anytime
✅ **Clean Reports**: Simple, readable HTML format
✅ **Automatic**: No manual saving required

## Future Enhancements (Potential)

- 📊 Advanced analytics dashboard with charts
- 📧 Email reports to users
- 📅 Date range filtering
- 📝 Add custom notes to reports
- 🏷️ Tag/categorize reports
- 📤 Export reports as PDF
- 📈 Compare detection trends over time
- 🔔 Notifications for completed detections

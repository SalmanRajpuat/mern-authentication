# Video Detection Report Feature

## Overview
The video detection system now includes comprehensive reporting with detailed statistics about object crossings, processing metrics, and timeline analysis.

## Features

### 1. Live Progress Updates
- **Real-time progress tracking**: Progress updates every frame during video processing
- **Visual feedback**: Animated progress bar with percentage display
- **Frontend polling**: Status checked every 1 second for smooth updates
- **Processing indicators**: Pulsing indicator and informative messages

### 2. Detailed HTML Reports

#### Report Contents
Each video detection generates a professional HTML report including:

- **Summary Statistics**:
  - Total line crossings
  - Video duration
  - Processing time
  - Number of unique object types detected

- **Detection Table**:
  - Per-class object counts
  - Upward crossings (objects moving up across line)
  - Downward crossings (objects moving down across line)
  - Percentage breakdown by object type

- **Crossing Timeline**:
  - Last 50 crossing events
  - Timestamp for each crossing
  - Direction of movement (↑ Up / ↓ Down)
  - Object class name

- **Configuration Details**:
  - Counting line position (percentage)
  - Video frame rate
  - Processing speed (FPS)
  - Total frames processed

#### Report Features
- **Professional styling**: Gradient backgrounds, responsive design
- **Print support**: Optimized layout for printing/PDF export
- **Persistent storage**: Reports saved in `DetectionModel/results/reports/`
- **Unique naming**: Reports named by session ID with timestamp

### 3. Frontend Integration

#### Report Display
When video processing completes, the UI shows:
- Blue gradient banner with "Detailed Detection Report Available"
- Quick statistics preview:
  - Total crossings count
  - Number of object types
  - Video duration
- **"View Report" button**: Opens full report in new browser tab

#### Enhanced Results Display
- **Statistics cards**: Total objects, line crossings, processing time
- **Object summary**: Visual cards showing count per object type with "Crossed line" badges
- **Video preview**: Processed video with counting line overlay
- **Line position info**: Shows where the counting line was positioned

## API Endpoints

### Get Video Status
```http
GET /detect/video/status/<session_id>
```

Response includes:
```json
{
  "status": "completed",
  "progress": 100,
  "detected_objects": [...],
  "video_url": "/results/videos/1.mp4",
  "total_crossings": 25,
  "object_summary": {
    "person": 10,
    "car": 8,
    "bicycle": 7
  },
  "total_detections": 25,
  "inference_time": 15.43,
  "report": {
    "total_crossings": 25,
    "objects_passed": {
      "person": {"up": 5, "down": 5},
      "car": {"up": 4, "down": 4},
      "bicycle": {"up": 3, "down": 4}
    },
    "report_url": "/results/reports/abc123_report.html",
    "video_duration": 30.5,
    "processing_time": 15.43
  }
}
```

### Serve Report
```http
GET /results/reports/<filename>
```
Serves the HTML report file for viewing in browser.

### Serve Video
```http
GET /results/videos/<filename>
```
Serves the processed video file with annotations.

## Usage Guide

### 1. Upload and Configure
1. Navigate to Detection page
2. Select "Video" mode
3. Upload your video file
4. Adjust counting line position using:
   - Drag the yellow line
   - Click preset buttons (25%, 50%, 75%)
5. Click "Detect Objects"

### 2. Monitor Progress
- Watch real-time progress bar update
- Progress shows percentage of frames processed
- Estimated completion time visible
- Processing indicator animates during analysis

### 3. View Results
Once complete, you'll see:
- **Report banner** (blue gradient) at top
- Quick stats: crossings, object types, duration
- **"View Report" button** to open detailed HTML report
- **Processed video** with annotations and counting line
- **Statistics cards** showing total objects and crossings
- **Object summary** with count per type

### 4. Access Report
Click "View Report" button to open:
- Full detailed report in new tab
- Summary statistics and charts
- Complete timeline of all crossings
- Configuration information
- Print or save as PDF using browser

## Technical Details

### Crossing Detection Logic
```python
# Objects tracked using centroid tracking
# Crossing detected when centroid crosses line
if prev_y < counting_line_y <= curr_y:
    direction = 'up'  # Object moving upward
elif prev_y > counting_line_y >= curr_y:
    direction = 'down'  # Object moving downward

# Each crossing logged with:
{
    'timestamp': time.time(),
    'object_id': obj_id,
    'class': class_name,
    'direction': direction
}
```

### Report Generation
Reports generated using:
- **Session data**: Object IDs, timestamps, classes
- **Tracker data**: Crossing events with full details
- **Video metadata**: FPS, duration, frame count
- **Processing metrics**: Time taken, speed

### Storage
```
DetectionModel/
├── results/
│   ├── reports/
│   │   └── session123_20240115_1430_report.html
│   └── videos/
│       └── 1.mp4
```

## Report Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Video Detection Report - Session 123456</title>
    <!-- Styled with gradients, responsive layout -->
</head>
<body>
    <!-- Summary Cards -->
    <div class="summary">
        <div class="card">Total Crossings: 25</div>
        <div class="card">Video Duration: 30.5s</div>
        ...
    </div>
    
    <!-- Detection Table -->
    <table>
        <thead>
            <tr>
                <th>Object Class</th>
                <th>Total Count</th>
                <th>Upward</th>
                <th>Downward</th>
                <th>Percentage</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Person</td>
                <td>10</td>
                <td>5 ↑</td>
                <td>5 ↓</td>
                <td>40%</td>
            </tr>
            ...
        </tbody>
    </table>
    
    <!-- Timeline -->
    <div class="timeline">
        <div class="event">
            <span>15:30:45</span>
            <span>Person</span>
            <span>↑ Up</span>
        </div>
        ...
    </div>
</body>
</html>
```

## Benefits

### For Users
- **Comprehensive analysis**: Detailed breakdown of all detections
- **Professional reports**: Suitable for documentation and presentations
- **Historical tracking**: Reports saved for future reference
- **Easy sharing**: HTML reports can be emailed or shared
- **Print ready**: Optimized for PDF export

### For Developers
- **Extensible format**: Easy to add charts, graphs, custom metrics
- **Persistent storage**: Reports remain available after session ends
- **API accessible**: Can be integrated with other systems
- **Debugging aid**: Timeline helps troubleshoot detection issues

## Troubleshooting

### Progress Not Updating
- **Check network**: Ensure frontend can reach backend (port 5001)
- **Browser console**: Look for polling errors
- **Backend logs**: Verify progress is being calculated correctly

### Report Not Generated
- **Check directory**: Ensure `results/reports/` folder exists
- **Permissions**: Verify write access to results directory
- **Session data**: Confirm crossing events are being tracked

### Report Link Not Working
- **URL format**: Should be `http://localhost:5001/results/reports/...`
- **File exists**: Check reports directory for HTML file
- **Flask route**: Verify `/results/reports/<filename>` endpoint is registered

## Future Enhancements

### Potential Additions
- [ ] Charts and graphs (pie charts, bar graphs)
- [ ] Export to PDF directly
- [ ] Email report option
- [ ] Customizable report templates
- [ ] Include video thumbnails/snapshots
- [ ] Heatmap of crossing locations
- [ ] Time-series analysis charts
- [ ] Compare multiple reports
- [ ] Generate summary across multiple videos

### Advanced Features
- [ ] Real-time streaming updates (WebSocket)
- [ ] Background processing queue
- [ ] Video segment analysis
- [ ] Multi-line crossing support
- [ ] Zone-based counting (not just line)
- [ ] Alert system for specific detection thresholds

## Conclusion

The video detection report system provides comprehensive analysis of object movements across counting lines, with professional HTML reports, real-time progress tracking, and detailed statistics. This enables users to gain insights from their video analysis and maintain records of detection results.

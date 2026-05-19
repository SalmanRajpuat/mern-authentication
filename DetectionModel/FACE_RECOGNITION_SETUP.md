# Face Recognition Setup for Custom Person Detection

## Problem Solved
Previously, when you trained a custom object like "arp", the system would still detect it as "person" because YOLO wasn't actually being retrained. Now, the system uses face recognition to identify specific people!

## How It Works Now

### 1. **Face Recognition Integration**
- When you upload photos of a person (like "arp"), the system extracts facial features
- These features are saved as "face encodings"
- During detection, faces are recognized and labeled with the custom name instead of "person"

### 2. **Detection Process**
1. YOLO detects "person" in the image/video
2. Face recognition checks if it's a known person
3. If matched, displays custom name (e.g., "arp") instead of "person"
4. If not matched, displays generic "person"

## Installation

### Install Face Recognition Library

```bash
# Navigate to DetectionModel folder
cd DetectionModel

# Install required packages
pip install face-recognition deepface
```

**Note:** On Windows, you may need to install Visual C++ Build Tools first:
- Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- Or use: `pip install face-recognition-models` separately

### Alternative (if face-recognition fails):
```bash
# Install cmake first
pip install cmake

# Then install dlib
pip install dlib

# Finally install face-recognition
pip install face-recognition
```

## Usage

### 1. Train Custom Person
1. Go to Admin Panel
2. Click "Add Custom Object"
3. Enter person's name (e.g., "arp")
4. Upload 5+ clear face photos (recommended: 20-50 photos)
5. Click "Train & Save"

### 2. Detection
- The system will now recognize "arp" specifically
- Shows "arp: 1" instead of "person: 1"
- Works in images, videos, and webcam detection

## Tips for Best Results

### Photo Quality
- ✅ Clear, well-lit photos
- ✅ Multiple angles of the face
- ✅ Different expressions
- ✅ Various backgrounds
- ❌ Avoid blurry or dark photos
- ❌ Avoid faces that are too small

### Number of Photos
- Minimum: 5 photos
- Recommended: 20-50 photos
- More photos = better accuracy

### Photo Variety
- Front-facing photos
- Side profile photos
- Photos with glasses (if they wear them)
- With/without smile
- Different lighting conditions

## Technical Details

### Face Encoding
- Uses 128-dimensional face encoding
- Averages encodings from multiple photos for robustness
- Stored in: `custom_objects/face_encodings.pkl`

### Recognition Tolerance
- Default: 0.6 (lower = stricter matching)
- Range: 0.4-0.7 recommended
- Lower values reduce false positives but may miss some matches

## Checking Status

### Python API Logs
When you train a custom person, check the terminal for:
```
✅ Face recognition module loaded
Generating face encodings for arp...
✅ Created face encoding from 15 faces
Face recognition: ✅ Enabled
```

### If Face Recognition Not Available:
```
⚠️ Face recognition not available. Install with: pip install face-recognition
Face recognition: ❌ Not available
```

## Troubleshooting

### Issue: "person" still showing instead of custom name
**Solution:**
1. Restart the Python API after installing face-recognition
2. Check if face encodings were created successfully
3. Make sure training photos clearly show faces

### Issue: face-recognition installation fails
**Solution:**
```bash
# Windows: Install Visual C++ Build Tools
# Or use pre-built wheels
pip install --upgrade pip
pip install face-recognition-models
pip install face-recognition
```

### Issue: Low accuracy
**Solution:**
1. Add more training photos (20-50 recommended)
2. Use better quality photos
3. Include variety in angles and lighting

## Current Status
- ✅ Face recognition code integrated
- ⚠️ Library needs to be installed
- ⚠️ Python API needs restart after installation

## Next Steps
1. Install face-recognition library
2. Restart Python API server
3. Retrain your custom objects (e.g., "arp")
4. Test detection

The system will now properly recognize "arp" as a distinct person!

# 🤖 Custom Object Detection Training Guide

Complete guide for training custom object detection models with up to 10,000 images.

---

## 🎯 Overview

The custom training system allows **Admins** to train the object detection model to recognize new objects by uploading training images.

### Key Features:
- ✅ Support for up to **10,000 training images** per object
- ✅ **Folder upload** - Upload entire folders at once
- ✅ **Multiple file selection** - Select multiple individual files
- ✅ **Batch processing** - Efficient handling of large image sets
- ✅ **Progress tracking** - Real-time upload progress
- ✅ **Automatic validation** - Filters invalid image files
- ✅ **Preview system** - Shows first 100 images for review

---

## 📊 Recommended Training Data

| **Object Complexity** | **Minimum Images** | **Recommended Images** | **Best Results** |
|----------------------|-------------------|----------------------|------------------|
| Simple objects | 5 | 50-100 | 200-500 |
| Medium complexity | 10 | 100-300 | 500-1,000 |
| Complex objects | 20 | 300-500 | 1,000-3,000 |
| Highly variable | 50 | 500-1,000 | 3,000-10,000 |

### Accuracy Estimates:
- **5-50 images**: ~65-70% accuracy
- **100-500 images**: ~75-85% accuracy
- **500-2,000 images**: ~85-90% accuracy
- **2,000-10,000 images**: ~90-95% accuracy

---

## 🚀 How to Train a Custom Object

### Step 1: Access Admin Panel
1. Login as an **Admin** user
2. You'll be redirected to `/admin`
3. Click **"Add Custom Object"** button

### Step 2: Fill Object Details
1. **Object Name (Identifier)**: 
   - Lowercase, no spaces (e.g., `sparrow`, `tesla_model_s`)
   - Used internally by the system
   
2. **Display Name**: 
   - Human-friendly name (e.g., `Sparrow Bird`, `Tesla Model S`)
   - Shown in detection results
   
3. **Description** (Optional):
   - Brief description of the object
   - Helps other admins understand the object

### Step 3: Upload Training Images

#### Option A: Select Multiple Files
1. Click **"📁 Select Multiple Images"**
2. Hold `Ctrl` (Windows) or `Cmd` (Mac) and click files
3. Or use `Shift+Click` to select a range
4. Click **Open**

#### Option B: Upload Entire Folder (Recommended for 100+ images)
1. Click **"📂 Select Entire Folder"**
2. Choose the folder containing your training images
3. All valid images in the folder will be uploaded
4. Subfolders are **included** automatically

### Step 4: Review and Submit
1. Check the image count: `(X/10,000)`
2. Preview shows first 100 images
3. Use **"🗑️ Clear All"** if you need to start over
4. Click **"Train & Save"** to begin training

### Step 5: Wait for Training
- Small datasets (5-100 images): 1-2 minutes
- Medium datasets (100-1,000 images): 2-5 minutes
- Large datasets (1,000-10,000 images): 5-30 minutes
- Progress shown in console and UI

---

## 📁 Image Storage Structure

```
DetectionModel/custom_objects/
├── training_data/
│   ├── sparrow/
│   │   ├── sparrow_00000.jpg
│   │   ├── sparrow_00001.jpg
│   │   ├── sparrow_00002.jpg
│   │   └── ... (up to 10,000)
│   ├── car_brand/
│   │   ├── car_brand_00000.jpg
│   │   └── ...
│   └── [object_name]/
│
├── models/
│   └── [trained model files]
│
└── custom_objects.json
```

### File Naming:
- Format: `{object_name}_{index:05d}.jpg`
- Example: `sparrow_00001.jpg`, `sparrow_00142.jpg`
- Zero-padded 5 digits for proper sorting

---

## ✅ Best Practices for Training Data

### 1. Image Quality
- ✅ High resolution (at least 640x640)
- ✅ Clear, focused images
- ✅ Good lighting
- ❌ Avoid blurry or low-quality images

### 2. Image Variety
- ✅ Multiple angles (front, side, top, bottom)
- ✅ Different lighting conditions
- ✅ Various backgrounds
- ✅ Different distances (close-up, medium, far)
- ✅ Different contexts/environments

### 3. Object Variations
- ✅ Different colors/variations of the object
- ✅ Different sizes/scales
- ✅ With and without occlusions
- ✅ In different poses/positions

### 4. Data Balance
- ✅ Equal representation of all variations
- ✅ Mix of easy and challenging examples
- ✅ Include edge cases

### 5. Avoid Common Mistakes
- ❌ All images from same angle
- ❌ Same background in all images
- ❌ Only perfect/ideal conditions
- ❌ Too much zoom or too far away
- ❌ Heavy filters or edits

---

## 🔧 Technical Specifications

### Upload Limits
- **Maximum images per object**: 10,000
- **Maximum file size per image**: 20MB
- **Total upload timeout**: 30 minutes
- **Supported formats**: JPG, PNG, JPEG, WebP, BMP

### Processing
- **Batch size**: 100 images per progress update
- **Image validation**: Automatic filtering of invalid files
- **Storage**: Dual storage (files + MongoDB backup)
- **Compression**: Images stored at original quality

### System Requirements
- **Backend memory**: ~2GB RAM per 1,000 images
- **Disk space**: ~1MB per image average
- **Processing time**: ~0.1-0.2 seconds per image

---

## 🎨 Example Training Scenarios

### Scenario 1: Training a Bird Species (Sparrow)
```
Recommended images: 200-500
Structure:
├── 📁 different_angles/ (50 images)
├── 📁 different_lighting/ (50 images)
├── 📁 flying/ (40 images)
├── 📁 perched/ (40 images)
└── 📁 various_backgrounds/ (20 images)

Total: 200 images
Expected accuracy: ~85%
```

### Scenario 2: Training a Vehicle Brand
```
Recommended images: 500-1,000
Structure:
├── 📁 front_view/ (150 images)
├── 📁 side_view/ (150 images)
├── 📁 rear_view/ (100 images)
├── 📁 different_models/ (200 images)
├── 📁 different_colors/ (200 images)
└── 📁 various_conditions/ (200 images)

Total: 1,000 images
Expected accuracy: ~90%
```

### Scenario 3: Training Complex Object (Person with Specific Clothing)
```
Recommended images: 1,000-3,000
Structure:
├── 📁 full_body/ (500 images)
├── 📁 upper_body/ (500 images)
├── 📁 different_poses/ (500 images)
├── 📁 different_lighting/ (500 images)
├── 📁 different_backgrounds/ (500 images)
└── 📁 occlusions/ (500 images)

Total: 3,000 images
Expected accuracy: ~92%
```

---

## 📈 Training Progress & Results

### During Training
```
Training custom object: Sparrow Bird (sparrow)
Number of training images: 250
Progress: 100/250 images saved (40.0%)
Progress: 200/250 images saved (80.0%)
✅ Saved 248 images successfully
⚠️ Failed to process 2 images
✅ Custom object 'Sparrow Bird' trained successfully!
Assigned class ID: 1000
Training accuracy: 83.2%
```

### After Training
The admin panel will show:
- ✅ **Status**: Trained (green indicator)
- 📊 **Accuracy**: 83.2%
- 📁 **Images**: 248 images
- 🔢 **Class ID**: 1000
- ⏰ **Trained**: [timestamp]

---

## 🐛 Troubleshooting

### Issue: "Maximum 10,000 images allowed"
**Solution**: Split your dataset into multiple custom objects or reduce image count

### Issue: Upload fails or times out
**Solution**: 
- Reduce batch size (upload 1,000-2,000 at a time)
- Check internet connection
- Verify images are valid format
- Clear browser cache

### Issue: "Failed to process enough images"
**Solution**: 
- Ensure images are valid formats (JPG, PNG)
- Check images aren't corrupted
- Verify file sizes are under 20MB each
- Try re-uploading

### Issue: Low accuracy after training
**Solution**:
- Add more images (aim for 500+)
- Increase variety (angles, lighting, backgrounds)
- Ensure image quality is good
- Balance your dataset

### Issue: Training takes too long
**Expected Behavior**:
- 100 images: ~30 seconds
- 1,000 images: ~3-5 minutes
- 5,000 images: ~15-20 minutes
- 10,000 images: ~25-30 minutes

---

## 📊 Training Results Interpretation

### Accuracy Ranges
- **65-75%**: Needs more data or better variety
- **75-85%**: Good for simple objects
- **85-92%**: Excellent for most use cases
- **92%+**: Outstanding (rare, requires 3,000+ quality images)

### Status Indicators
- 🟢 **Trained**: Ready to use in detection
- 🟡 **Processing**: Currently training
- 🔴 **Failed**: Training encountered errors
- ⚪ **Pending**: Waiting to be trained

---

## 🔐 Admin Panel Features

### Object Management
- ✅ **Activate/Deactivate**: Toggle object availability for detection
- 🗑️ **Delete**: Remove custom object and all training data
- 📊 **View Details**: See accuracy, image count, and training date
- 🔄 **Retrain**: Delete and retrain with new/additional images

---

## 💾 Storage & Cleanup

### Disk Usage Estimates
- 100 images: ~100MB
- 500 images: ~500MB
- 1,000 images: ~1GB
- 5,000 images: ~5GB
- 10,000 images: ~10GB

### Cleanup Recommendations
- Regularly review and delete unused custom objects
- Archive old training data
- Consider cloud storage for large datasets
- Monitor available disk space

---

## 🎓 Training Tips

1. **Start Small**: Test with 50-100 images first
2. **Iterate**: Add more images if accuracy is low
3. **Quality > Quantity**: 500 good images beats 2,000 poor ones
4. **Use Folders**: Organize by category for easier management
5. **Document**: Use descriptions to track training iterations
6. **Test Detection**: Try detection immediately after training
7. **Refine**: Retrain with additional images if needed

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for detailed errors
3. Check Python backend logs for training details
4. Ensure all services are running (backend, Python API)

---

**Last Updated**: February 2026  
**Version**: 2.0 - Enhanced with 10,000 image support and folder upload

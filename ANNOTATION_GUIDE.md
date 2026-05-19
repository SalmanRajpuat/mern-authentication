# Custom Object Annotation & Training Guide

## Overview
The system now supports **proper custom object detection training** with bounding box annotations. This generates YOLO-format datasets that can be used to train custom YOLO models.

---

## 🎯 Two Training Modes

### 1. Person (Face Recognition)
- **Use Case**: Recognize specific individuals by face
- **Minimum Images**: 20 photos
- **Process**: 
  - Upload face photos → Direct training
  - Uses OpenCV LBPH face recognition
  - No annotation needed (automatic face detection)
- **Best For**: Security systems, attendance tracking, personalized experiences

### 2. Custom Object Detection
- **Use Case**: Detect any custom object (logo, product, animal, etc.)
- **Minimum Images**: 5 photos
- **Process**: 
  - Upload images → **Annotate** (draw boxes) → Training
  - Creates YOLO-format dataset
  - Requires manual bounding box annotation
- **Best For**: Product detection, quality control, specific item tracking

---

## 📦 New Annotation Workflow

### Step 1: Upload Images
1. Go to **Admin Panel**
2. Click **"Add Custom Object"**
3. Select **"Custom Object"** type
4. Fill in:
   - **Object Name**: `my_logo` (identifier, lowercase)
   - **Display Name**: `My Company Logo` (shown in UI)
   - **Description**: Brief description (optional)
5. Upload images:
   - **Select Multiple Images**: Choose files one by one
   - **Select Entire Folder**: Upload all images from a folder at once
   - Supports up to **10,000 images**
   - Minimum **5 images** required

### Step 2: Annotate Objects
After clicking **"Next: Annotate Objects →"**, you'll enter the annotation interface:

#### Annotation Interface Controls:
- **Canvas**: Click and drag to draw bounding boxes
- **Navigation**: ← → buttons to move between images
- **Clear**: Remove all boxes from current image
- **Counter**: Shows boxes drawn on current image
- **Save All**: Complete annotation and start training

#### How to Annotate:
1. **Draw Boxes**: Click and drag mouse to create rectangles around objects
   - Box must be at least 10x10 pixels
   - Draw tight boxes around each object instance
   - Multiple objects per image are supported

2. **Navigate Images**:
   - Use **Previous/Next** buttons
   - Current progress shown: "Image 5 of 100"
   - Annotations are preserved when switching images

3. **Review & Adjust**:
   - Green boxes show saved annotations
   - Purple box shows current drawing
   - Use **Clear** button to remove boxes from current image

4. **Complete**:
   - Annotate as many images as needed (not all required)
   - Click **"Save All (X annotated)"** to finish
   - System automatically starts training

### Step 3: Training
After annotation:
1. Images and labels are uploaded to backend
2. YOLO dataset structure is created:
   ```
   yolo_datasets/
   └── my_logo/
       ├── images/
       │   └── train/
       │       ├── my_logo_00000.jpg
       │       ├── my_logo_00001.jpg
       │       └── ...
       ├── labels/
       │   └── train/
       │       ├── my_logo_00000.txt
       │       ├── my_logo_00001.txt
       │       └── ...
       └── data.yaml
   ```
3. Training completes automatically

---

## 📂 YOLO Dataset Format

### Directory Structure
```
DetectionModel/
└── custom_objects/
    ├── training_data/           # All uploaded images
    │   └── my_logo/
    │       ├── my_logo_00000.jpg
    │       └── ...
    └── yolo_datasets/           # Annotated YOLO datasets
        └── my_logo/
            ├── images/
            │   └── train/       # Training images (with annotations)
            ├── labels/
            │   └── train/       # YOLO format label files
            └── data.yaml        # YOLO configuration
```

### Label Format (YOLO)
Each `.txt` label file contains one line per object:
```
class_id x_center y_center width height
```
- **class_id**: Always `0` (single class per dataset)
- **Coordinates**: Normalized 0-1 relative to image dimensions
- **Example**: `0 0.5 0.3 0.2 0.4`
  - Object at center-left (50%, 30%)
  - Box size: 20% width, 40% height

### data.yaml Configuration
```yaml
path: /absolute/path/to/dataset
train: images/train
val: images/train

nc: 1
names: ['My Company Logo']
```

---

## 🚀 Training Custom YOLO Model

### Option 1: Manual Training (Advanced)
After dataset is created, train a custom YOLO model:

```bash
cd DetectionModel
pip install ultralytics

# Train custom model
yolo train data=custom_objects/yolo_datasets/my_logo/data.yaml \
           model=yolo11n.pt \
           epochs=50 \
           imgsz=640 \
           patience=10

# Results saved to: runs/detect/train/weights/best.pt
```

### Training Parameters:
- **epochs**: 50-100 (more = better, but slower)
- **imgsz**: 640 (standard), 1280 (high quality)
- **patience**: Early stopping after N epochs without improvement
- **batch**: -1 (auto), 16, 32 (adjust based on GPU memory)

### Option 2: Automatic Integration (Future)
Replace the built-in YOLO model with your trained one:
```python
# In detection_api.py
model = YOLO('custom_objects/yolo_datasets/my_logo/runs/detect/train/weights/best.pt')
```

---

## 💡 Best Practices

### Image Guidelines
✅ **Good Images**:
- Various angles (front, side, perspective)
- Different lighting (bright, dim, shadows)
- Multiple backgrounds
- Different distances (close, far)
- High resolution (at least 640x640)

❌ **Avoid**:
- Blurry images
- All identical angles
- Only one background
- Extreme occlusion
- Very low resolution

### Annotation Tips
1. **Tight Boxes**: Draw boxes close to object edges
2. **Complete Objects**: Include full object, not partial
3. **Consistency**: Same annotation style across all images
4. **Multiple Instances**: Mark ALL objects in each image
5. **Quality over Quantity**: 50 well-annotated images > 500 poorly annotated

### Dataset Size Recommendations
| Use Case | Minimum | Recommended | Optimal |
|----------|---------|-------------|---------|
| Simple object (logo) | 50 | 200 | 500+ |
| Complex object | 100 | 500 | 1000+ |
| Multiple variations | 200 | 1000 | 5000+ |

---

## 🔧 Troubleshooting

### "Annotations not saved"
- Check browser console for errors
- Ensure boxes are at least 10x10 pixels
- Verify clicking "Save All" button

### "Training failed"
- Check Python console for detailed errors
- Verify at least 1 annotated image exists
- Ensure disk space available
- Check image file formats (JPG/PNG)

### "Dataset not created"
- Verify `objectType` is `'object'` (not `'person'`)
- Check annotations were provided
- Look for `data.yaml` file in dataset directory

### "Poor detection accuracy"
- Add more training images
- Improve annotation quality (tighter boxes)
- Increase epochs during training
- Use higher resolution images

---

## 📊 Workflow Comparison

### Old Workflow (Person Only)
```
Upload Images → Face Detection → Training → Done
```

### New Workflow (Custom Objects)
```
Upload Images → Annotate (Draw Boxes) → Generate Dataset → Training → Done
                                         ↓
                                    YOLO Format Ready
```

---

## 🎓 Example Use Cases

### 1. Logo Detection
```
1. Collect 100 images with your logo at various sizes/angles
2. Annotate: Draw boxes around logo in each image
3. Train: System creates YOLO dataset
4. Result: Detect your logo in any image/video
```

### 2. Product Quality Control
```
1. Capture 200 images of defective products
2. Annotate: Mark defect regions
3. Train: Custom defect detection model
4. Deploy: Real-time defect detection on production line
```

### 3. Wildlife Monitoring
```
1. Trail camera images (500 images of specific animal)
2. Annotate: Box around animal in each frame
3. Train: Species-specific detector
4. Use: Automated wildlife counting
```

---

## 🚦 Current Status

### ✅ Implemented
- Image upload (single/multiple/folder)
- Interactive bounding box annotation
- YOLO dataset generation (images + labels)
- data.yaml configuration file
- Backend API for annotation handling
- Proper directory structure

### 🔄 In Progress
- Automatic YOLO model training integration
- Real-time detection with custom models
- Dataset validation and quality checks

### 📋 Future Enhancements
- Pre-trained model suggestions
- Auto-annotation with AI assistance
- Dataset splitting (train/val/test)
- Augmentation options
- Model performance metrics
- Export trained models

---

## 📚 Additional Resources

### YOLO Documentation
- [Ultralytics YOLO Docs](https://docs.ultralytics.com/)
- [YOLO Training Guide](https://docs.ultralytics.com/modes/train/)
- [Custom Dataset Format](https://docs.ultralytics.com/datasets/detect/)

### Tips & Tutorials
- [Data Annotation Best Practices](https://roboflow.com/annotate)
- [YOLO Model Selection](https://docs.ultralytics.com/models/)
- [Training Optimization](https://docs.ultralytics.com/guides/hyperparameter-tuning/)

---

## 🆘 Need Help?

Check:
1. Python console output for detailed errors
2. Browser console for frontend issues
3. `YOLO_TRAINING.md` for advanced training
4. Dataset directory for generated files

---

**Last Updated**: February 22, 2026
**Version**: 2.0.0

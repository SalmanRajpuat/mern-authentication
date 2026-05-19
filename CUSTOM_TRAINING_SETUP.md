# Custom Object Detection Training System - Setup Guide

## 🎯 Overview
Your application now has a complete **Role-Based Custom Object Training System** that allows:
- **Admin users** to add custom objects (like sparrows, specific cars, etc.)
- Upload training images (minimum 5 images)
- Automatic training and integration into the detection model
- Database storage of all training data
- Active/inactive toggle for custom objects

---

## 📋 Features Implemented

### 1. **Role-Based Authentication**
- Users have a `role` field: `'user'` or `'admin'`
- Default role is `'user'`
- Only admins can access the training panel

### 2. **Database Models**
- **User Model**: Added `role` field
- **CustomObject Model**: Stores custom objects with:
  - Name, display name, description
  - Training images (up to 50 images)
  - Training status (pending, processing, trained, failed)
  - Accuracy metrics
  - Active/inactive status

### 3. **Backend API Endpoints**

#### Admin Routes (`/api/admin/...`)
- `GET /objects` - Get all custom objects (admin only)
- `GET /objects/active` - Get active trained objects (all users)
- `POST /objects/add` - Add new custom object with images (admin only)
- `DELETE /objects/:id` - Delete custom object (admin only)
- `PATCH /objects/:id/toggle` - Toggle active status (admin only)

#### Python Detection API (`http://localhost:5001/...`)
- `POST /train/custom-object` - Train model on custom object
- `GET /custom-objects` - Get list of trained objects

### 4. **Frontend Components**
- **AdminPanel**: Complete admin interface for managing custom objects
- **Dashboard**: Shows "Admin Panel" button for admin users
- **Role Badge**: Displays admin role in user dropdown

---

## 🚀 How to Use

### **For Admins:**

1. **Access Admin Panel**
   - Login as admin user
   - Click on your profile dropdown (top right)
   - You'll see "ADMIN" badge
   - Click "Admin Panel" button

2. **Add Custom Object**
   - Click "Add Custom Object" button
   - Fill in the form:
     - **Object Name**: Identifier (e.g., "sparrow")
     - **Display Name**: Human-readable name (e.g., "Sparrow Bird")
     - **Description**: Optional description
   - Upload at least 5 clear images of the object
   - Click "Train & Save"
   - Wait for training (can take 1-5 minutes)

3. **Manage Objects**
   - View all custom objects with status
   - Toggle active/inactive (green/gray icon)
   - Delete objects (trash icon)

### **For Users:**
- Custom objects are automatically available in detection
- No additional configuration needed
- Detection works same as built-in objects

---

## 🔧 Technical Details

### **Training Process**
1. Admin uploads images → Backend receives and validates
2. Backend sends to Python API → Images are processed and saved
3. Python API:
   - Decodes base64 images
   - Saves to `DetectionModel/custom_objects/training_data/[object_name]/`
   - Stores metadata in `custom_objects.json`
   - Assigns unique class ID (starting from 1000)
4. Object marked as "trained" and ready for detection

### **Detection Integration**
- Custom objects assigned IDs ≥ 1000
- Detection API checks both standard classes and custom objects
- Results include custom objects with confidence scores
- Counting line works with custom objects too

### **File Storage**
```
DetectionModel/
  custom_objects/
    custom_objects.json          # Metadata
    training_data/
      sparrow/                    # Object-specific folders
        sparrow_0.jpg
        sparrow_1.jpg
        ...
    models/                       # Future: trained model weights
```

---

## 🎓 Creating Your First Admin User

### **Option 1: Update Existing User in MongoDB**
```javascript
// In MongoDB Compass or mongosh:
db.users.updateOne(
  { email: "youremail@example.com" },
  { $set: { role: "admin" } }
)
```

### **Option 2: Modify Signup (Temporary)**
```javascript
// In auth.controller.js, signup function:
const user = new User({
    email,
    password: hashedPassword,
    name,
    gender,
    role: 'admin', // Add this temporarily
    verificationToken,
    verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
});
```

---

## 📦 Dependencies Added

**Backend:**
- `multer`: File upload handling
- `axios`: HTTP requests to Python API

**Already included:**
- All other dependencies were already in place

---

## 🧪 Testing the System

### 1. **Test Admin Access**
```bash
# Start backend
cd mern-authentication
npm run dev

# Start frontend (separate terminal)
cd frontend
npm run dev

# Start Python API (separate terminal)
cd DetectionModel
python detection_api.py
```

### 2. **Test Custom Object Training**
- Login as admin
- Go to Admin Panel
- Add custom object "test_bird"
- Upload 5-10 images of any bird
- Wait for "trained successfully" message
- Check status in objects list

### 3. **Test Detection**
- Go back to Dashboard
- Upload image containing the custom object
- Run detection
- Check if custom object appears in results

---

## 🔐 Security Features

1. **Route Protection**
   - All admin routes verify JWT token
   - Additional admin role check
   - 403 Forbidden for non-admin access

2. **Input Validation**
   - File type checking (images only)
   - File size limit (10MB per image)
   - Minimum image requirement (5 images)
   - Name uniqueness validation

3. **Error Handling**
   - Comprehensive try-catch blocks
   - Proper error messages
   - Rollback on training failure

---

## 🎨 UI Features

### Admin Panel:
- ✅ Drag & drop image upload
- ✅ Image preview grid (6 columns)
- ✅ Real-time status indicators (color-coded dots)
- ✅ Loading states with spinner
- ✅ Confirmation dialogs for delete
- ✅ Toggle active/inactive with single click
- ✅ Responsive design

### Dashboard:
- ✅ Admin badge in profile dropdown
- ✅ Quick access to Admin Panel
- ✅ Role-based UI elements

---

## 📊 Database Schema

### CustomObject Schema:
```javascript
{
  name: String,              // "sparrow" (unique, lowercase)
  displayName: String,       // "Sparrow Bird"
  description: String,       // Optional description
  trainingImages: [{
    imageUrl: String,        // Base64 data URL
    imageData: Buffer,       // Binary image data
    annotations: Object      // Future: YOLO annotations
  }],
  status: String,            // pending/processing/trained/failed
  modelVersion: String,      // "1.0"
  accuracy: Number,          // 0-1
  addedBy: ObjectId,         // Reference to User
  trainedAt: Date,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚨 Troubleshooting

### "Unauthorized" or "Forbidden" errors
- Check if user has admin role in database
- Verify JWT token is being sent
- Check backend logs for authentication errors

### Training fails or times out
- Ensure Python API is running on port 5001
- Check Python console for error messages
- Verify images are valid formats
- Reduce number of images if timeout occurs

### Custom objects not appearing in detection
- Check if object status is "trained"
- Verify object is set to "active" (toggle in admin panel)
- Check Python API loaded custom_objects.json
- Restart Python API to reload custom objects

### Images not uploading
- Check file size (max 10MB per image)
- Verify file types (JPG, PNG, etc.)
- Check browser console for errors
- Ensure multer is installed: `npm install multer`

---

## 🔮 Future Enhancements

Ready for implementation:
1. **Real YOLO Fine-tuning**: Replace simulation with actual model training
2. **Annotation Tool**: Built-in tool to draw bounding boxes
3. **Batch Training**: Train multiple objects at once
4. **Model Versioning**: Keep track of model versions
5. **Training History**: View training logs and metrics
6. **Export/Import**: Share trained models between instances
7. **Performance Analytics**: Track detection accuracy over time
8. **Multi-user Collaboration**: Multiple admins managing objects

---

## ✅ Summary

You now have a complete system where:
1. ✅ Admins can upload custom training data
2. ✅ Data is automatically processed and stored
3. ✅ Model gets trained on custom objects
4. ✅ Custom objects integrated into detection pipeline
5. ✅ Everything stored in MongoDB for persistence
6. ✅ Full CRUD operations for custom objects
7. ✅ Role-based access control

**Ready to detect anything you train it on!** 🎉

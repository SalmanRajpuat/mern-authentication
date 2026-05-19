# 🔐 Role-Based Access Control System

This application implements a complete **Role-Based Access Control (RBAC)** system with two distinct user roles:

## 👥 User Roles

### 1. 🛡️ **Admin Role**
**Purpose**: Manage custom object detection models and training

**Access**: `/admin` route

**Capabilities**:
- ✅ Add custom objects for detection
- ✅ Upload training images (minimum 5 required, maximum 50)
- ✅ Train custom object detection models
- ✅ View all custom objects with their training status
- ✅ Activate/Deactivate custom objects
- ✅ Delete custom objects
- ✅ View training accuracy and status
- ❌ Cannot access user detection page

**Features**:
- Full admin panel with object management
- Custom object training workflow
- Training image upload (up to 50 images per object)
- Model training integration with Python backend
- Status tracking (pending, processing, trained, failed)
- Toggle object active/inactive status
- Delete custom objects

---

### 2. 👤 **User Role** (Default)
**Purpose**: Use the detection system for image and video analysis

**Access**: `/detection` route

**Capabilities**:
- ✅ Upload images for object detection
- ✅ Upload videos for object detection with counting
- ✅ Use webcam for real-time detection
- ✅ Adjust counting line position for video detection
- ✅ View detection results with annotations
- ✅ View object statistics and summaries
- ❌ Cannot access admin panel
- ❌ Cannot train custom models

**Features**:
- Three detection modes:
  - **Image Detection**: Upload and analyze images
  - **Video Detection**: Process videos with object counting and line crossing detection
  - **Webcam Detection**: Real-time object detection from camera feed
- Interactive counting line for video detection (drag to adjust)
- Annotated results with bounding boxes
- Detection statistics (total objects, confidence scores, processing time)
- Object count summaries

---

## 🔄 Routing System

### Route Protection
```
/ (root)           → Redirects based on role
                     Admin → /admin
                     User → /detection

/admin             → Admin Panel (Admin only)
/detection         → User Detection Page (User only)
/login             → Login Page (Unauthenticated only)
/signup            → Signup Page (Unauthenticated only)
/verify-email      → Email Verification
/forgot-password   → Password Reset Request
/reset-password    → Password Reset
```

### Route Guards
1. **ProtectedRoute**: Ensures user is authenticated and verified
2. **AdminRoute**: Ensures user is authenticated, verified, AND has admin role
3. **UserRoute**: Ensures user is authenticated, verified, AND has user role
4. **RedirectAuthenticatedUser**: Redirects logged-in users away from auth pages

---

## 🎯 How It Works

### On Login/Signup:
1. User authenticates successfully
2. System checks user role from database
3. Automatically redirects to appropriate page:
   - Admin → `/admin` (Admin Panel)
   - User → `/detection` (Detection Page)

### Access Control:
- **Admins** trying to access `/detection` → Redirected to `/admin`
- **Users** trying to access `/admin` → Redirected to `/detection`
- **Unauthenticated** users → Redirected to `/login`
- **Unverified** users → Redirected to `/verify-email`

---

## 🔧 Backend Implementation

### User Model
```javascript
{
  email: String,
  password: String (hashed),
  name: String,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'  // All new users are 'user' by default
  },
  gender: String,
  isVerified: Boolean,
  lastLogin: Date
}
```

### Middleware
1. **verifyToken**: Validates JWT token
2. **verifyAdmin**: Checks if user has admin role

### Protected Routes
```javascript
// Admin only endpoints
GET    /api/admin/objects              - Get all custom objects
POST   /api/admin/objects/add          - Add and train custom object
DELETE /api/admin/objects/:id          - Delete custom object
PATCH  /api/admin/objects/:id/toggle   - Toggle object active status

// All authenticated users
GET    /api/admin/objects/active       - Get active objects for detection
```

---

## 📋 Selecting Your Role

### During Signup (Recommended)
Users can now select their role directly during the signup process:

1. Go to the Signup page
2. Fill in your details (Name, Email, Password, Gender)
3. **Select your role**:
   - 👤 **User** - Object Detection (default)
   - 🛡️ **Admin** - Model Training & Management
4. Complete signup and verify your email
5. Login and you'll be redirected to the appropriate page based on your role

### Method 2: Using the Script (For existing users)
```bash
cd backend
node make-admin.js <email>
```

### Method 3: Manually in MongoDB (For existing users)
```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "admin" } }
)
```

### Method 4: During Development (MongoDB Compass)
1. Open MongoDB Compass
2. Connect to your database
3. Navigate to `users` collection
4. Find the user document
5. Edit the `role` field to `"admin"`
6. Save changes

---

## 🎨 UI Differences

### Admin Panel (`/admin`)
- Dark theme with emerald/green accents
- Admin badge (shield icon) in header
- "Add Custom Object" button
- Training form with image upload
- Object management list with:
  - Status indicators (trained, processing, failed)
  - Active/Inactive toggles
  - Delete buttons
  - Training statistics

### User Detection Page (`/detection`)
- Dark theme with green accents
- Three detection mode cards
- File upload areas
- Video preview with draggable counting line
- Real-time webcam preview
- Detection results with:
  - Annotated images/videos
  - Object statistics
  - Confidence scores
  - Processing time
  - Object count summaries

---

## 🔐 Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **Password Hashing**: Bcrypt for password security
3. **Email Verification**: Users must verify email before access
4. **Role-Based Middleware**: Server-side role verification
5. **Protected Routes**: Frontend and backend route protection
6. **Cookie Security**: HTTP-only cookies for token storage

---

## 🚀 Testing the System

### Test as Admin:
1. Make your account an admin using the script
2. Login → Should redirect to `/admin`
3. Try adding a custom object with training images
4. View the training status
5. Try navigating to `/detection` → Should redirect back to `/admin`

### Test as User:
1. Create a new account (default role is 'user')
2. Verify email
3. Login → Should redirect to `/detection`
4. Try image/video/webcam detection
5. Try navigating to `/admin` → Should redirect back to `/detection`

---

## 📊 Complete Feature Matrix

| Feature | Admin | User |
|---------|-------|------|
| Add Custom Objects | ✅ | ❌ |
| Train Detection Models | ✅ | ❌ |
| Upload Training Images | ✅ | ❌ |
| Manage Objects | ✅ | ❌ |
| Image Detection | ❌ | ✅ |
| Video Detection | ❌ | ✅ |
| Webcam Detection | ❌ | ✅ |
| View Detection Results | ❌ | ✅ |
| Adjust Counting Line | ❌ | ✅ |
| Access Admin Panel | ✅ | ❌ |
| Access Detection Page | ❌ | ✅ |

---

## 🔄 User Flow Diagram

```
┌─────────────┐
│   Signup    │
└──────┬──────┘
       │ (role: 'user' by default)
       ▼
┌─────────────┐
│Verify Email │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Login    │
└──────┬──────┘
       │
       ▼
   ┌───────────────┐
   │  Check Role   │
   └───┬───────┬───┘
       │       │
   Admin     User
       │       │
       ▼       ▼
┌──────────┐ ┌──────────┐
│  /admin  │ │/detection│
│          │ │          │
│Training  │ │Detection │
│Features  │ │Features  │
└──────────┘ └──────────┘
```

---

## 📝 Notes

- **Role Selection**: Users can now choose their role (User or Admin) during signup
- **Default Role**: If role is not specified, 'user' is automatically assigned
- **Admin Creation**: Admins can be created during signup or promoted manually using the script/database
- **Role Changes**: For existing users, use the make-admin script or update the database directly
- **Detection**: Both roles can see detection results, but only users can perform detections
- **Training**: Only admins can train new models and manage custom objects

---

## 🛠️ Troubleshooting

### Issue: User not redirecting to correct page
**Solution**: Clear cookies and login again

### Issue: Admin can't access admin panel
**Solution**: Verify role is exactly "admin" in database (case-sensitive)

### Issue: Route protection not working
**Solution**: Check that JWT token is valid and user is verified

### Issue: Detection not working for users
**Solution**: Ensure Python backend (port 5001) is running

---

## 📚 Related Files

### Frontend:
- `frontend/src/App.jsx` - Route definitions and guards
- `frontend/src/pages/AdminPanel.jsx` - Admin interface
- `frontend/src/pages/UserDetectionPage.jsx` - User detection interface
- `frontend/src/store/authStore.js` - Authentication state management

### Backend:
- `backend/models/user.model.js` - User schema with roles
- `backend/middleware/verifyAdmin.js` - Admin verification middleware
- `backend/middleware/verifyToken.js` - Token verification middleware
- `backend/routes/admin.route.js` - Admin-only endpoints
- `backend/routes/auth.route.js` - Authentication endpoints
- `make-admin.js` - Script to promote users to admin

### Detection:
- `DetectionModel/detection_api.py` - Python detection API
- `DetectionModel/custom_objects/` - Custom trained models storage
- `DetectionModel/results/` - Detection results storage

---

**Last Updated**: February 2026

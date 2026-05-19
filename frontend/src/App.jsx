import FloatingShape from "./components/FloatingShape";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Navigate } from "react-router-dom";
import LoadingSpinner from "./components/LoadingSpinner";
import DashboardPage from './pages/DashboardPage';
import AdminPanel from './pages/AdminPanel';
import UserDetectionPage from './pages/UserDetectionPage';
import DetectionHistoryPage from './pages/DetectionHistoryPage';
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import EmailVerificationPage from './pages/EmailVerificationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { useAuthStore } from "./store/authStore";
import {useEffect } from "react"; 

//to protect our routes - redirects based on role
const ProtectedRoute = ({children})=>{
 const {isAuthenticated,user} = useAuthStore();

 if(!isAuthenticated){
  return <Navigate to="/login" replace />
 }

if(!user?.isVerified){
  return <Navigate to="/verify-email" replace />
 }

 // Role-based routing
 if(user?.role === 'admin'){
  return <Navigate to="/admin" replace />
 } else {
  return <Navigate to="/detection" replace />
 }
}

//redirect authenticated users to homepage
const RedirectAuthenticatedUser = ({children})=>{
  const {isAuthenticated,user} = useAuthStore();

  if(isAuthenticated && user.isVerified){
    // Role-based redirect
    if(user?.role === 'admin'){
      return <Navigate to="/admin" replace />
    } else {
      return <Navigate to="/detection" replace />
    }
  }

  return children;
}

// Admin only route
const AdminRoute = ({children}) => {
  const {isAuthenticated, user} = useAuthStore();

  if(!isAuthenticated){
    return <Navigate to="/login" replace />
  }

  if(!user?.isVerified){
    return <Navigate to="/verify-email" replace />
  }

  if(user?.role !== 'admin'){
    return <Navigate to="/detection" replace />
  }

  return children;
}

// User only route
const UserRoute = ({children}) => {
  const {isAuthenticated, user} = useAuthStore();

  if(!isAuthenticated){
    return <Navigate to="/login" replace />
  }

  if(!user?.isVerified){
    return <Navigate to="/verify-email" replace />
  }

  if(user?.role === 'admin'){
    return <Navigate to="/admin" replace />
  }

  return children;
}

function App() {
  const {isCheckingAuth, checkAuth}= useAuthStore();

  useEffect(()=>{
    checkAuth()
  },[checkAuth])

  if(isCheckingAuth) return <LoadingSpinner/>
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center relative overflow-hidden">
      <FloatingShape
        color="bg-green-500"
        size="w-64 h-64"
        top="-5%"
        left="10%"
        delay={0}
      />
      <FloatingShape
        color="bg-emerald-500"
        size="w-48 h-48"
        top="70%"
        left="80%"
        delay={5}
      />
      <FloatingShape
        color="bg-lime-500"
        size="w-32 h-32"
        top="40%"
        left="-10%"
        delay={2}
      />

      <Routes>
        {/* Landing route - redirects based on role */}
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardPage/>
          </ProtectedRoute> 
        } />

        {/* Admin Panel - Only accessible to admins */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminPanel/>
          </AdminRoute>
        } />

        {/* User Detection Page - Only accessible to regular users */}
        <Route path="/detection" element={
          <UserRoute>
            <UserDetectionPage/>
          </UserRoute>
        } />

        {/* Detection History Page - Only accessible to regular users */}
        <Route path="/detection/history" element={
          <UserRoute>
            <DetectionHistoryPage/>
          </UserRoute>
        } />

        <Route path="/signup" element={<RedirectAuthenticatedUser>
							<SignUpPage/>
				</RedirectAuthenticatedUser>} />

        <Route path="/login" element={<RedirectAuthenticatedUser>
							<LoginPage/>
				</RedirectAuthenticatedUser>}/>
        
         <Route path='/verify-email' element={<EmailVerificationPage />} />
				 <Route
					path='/forgot-password'
					element={
						<RedirectAuthenticatedUser>
							<ForgotPasswordPage />
						</RedirectAuthenticatedUser>
					}
				/>  


        <Route
					path='/reset-password/:token'
					element={
						<RedirectAuthenticatedUser>
							<ResetPasswordPage />
						</RedirectAuthenticatedUser>
					}
				/>  
      </Routes>
      <Toaster />
    </div>
  );
}
export default App;

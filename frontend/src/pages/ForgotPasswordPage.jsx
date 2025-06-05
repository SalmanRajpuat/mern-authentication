import { motion } from "framer-motion";
import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { Link } from "react-router-dom";
import { Mail,ArrowLeft,Loader } from 'lucide-react';
import Input from "../components/Input";

const ForgotPasswordPage = () => {
  const [email,setEmail] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) =>{
    e.preventDefault();
		await forgotPassword(email);
		setIsSubmitted(true);
  }
  
  
  const {isLoading,forgotPassword} = useAuthStore();
    return (
    <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className='max-w-md w-full mx-auto mt-10 p-6 bg-gray-900 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-800 overflow-hidden'
        >

            <div className="p-8 ">
                <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-br from-green-400 to-emerald-500 text-transparent bg-clip-text">
                    Forgot Password
                </h2>

                {!isSubmitted ?(
                    <form onSubmit={handleSubmit}>
                        <p className="text-gray-300 mb-6 text-center">
                            Enter your Email and we will send you a link to reset Password.
                        </p>
                    <Input
                    icon={Mail}
                    type='email'
                    placeholder = 'Email Address'
                    value ={email}
                    onChange={(e) =>setEmail(e.target.value)}
                    required
                    />
                <motion.button
                    className="mt-5 w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white 
          font-bold rounded-lg shadow-lg hover:from-green-600
          hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} 
          type="submit"
          disabled= {isLoading}>
            {isLoading ? <Loader className="w-6 h-6 animate-spin mx-auto"/>:"Send Reset Link"}
                   </motion.button>

                    </form>
                
                ): (
                <div className="text-center">

                
                  <motion.div
            initial={{ scale: 0 }}
            animate={{scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type:"spring", stiffness:500, damping:30 }}
            className='size-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4'
        >
            <Mail className='h-8 w-8 text-white'/>
        </motion.div>
                    <p className="text-gray-300 mb-6">
                        If an account exists for {email}, you will receive a password reset link shortly.
                    </p>

                 </div>   

                )}
            </div>
            <div className="px-8 py-4 bg-gray-900 bg-opacity-50 flex justify-center">
                <Link to={"/login"} className="text-sm text-green-400 hover:underline flex items-center" >
                <ArrowLeft classname='size-4 mr-2'/> Back to Login
                </Link>

            </div>

        </motion.div>
  )
}

export default ForgotPasswordPage

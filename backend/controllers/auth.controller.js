import {User} from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import {generateTokenAndSetCookie} from "../Utils/generateTokenAndSetCookie.js";
import { sendVerificationCode } from '../nodemailer/email.js';
import {sendWelcomeEmail} from '../nodemailer/email.js';
import { sendPasswordResetEmail } from '../nodemailer/email.js';
import { sendResetSuccessEmail } from '../nodemailer/email.js';
import crypto from "crypto";
import dotenv from 'dotenv';
dotenv.config();

export const signup = async (req, res) => {
    const {email, password, name} = req.body;
    try {
        if(!email || !password || !name){
            throw new Error("All fileds are required");
        }

        const userAlreadyExists = await  User.findOne({email});
        if(userAlreadyExists){
            return res.status(400).json({success:false, message: "User Already Exists"});
        }

        const hashedPassword = await bcryptjs.hash(password,10);
        const verificationToken = Math.floor(10000+ Math.random() * 900000).toString();
        const user =  new User({
            email,
            password: hashedPassword,
            name,
            verificationToken,
            verificationTokenExpiresAt: Date.now()+24*60*60*1000// = 24 hours
        })

        await user.save();
        generateTokenAndSetCookie(res,user._id);

        sendVerificationCode(user.email,verificationToken);

        res.status(201).json({
            success: true,
            message: "User created successfully",
            user: {
                ...user._doc,
                password: undefined,
            },

        });

    } catch (error) {
        res.status(400).json({success: false, message: error.message});
    }
};
// postman desktop free

export const login = async (req, res) => {
    const {email, password} = req.body;
    try {
        const user = await User.findOne({email});
        if(!user){
            return res.status(400).json({success: false, message: "Invalid Credentials"});
        }
        const isPasswordValid = await bcryptjs.compare(password, user.password);

        if(!isPasswordValid){
            return res.status(400).json({success: false, message: "Invalid Password"});
        }

        generateTokenAndSetCookie(res, user._id);
        user.lastLogin = new Date();
        await user.save();

        const userObj = user.toObject();
        delete userObj.password;

        res.status(200).json({
            success: true,
            message: "Logged in successfully",
            user: userObj,
        });

    } catch (error) {
        console.log("Error in here");
        res.status(400).json({success: false, message: error.message});
    }
};




export const logout = async (req, res) => {
    res.clearCookie("token");
    res.status(201).json({
        success: true,
        message: "Logged out successfully" })
};

export const verifyEmail = async (req,res) => {
  const {code} = req.body;
  try {
    const user = await User.findOne({
        verificationToken: code,
        verificationTokenExpiresAt:{$gt:Date.now()}
    })
    if(!user){
        return res.status(400).json({success:false, message: "invalid or expired token"})
    }


    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();


    await sendWelcomeEmail(user.email, user.name);
    return res.status(201).json({
        success: true,
        message: "Email verified successfully",

    });


       
  } catch (error) {
   return res.status(400).json({success: false, message: error.message});
  }
    
}

export const forgotPassword = async (req,res) => {
    const {email} = req.body;
    try {
        const user = await User.findOne({email});

        if(!user){
            return res.status(400).json({success:false, message: "User not found"});
        }
        const resetToken = crypto.randomBytes(20).toString("hex");
        const resetTokenExpiresAt = Date.now() +    1*60*60*1000;//1 hour

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiresAt = resetTokenExpiresAt;

        await user.save();

        await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);
        
        res.status(200).json({
            success:true,
            message: "Password reset email sent successfully",
        });

    } catch (error) {
        console.log("Error in forgot password", error);
        res.status(400).json({success:false, message: error.message});
    }
};

export const resetPassword = async (req, res) => {
    try {
        const {token} = req.params;
        const {password} = req.body;

        const user = await User.findOne({
            resetPasswordToken:token,
            resetPasswordExpiresAt: {$gt: Date.now()},
        });


        if(!user){
            return res.status(400).json({success:false, message:"Invalid or expired reset token"});
        }
        //update password
        const hashedPassword = await  bcryptjs.hash(password,10);

        user.password = hashedPassword;
        user.resetPasswordToken= undefined;
        user.resetPasswordExpiresAt= undefined;
        await user.save();

        await sendResetSuccessEmail(user.email);

        return res.status(200).json({success:true, message:"Password reset successful"});

    } catch (error) {
        console.log("Error in resetPassword", error);
        res.status(400).json({success:false, message:error.message});
    }
}

export const checkAuth = async (req,res) => {
    try {
        const user = await User.findById(req.userId).select("-password");
        if(!user){
            return res.status(400).json({success:false, message:"User not found"});
        }

        res.status(200).json({success:true, user})
    } catch (error) {
        console.log("Error in checkAuth", error);
        res.status(400).json({success:false, message:error.message});
    }
}
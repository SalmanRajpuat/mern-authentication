import nodemailer from "nodemailer";
import { transporter, createTransporter } from "./mailtrap.config.js";
import { PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE, Welcome_Email_Template } from "./emailTemplate.js";

// Helper function to ensure transporter is ready
const getTransporter = async () => {
    if (!transporter) {
        return await createTransporter();
    }
    return transporter;
};

export const sendVerificationCode= async(email, verificationToken) =>{
    try {
        const emailTransporter = await getTransporter();
        const response = await emailTransporter.sendMail({
              from: '"Salman Ahmad" <salmanwzdd@gmail.com>',
              to: email,
              subject: "Verify Your Email",
              text: "Verify your Email", // plain‑text body
              html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}",verificationToken), // HTML body
        });
        console.log('✅ Verification Email sent successfully');
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(response));
    } catch (error) {
        console.log('❌ Email Error:', error);
        throw error;
    }
}

export const sendWelcomeEmail = async(email, name) =>{
    try {
        const emailTransporter = await getTransporter();
        const response = await emailTransporter.sendMail({
              from: '"Salman Ahmad" <salmanwzdd@gmail.com>',
              to: email,
              subject: "Welcome to our web",
              text: "Welcome email", // plain‑text body
              html: Welcome_Email_Template.replace("{name}", name), // HTML body
        });
        console.log('✅ Welcome Email sent successfully');
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(response));
    } catch (error) {
        console.log('❌ Welcome Email Error:', error);
        throw error;
    }
}

export const sendPasswordResetEmail = async (email,resetURL) => {
    try {
        const emailTransporter = await getTransporter();
        const response = await emailTransporter.sendMail({
            from: '"Salman Ahmad" <salmanwzdd@gmail.com>',
            to: email,
            subject: "Reset your password",
            html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
        });
        console.log('✅ Password Reset Email sent successfully');
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(response));
    } catch (error) {
        console.log('❌ Error sending password reset email:', error);
        throw new Error("Failed to send password reset email");
    }
}

export const sendResetSuccessEmail = async(email) =>{
    try {
        const emailTransporter = await getTransporter();
        const response = await emailTransporter.sendMail({
            from: '"Salman Ahmad" <salmanwzdd@gmail.com>',
            to: email,
            subject: "Password Reset Successful",
            html: PASSWORD_RESET_SUCCESS_TEMPLATE,
        });
        console.log('✅ Password Reset Success Email sent successfully');
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(response));
    } catch (error) {
        console.error('❌ Error sending password reset success email:', error);
        throw new Error(`Error sending password success email: ${error.message}`);
    }
};
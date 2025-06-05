import { transporter } from "./mailtrap.config.js";
import { PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE, Welcome_Email_Template } from "./emailTemplate.js";


export const sendVerificationCode= async(email, verificationToken) =>{
    try {
        const response = await transporter.sendMail({
              from: '"Salman Ahmad" <salmanwzdd@gmail.com>',
              to: email,
              subject: "Verify Your Email",
              text: "Verify your Email", // plain‑text body
              html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}",verificationToken), // HTML body
        });
        console.log('Email sent successfully',response);
    } catch (error) {
        console.log('Email Error');
    }
}

export const sendWelcomeEmail = async(email, name) =>{
    try {
        const response = await transporter.sendMail({
              from: '"Salman Ahmad" <salmanwzdd@gmail.com>',
              to: email,
              subject: "Welcome to our web",
              text: "Welcome email", // plain‑text body
              html: Welcome_Email_Template.replace("{name}", name), // HTML body
        });
        console.log('Email sent successfully',response);
    } catch (error) {
        console.log('Email Error');
    }
}

export const sendPasswordResetEmail = async (email,resetURL) => {

    try {
        const response = await transporter.sendMail({
            from: '"Salman Ahmad" <salmanwzdd@gmail.com>',
            to: email,
            subject: "Reset your password",
            html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
            category: "Password Reset",
        });
    } catch (error) {
        console.log('Error sending in password ', error);
        throw new Error("Failed to send password reset email");
    }
}

export const sendResetSuccessEmail = async(email) =>{
    try {
        const response = await transporter.sendMail({
            from: '"Salman Ahmad" <salmanwzdd@gmail.com>',
            to: email,
            subject: "Reset Password is successful",
            html: PASSWORD_RESET_SUCCESS_TEMPLATE,
            category: "Password Reset",
        });

        console.log("Password reset email sent successfully", response);
    } catch (error) {
        console.error("Error sending password reset success email",error);
        throw new Error(`Error sending password success email: $(error)`);
        
    }
};
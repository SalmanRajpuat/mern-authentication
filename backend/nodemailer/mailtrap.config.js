import nodemailer from 'nodemailer';

// Create test account for development (no signup required)
let transporter;

const createTransporter = async () => {
    try {
        // Generate test SMTP service account from ethereal.email
        const testAccount = await nodemailer.createTestAccount();
        
        transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        
        console.log('✅ Ethereal Email transporter created successfully');
        console.log('📧 Test account created:', testAccount.user);
        
        return transporter;
    } catch (error) {
        console.error('❌ Error creating email transporter:', error);
        throw error;
    }
};

// Initialize transporter
createTransporter().catch(console.error);

export { transporter, createTransporter };




const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

const sendOTP = async (phone, otp) => {
    try {
        await client.messages.create({
            body: `Your OTP for registration is: ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
            to: phone,
        });
    } catch (error) {
        console.error("Error sending OTP:", error);
        throw new Error("Failed to send OTP.");
    }
};
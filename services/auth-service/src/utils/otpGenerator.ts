// const OTP_EXPIRY_MINUTES = 5;

export const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // const otp_expiry_minutes = OTP_EXPIRY_MINUTES * 60 * 1000;

    return {otp};
}


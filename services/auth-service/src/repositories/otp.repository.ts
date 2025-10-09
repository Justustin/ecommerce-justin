import { prisma } from '@repo/database';


export default class OTPRepository {
    async insertOTP(phoneNumber: string, otp: string) {

        try {
            const existingOTP = await prisma.otps.findFirst({
                where: { phoneNumber }
            });

            if (existingOTP) {
                return await prisma.otps.update({
                    where: { id: existingOTP.id }, 
                    data: {
                        otp,
                        expiresAt: new Date(0),
                        attempts: 0,
                        createdAt: new Date()
                    }
                });
            } else {
                return await prisma.otps.create({
                    data: {
                        phoneNumber,
                        otp,
                        expiresAt: new Date(0),
                        attempts: 0
                    }
                });
            }
        } catch(error) {
            throw error;
        }
        
    }

    async getOTP(phoneNumber: string, otp: string) {

        try {
            const OTP = await prisma.otps.findUnique({
                where: {phoneNumber}
            });
            return OTP;
        } catch {
            return null;
        }
        


    }
}
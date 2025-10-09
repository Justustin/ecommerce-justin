import UserRepository from "../repositories/user.repository.ts"; 
import OTPRepository from "../repositories/otp.repository.ts";
import bcrypt from 'bcrypt';
import { UserResponseDTO } from "../types/index.ts";
import { generateOTP } from "../utils/otpGenerator.ts";
import { checkWhatsAppStatus, sendOTPViaWhatsApp } from "../client/whatsappClient.ts";

export default class AuthService {
    private user_repository : UserRepository;
    private otp_repository: OTPRepository;

    constructor() {
        this.user_repository = new UserRepository();
        this.otp_repository = new OTPRepository();
        
    }

    async findUser(phoneNumber: string) {
        try {
            const user = await this.user_repository.findByPhoneNumber(phoneNumber);

            if(!user) {
                return null;
            }

            const userResponse : UserResponseDTO = {
                userId: user.id,
                phoneNumber: user.phone_number,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            }

            return userResponse;
        } catch {
            return null;
        }
    }

    async verifyUser(phoneNumber: string, password: string) {
            
        try {
            const user = await this.user_repository.findByPhoneNumber(phoneNumber);

            if(!user) {
                return null;
            }

            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            if(!isPasswordValid) {
                return null;
            }

            const userResponse : UserResponseDTO = {
                userId: user.id,
                phoneNumber: user.phone_number,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            }

            return userResponse;
        } catch {
            return null;
        }
        
    }

    async createUser(phoneNumber: string, firstName: string, lastName: string, password: string) {
       
        try {
            const userExist = await this.user_repository.findByPhoneNumber(phoneNumber);

            if(userExist) {
                throw new Error("User exists already");
            }

            const user = await this.user_repository.createUser(phoneNumber, firstName, lastName, password)

            if(!user) {
                throw new Error("Error when creating user");
            }

            const userResponse : UserResponseDTO = {
                userId: user.id,
                phoneNumber: user.phone_number,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            }

            return userResponse;
        } catch (error){
            throw error;
        }


    }

    async sendOTP(phoneNumber: string) {
        try {
            const {otp} = generateOTP();
            await this.otp_repository.insertOTP(phoneNumber, otp);

            const isConnected = await checkWhatsAppStatus();
            if(!isConnected) {
                throw new Error("Server cannot connect to WhatsApp");
            }

            const response = await sendOTPViaWhatsApp(phoneNumber, otp);
            if(!response.success) {
                throw new Error("Unable to send OTP to WhatsApp")
            }

            return {success: true, message: response.message};
        } catch(error) {
            throw error;
        }
    }

    async verifyOTP(phoneNumber: string, otp: string) {
        try {
            const OTP = await this.otp_repository.getOTP(otp, phoneNumber);

            if(OTP == null) {
                throw new Error("The OTP for this phonenumber is not available");
            }

            const createdAt = new Date(OTP.createdAt);
            const expiry = new Date(createdAt.getTime() + (5 * 60 * 1000));

            if(new Date() > expiry) {
                throw new Error("The OTP has expired");
            }

            if(otp != OTP.otp) {
                throw new Error("Wrong OTP");
            }

            return { success : true, message: "Correct OTP"};

        } catch(error: any)  {
            return { success : false, message: error.mesage};
        }
    }

}
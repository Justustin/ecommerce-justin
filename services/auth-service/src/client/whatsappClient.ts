import axios from 'axios';
import { SendOTPResult } from '../types';

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || "http://localhost:3012"



export const sendOTPViaWhatsApp = async (phoneNumber: string, otp: string) : Promise<SendOTPResult> => {
    try {
        const response = await axios.post(
            `${WHATSAPP_SERVICE_URL}/whatsapp/sendOTP`,
            {phoneNumber, otp},
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            message: response.data.message
        }
    } catch (error) {
        console.log("OTP Sending to whatsapp error");
        return {
            success: false
        }
    }
}


export const checkWhatsAppStatus = async () => {
    try {
        const response = await axios.get(
            `${WHATSAPP_SERVICE_URL}/whatsapp/getConnectionStatus`

        );
        
        return response.data.isConnected;
    } catch (error) {
        return false;
    }
}
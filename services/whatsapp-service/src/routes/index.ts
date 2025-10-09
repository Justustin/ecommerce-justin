import express, { type Request, type Response } from "express";
import { getConnectionStatus, sendOTP } from "../whatsappService";


const router = express.Router();

router.post("/sendOTP", async (req: Request, res: Response) => {
    try {
        const { phoneNumber, otp } = req.body;
        const response = await sendOTP(phoneNumber, otp)
        console.log("GOT RESPONSE: ", response.success);

        if(!response.success) { 
            throw new Error("WhatsApp unable to send OTP");
        }

        return res.json({ success: response.success, message: `Sent OTP to ${phoneNumber}`});
    } catch {
        return res.json(500).json({ success: false, message: `Failed to send OTP`});
    }
})

router.get("/getConnectionStatus", (req: Request, res: Response) => {
    const status = getConnectionStatus();
    res.json(status);
});


export {router};
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys';
import P from 'pino';
import qrcode from 'qrcode-terminal';


let sock: any;
let isConnected = false;

async function startBot(instanceId = 'default'){
    try {
        console.log(`🔄 Starting WhatsApp bot: ${instanceId}`);
        
        const { state, saveCreds} = await useMultiFileAuthState('auth');
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: state,
            logger: P({ level: 'silent'})
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update: any) => {
            const {connection, lastDisconnect, qr} = update;

            if(qr){
                console.log('📱 Scan QR code with your phone!');
                qrcode.generate(qr, {small: true});
            }
            
            if(connection === 'open'){
                console.log('✅ WhatsApp connected successfully!');
                console.log(`Connected as: ${sock.user?.name || 'Unknown'}`);
                isConnected = true;

            }
            
            if (connection === 'close') {
                isConnected = false;
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log(' WhatsApp connection closed');
                console.log('Reason:', lastDisconnect?.error?.output?.statusCode);
                
                if (shouldReconnect) {
                    console.log(`🔄 Reconnecting in 5 seconds...`);
                    setTimeout(() => startBot(instanceId), 5000); 
                } else {
                    console.log('🚪 Logged out - need to scan QR again');
                }
            }
        });
        
    } catch(error) {
        console.error(`[${instanceId}] Error in startBot:`, error);
        console.log('🔄 Retrying in 10 seconds...');
        setTimeout(() => startBot(instanceId), 10000);
    }
    

}


const sendMessage = async (phoneNumber: string, message: string) => {
        try {
            if (!sock) {
                return { success: false, error: 'WhatsApp not connected' };
            }

            // Format Indonesian phone number
            let formattedNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits
            
            if (formattedNumber.startsWith('08')) {
                formattedNumber = '62' + formattedNumber.substring(1); // 08xx → 628xx
            } else if (formattedNumber.startsWith('8')) {
                formattedNumber = '62' + formattedNumber; // 8xx → 628xx
            } else if (!formattedNumber.startsWith('62')) {
                formattedNumber = '62' + formattedNumber; // Add country code
            }
            
            formattedNumber += '@s.whatsapp.net';
            
            console.log(`📤 Sending message to: ${formattedNumber}`);
            await sock.sendMessage(formattedNumber, { text: message });
            
            console.log('✅ Message sent successfully');
            return { success: true };
            
        } catch (error: any) {
            console.error('❌ Failed to send message:', error);
            return { success: false, error: error.message };
        }
    };

const sendOTP = async (phoneNumber: string, otp: string) => {
    const message = `OTP: ${otp}, kode akan kadaluarsa dalam 2 menit`;
    return await sendMessage(phoneNumber, message);
}
// // Test function - add this at the very bottom of your file
// async function testMessage() {
//     // Wait 3 seconds to ensure connection is stable
//     setTimeout(async () => {
//         console.log('🧪 Testing message sending...');
//         const result = await sendMessage('08119883223', 'Test');
//         console.log('Test result:', result);
//     }, 3000);
// }

const getConnectionStatus = () => {
    return {
        isConnected, 
        user: sock?.user || null
    }
}

const startWhatsApp = () => startBot('bot1');

export {sendOTP, sendMessage, startWhatsApp, getConnectionStatus}

import express, {type Request, type Response}  from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser'
import {router} from './routes';

dotenv.config();


const app = express();
const PORT = process.env.API_GATEWAY_PORT;

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: "*"
}));
app.use(helmet());
app.use(cookieParser());

app.use("/", router);



app.listen(PORT, () => {
    console.log(`API GATEWAY LISTENING TO PORT ${PORT}`);
})

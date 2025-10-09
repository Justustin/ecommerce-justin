import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {type Response} from 'express';

const REFRESH_TOKEN_DURATION = '30d'
const ACCESS_TOKEN_DURATION = '30m'

interface tokenPair {
    accessToken : String,
    refreshToken?: String
}

interface AccessTokenOnly {
    accessToken: String
}

const generateToken = (userId: String, phoneNumber: String, role: String, includeRefreshToken: boolean = true) : tokenPair | AccessTokenOnly => {

    try {
        const accessToken = jwt.sign(
            {
                userId,
                phoneNumber,
                role,
                type: "accessToken"
            },
            process.env.JWT_SECRET!,
            { expiresIn: ACCESS_TOKEN_DURATION }
        )

        if(includeRefreshToken) {
            const tokenId = uuidv4();
            const refreshToken = jwt.sign(
                {
                    userId,
                    phoneNumber,
                    tokenId,
                    role,
                    type: "refreshToken"
                },
                process.env.JWT_SECRET!,
                { expiresIn: REFRESH_TOKEN_DURATION }
            )
            return { accessToken, refreshToken };
        }

        return { accessToken };
    } catch(error) {
        throw error;
    }
    
    
}

const setTokenCookies = (res: Response, accessToken: String, refreshToken?: String) => {
    try {
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 30 * 60 * 1000
        })

        if(refreshToken) {
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/api/auth/refresh'
            })
        }
    } catch(error) {
        throw error;
    }
    
  
}

const generateAccessTokenOnly = (userId: String, phoneNumber: String, role: String) : AccessTokenOnly => {
    try {
        return generateToken(userId, phoneNumber, role, false) as AccessTokenOnly
    } catch(error) {
        throw error;
    }
    
}

const generateBothToken = (userId: String, phoneNumber: String, role: String) : tokenPair => {
    try {
        return generateToken(userId, phoneNumber, role, true) as tokenPair
    } catch(error) {
        throw error;
    }
    
}


export {generateAccessTokenOnly, generateBothToken, setTokenCookies}

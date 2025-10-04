import { create } from "domain";
import express, {type Request, type Response} from "express";
import { createProxyMiddleware } from 'http-proxy-middleware';
import authMiddleware from '../middleware/authMiddleware'

const router = express.Router();


router.use("/api/auth", createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    onProxyReq: (req: any, res: any) => {
        console.log(`Proxying to Auth Service: ${req.method} ${req.path}`);
    },
    onError: (err: any, req: any, res: any) => {
        console.error("Auth service is unavailable: ", err.message);
        res.status(503).json({
            error: 'Auth service unavailable'
        })
    }
} as any))


router.use("/api/products", authMiddleware, createProxyMiddleware({
    target: process.env.PRODUCTS_SERVICE_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq: any, req: any, res: any) => {
        proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        proxyReq.setHeader('x-user-phoneNumber', req.headers['x-user-phoneNumber']);
        proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
        console.log(`Proxying to Product Service: ${req.method} ${req.path}`);
    },
    onError: (err: any, req: any, res: any) => {
        console.error("Product service is unavailable: ", err.message);
        res.status(503).json({
            error: 'Product service unavailable'
        })
    }
} as any))


export {router}
import express from 'express';
import { retryFailedOrder, getFailedOrders } from '../controllers/retry.controller.js';

const router = express.Router();

// see all failed orders
router.get('/', getFailedOrders);

// retry one failed order
router.post('/retry', retryFailedOrder);

export default router;
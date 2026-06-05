import express from 'express';
import { getOrderStatus, placeOrder } from '../controllers/order.controller.js';

const router = express.Router();

router.post('/', placeOrder);
router.get('/status/:id', getOrderStatus);

export default router;
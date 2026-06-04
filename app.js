import express from 'express';
import { connectRabbitMQ } from './config/rabbitmq.js';
import orderRoutes from './routes/order.routes.js';
import retryRoutes from './routes/retry.routes.js';

const app = express();
app.use(express.json());

// routes
app.use('/order', orderRoutes);
app.use('/failed-orders', retryRoutes);

// health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// start
connectRabbitMQ().then(() => {
  app.listen(3000, () => console.log('🚀 API running on http://localhost:3000'));
});
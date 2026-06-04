import express from 'express';
import { connectRabbitMQ, getChannel } from './config/rabbitmq.js';

const app = express();
app.use(express.json());

// place an order
app.post('/order', async (req, res) => {
  try {
    const { customerName, item, phone, amount } = req.body;

    const order = {
      id: Date.now(),
      customerName,
      item,
      phone,
      amount,
      status: 'received',
      createdAt: new Date().toISOString()
    };

    const channel = await getChannel();

    // publish to exchange — fans out to ALL workers
    channel.publish(
      'order_exchange',
      '',
      Buffer.from(JSON.stringify(order)),
      { persistent: true }
    );

    console.log(`✅ Order queued: ${order.id} — ${order.item} for ${order.customerName}`);

    res.json({
      success: true,
      message: 'Order received! We are on it.',
      orderId: order.id
    });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ success: false, message: 'Something went wrong' });
  }
});

// start
connectRabbitMQ().then(() => {
  app.listen(3000, () => console.log('🚀 API running on http://localhost:3000'));
});
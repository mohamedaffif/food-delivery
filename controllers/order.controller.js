import { getChannel } from '../config/rabbitmq.js';

export async function placeOrder(req, res) {
  try {
    const { customerName, item, phone, amount } = req.body;

    // validate inputs
    if (!customerName || !item || !phone || !amount) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: customerName, item, phone, amount'
      });
    }

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

    channel.publish(
      'order_exchange',
      '',
      Buffer.from(JSON.stringify(order)),
      { persistent: true }
    );

    console.log(`✅ Order queued: ${order.id} — ${order.item} for ${order.customerName}`);

    res.status(201).json({
      success: true,
      message: 'Order received! We are on it.',
      orderId: order.id
    });

  } catch (err) {
    console.error('Order error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
}
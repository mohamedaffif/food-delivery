import { getChannel } from '../config/rabbitmq.js';

export async function retryFailedOrder(req, res) {
  try {
    const channel = await getChannel();

    // get one failed order from DLQ
    const msg = await channel.get('failed_orders', { noAck: false });

    if (!msg) {
      return res.json({
        success: false,
        message: 'No failed orders to retry'
      });
    }

    const order = JSON.parse(msg.content.toString());

    console.log(`🔄 Retrying order: ${order.id} for ${order.customerName}`);

    // republish to main exchange — goes through all workers again
    channel.publish(
      'order_exchange',
      '',
      Buffer.from(JSON.stringify(order)),
      { persistent: true }
    );

    // remove from DLQ
    channel.ack(msg);

    res.json({
      success: true,
      message: 'Order retried successfully',
      order: {
        id: order.id,
        customerName: order.customerName,
        item: order.item,
        amount: order.amount
      }
    });

  } catch (err) {
    console.error('Retry error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
}

export async function getFailedOrders(req, res) {
  try {
    const channel = await getChannel();

    const failedOrders = [];

    // peek at all failed orders without removing them
    let msg = await channel.get('failed_orders', { noAck: true });

    while (msg) {
      const order = JSON.parse(msg.content.toString());
      failedOrders.push({
        id: order.id,
        customerName: order.customerName,
        item: order.item,
        amount: order.amount,
        createdAt: order.createdAt
      });
      msg = await channel.get('failed_orders', { noAck: true });
    }

    res.json({
      success: true,
      total: failedOrders.length,
      failedOrders
    });

  } catch (err) {
    console.error('Get failed orders error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
}
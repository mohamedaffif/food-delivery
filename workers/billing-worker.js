import amqp from 'amqplib';

async function start() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  await channel.assertExchange('order_exchange', 'fanout', { durable: true });

  const q = await channel.assertQueue('billing_queue', { durable: true });
  await channel.bindQueue(q.queue, 'order_exchange', '');

  channel.prefetch(1);
  console.log('💳 Billing worker ready...');

  channel.consume(q.queue, async (msg) => {
    try {
      const order = JSON.parse(msg.content.toString());

      console.log(`\n[BILLING] Charging ${order.customerName} KES ${order.amount}`);
      await delay(1500);
      console.log(`[BILLING] ✅ Payment confirmed for order ${order.id}`);

      channel.ack(msg);
    } catch (err) {
      console.error('[BILLING] Error:', err.message);
      channel.nack(msg, false, false);
    }
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

start();
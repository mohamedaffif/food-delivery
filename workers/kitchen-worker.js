import amqp from 'amqplib';

async function start() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  await channel.assertExchange('order_exchange', 'fanout', { durable: true });
  await channel.assertExchange('dead_letter_exchange', 'fanout', { durable: true });

  const q = await channel.assertQueue('kitchen_queue', { durable: true,
    arguments: {
      'x-dead-letter-exchange': 'dead_letter_exchange'
    }
   });
  await channel.bindQueue(q.queue, 'order_exchange', '');

  channel.prefetch(1);
  console.log('🍳 Kitchen worker ready...');

  channel.consume(q.queue, async (msg) => {
    try {
      const order = JSON.parse(msg.content.toString());

      console.log(`\n[KITCHEN] New order: ${order.item} for ${order.customerName}`);
      await delay(1000);
      console.log(`[KITCHEN] ✅ ${order.item} is ready!`);

       // simulate random failure to test DLQ
      if (Math.random() < 0.3) {
        throw new Error('Kitchen equipment failure!');
      }

      await delay(1000);
      console.log(`[KITCHEN] ✅ ${order.item} is ready!`);

      channel.ack(msg);
    } catch (err) {
      console.error(`[KITCHEN] ❌ Failed: ${err.message}`);
      channel.nack(msg, false, false); // send to dead letter queue
    }
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

start();
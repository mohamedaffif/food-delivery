import amqp from 'amqplib';

async function startMonitor() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  await channel.assertExchange('dead_letter_exchange', 'fanout', { durable: true });
  await channel.assertQueue('failed_orders', { durable: true });
  await channel.bindQueue('failed_orders', 'dead_letter_exchange', '');

  console.log('🔍 DLQ Monitor watching for failed orders...\n');

  channel.consume('failed_orders', (msg) => {
    if (msg !== null) {
      const order = JSON.parse(msg.content.toString());
      const reason = msg.properties.headers?.['x-death']?.[0]?.reason || 'unknown';

      console.log('🚨 FAILED ORDER DETECTED:');
      console.log(`   Order ID  : ${order.id}`);
      console.log(`   Customer  : ${order.customerName}`);
      console.log(`   Item      : ${order.item}`);
      console.log(`   Amount    : KES ${order.amount}`);
      console.log(`   Reason    : ${reason}`);
      console.log(`   Time      : ${new Date().toISOString()}`);
      console.log('-----------------------------------\n');

      channel.ack(msg);
    }
  });
}

startMonitor();
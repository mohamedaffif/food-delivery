import amqp from 'amqplib';

// fake stock database
const stock = {
  'Burger': 10,
  'Pizza': 5,
  'Pasta': 0,   // out of stock
  'Fries': 8,
  'Chicken': 3
};

async function startStockChecker() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  await channel.assertQueue('stock_check_queue', { durable: false });
  channel.prefetch(1);

  console.log('📦 Stock checker ready...');

  channel.consume('stock_check_queue', (msg) => {
    const { item } = JSON.parse(msg.content.toString());

    console.log(`\n[STOCK] Checking stock for: ${item}`);

    const quantity = stock[item] || 0;
    const available = quantity > 0;

    const reply = {
      item,
      available,
      quantity,
      message: available
        ? `${item} is available — ${quantity} in stock`
        : `${item} is out of stock`
    };

    console.log(`[STOCK] ${reply.message}`);

    // send reply back to API
    channel.sendToQueue(
      msg.properties.replyTo,
      Buffer.from(JSON.stringify(reply)),
      { correlationId: msg.properties.correlationId }
    );

    channel.ack(msg);
  });
}

startStockChecker();
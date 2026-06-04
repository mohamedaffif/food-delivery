import amqp from 'amqplib';

let connection;
let channel;

export async function connectRabbitMQ() {
  connection = await amqp.connect('amqp://localhost');
  channel = await connection.createChannel();

  // declare exchange — one place, everyone uses it
  await channel.assertExchange('order_exchange', 'fanout', { durable: true });

    // dead letter exchange — catches all failed messages
  await channel.assertExchange('dead_letter_exchange', 'fanout', { durable: true });

  // dead letter queue — stores all failed orders
  await channel.assertQueue('failed orders', { durable: true });
  // bind dead letter queue to dead letter exchange
  await channel.bindQueue('failed orders', 'dead_letter_exchange', '');


  console.log('RabbitMQ connected');
  return channel;
}

export async function getChannel() {
  if (!channel) await connectRabbitMQ();
  return channel;
}
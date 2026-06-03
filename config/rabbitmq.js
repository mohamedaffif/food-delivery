import amqp from 'amqplib';

let connection;
let channel;

export async function connectRabbitMQ() {
  connection = await amqp.connect('amqp://localhost');
  channel = await connection.createChannel();

  // declare exchange — one place, everyone uses it
  await channel.assertExchange('order_exchange', 'fanout', { durable: true });

  console.log('RabbitMQ connected');
  return channel;
}

export async function getChannel() {
  if (!channel) await connectRabbitMQ();
  return channel;
}
import amqp from 'amqplib';
import { randomUUID } from 'crypto';
import redis from '../config/redis.js';

let channel;
let replyQueue;

export async function initStockClient() {
  const connection = await amqp.connect('amqp://localhost');
  channel = await connection.createChannel();

  // temporary reply queue just for this client
  const q = await channel.assertQueue('', { exclusive: true });
  replyQueue = q.queue;

  console.log('Stock client ready ✅');
}

export async function checkStock(item) {
  // step 1 check Redis cache first
  const cached = await redis.get(`stock:${item}`);

  if(cached) {
    const result = JSON.parse(cached);
    console.log(`[CACHE] Stock for ${item}: ${cached}`);
    return result;
  }

  // step 2 if not in cache, do RPC call to stock service
  console.log(`[RPC] Checking stock for ${item} via RPC...`);
  const result = await checkStockViaRPC(item);

  // step 3 cache the result in Redis for 30 seconds

  await redis.setex(`stock:${item}`, 60, JSON.stringify(result));

  return result;
}

export function checkStockViaRPC(item) {
  return new Promise((resolve, reject) => {
    const correlationId = randomUUID();

    // timeout after 5 seconds
    const timeout = setTimeout(() => {
      reject(new Error('Stock check timed out'));
    }, 5000);

    // listen for reply
    channel.consume(replyQueue, (msg) => {
      if (msg.properties.correlationId === correlationId) {
        clearTimeout(timeout);
        const reply = JSON.parse(msg.content.toString());
        resolve(reply);
      }
    }, { noAck: true });

    // send stock check request
    channel.sendToQueue(
      'stock_check_queue',
      Buffer.from(JSON.stringify({ item })),
      {
        correlationId,
        replyTo: replyQueue
      }
    );

    console.log(`[API] Checking stock for: ${item}`);
  });
}
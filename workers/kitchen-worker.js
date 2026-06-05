import amqp from "amqplib";
import redis from "../config/redis.js";

async function start() {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  await channel.assertExchange("order_exchange", "fanout", { durable: true });
  await channel.assertExchange("dead_letter_exchange", "fanout", {
    durable: true,
  });

  const q = await channel.assertQueue("kitchen_queue", {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "dead_letter_exchange",
    },
  });
  await channel.bindQueue(q.queue, "order_exchange", "");

  channel.prefetch(1);
  console.log("🍳 Kitchen worker ready...");

  channel.consume(q.queue, async (msg) => {
    try {
      const order = JSON.parse(msg.content.toString());

      console.log(
        `\n[KITCHEN] New order: ${order.item} for ${order.customerName}`,
      );
      await delay(1000);
      console.log(`[KITCHEN] ✅ ${order.item} is ready!`);

      // simulate random failure to test DLQ
      if (Math.random() < 0.3) {
        throw new Error("Kitchen equipment failure!");
      }

      // update order status in Redis to "preparing"
      await updateOrderStatus(order.id, "preparing");

      await delay(1000);
      // update order status in Redis
      await updateOrderStatus(order.id, "ready");
      console.log(`[KITCHEN] ✅ ${order.item} is ready!`);

      channel.ack(msg);
    } catch (err) {
      console.error(`[KITCHEN] ❌ Failed: ${err.message}`);
      channel.nack(msg, false, false); // send to dead letter queue
    }
  });
}

async function updateOrderStatus(orderId, status) {
  const cached = await redis.get(`order:${orderId}`);
  if (cached) {
    const order = JSON.parse(cached);
    order.status = status;
    await redis.setex(`order:${orderId}`, 3600, JSON.stringify(order));
    console.log(`[KITCHEN] Order ${orderId} status → ${status}`);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

start();

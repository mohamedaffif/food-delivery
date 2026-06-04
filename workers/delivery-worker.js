import amqp from "amqplib";

async function start() {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  await channel.assertExchange("order_exchange", "fanout", { durable: true });
  await channel.assertExchange("dead_letter_exchange", "fanout", {
    durable: true,
  });

  const q = await channel.assertQueue("delivery_queue", {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "dead_letter_exchange",
    },
  });
  await channel.bindQueue(q.queue, "order_exchange", "");

  channel.prefetch(1);
  console.log("🚴 Delivery worker ready...");

  channel.consume(q.queue, async (msg) => {
    try {
      const order = JSON.parse(msg.content.toString());

      console.log(`\n[DELIVERY] Dispatching rider for ${order.customerName}`);
      await delay(2000);
      console.log(`[DELIVERY] ✅ Rider assigned for order ${order.id}`);

      // simulate no riders available
      if (Math.random() < 0.3) {
        throw new Error("No riders available!");
      }

      await delay(2000);
      console.log(`[DELIVERY] ✅ Rider assigned for order ${order.id}`);

      channel.ack(msg);
    } catch (err) {
      console.error(`[DELIVERY] ❌ Failed: ${err.message}`);
      channel.nack(msg, false, false);
    }
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

start();

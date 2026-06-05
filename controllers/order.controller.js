import { getChannel } from "../config/rabbitmq.js";
import { checktock } from "../rpc/stock-client.js";
import redis from "../config/redis.js";

export async function placeOrder(req, res) {
  try {
    const { customerName, item, phone, amount } = req.body;

    // validate inputs
    if (!customerName || !item || !phone || !amount) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: customerName, item, phone, amount",
      });
    }
    // Step 1 — check stock via cache or RPC
    console.log(`\n[ORDER] Checking stock before accepting order...`);
    const stockResult = await checkStock(item);

    // Step 2 — if out of stock reject immediately
    if (!stockResult.available) {
      return res.status(400).json({
        success: false,
        message: `Sorry! ${item} is currently out of stock.`,
        stock: stockResult,
      });
    }

    // Step 2 — create order

    const order = {
      id: Date.now(),
      customerName,
      item,
      phone,
      amount,
      status: "received",
      createdAt: new Date().toISOString(),
    };

    // Step 3 — save order status in Redis
    await redis.setex(
      `order:${order.id}`,
      3600,
      JSON.stringify({ ...order, status: "queued" }),
    );

    const channel = await getChannel();

    channel.publish("order_exchange", "", Buffer.from(JSON.stringify(order)), {
      persistent: true,
    });

    console.log(
      `✅ Order queued: ${order.id} — ${order.item} for ${order.customerName}`,
    );

    res.status(201).json({
      success: true,
      message: "Order received! We are on it.",
      orderId: order.id,
    });
  } catch (err) {
    console.error("Order error:", err.message);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

// NEW — track order status
export async function getOrderStatus(req, res) {
  try {
    const { id } = req.params;

    const cached = await redis.get(`order:${id}`);

    if (!cached) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const order = JSON.parse(cached);

    res.json({
      success: true,
      order: {
        id: order.id,
        customerName: order.customerName,
        item: order.item,
        status: order.status,
        createdAt: order.createdAt
      }
    });

  } catch (err) {
    console.error('Status error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
}

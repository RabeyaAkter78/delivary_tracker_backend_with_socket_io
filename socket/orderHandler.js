import { getCollection } from "../config/database.js";
import {
  calculateTotals,
  crateOrderDocument,
  generateOrderId,
} from "../utils/helper.js";

export const orderHandler = (io, socket) => {
  console.log("A user connected", socket.id);

  // place order:
  socket.on("placeOrder", async (data, callback) => {
    try {
      clg`Placed order from ${socket.id}`;
      const validation = validateOrder(data);
      if (!validation.valid) {
        return callback({
          success: false,
          message: validation.message,
        });
      }

      const totals = calculateTotals(data.items);
      const orderId = generateOrderId();
      const order = crateOrderDocument(data, orderId, totals);

      const ordersCollection = getCollection("orders");
      await ordersCollection.insertOne(order);

      socket.join(`order-${orderId}`);
      socket.join("customers");

      io.to("admins").emit("newOrder", { order });

      callback({
        success: true,
        order,
      });

      clg`Order Created : ${orderId}`;
    } catch (error) {
      console.log(error);
      callback({
        success: false,
        message: "Faild to place order.",
      });
    }
  });
};

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

  // track order:
  socket.on("trackOrder", async (data, callback) => {
    try {
      const orderCollection = getCollection("orders");

      const order = await orderCollection.findOne({ orderId: data.orderId });

      if (!order) {
        return callback({
          success: false,
          message: "Order not found.",
        });
      }

      socket.join(`order-${data.orderId}`);
      callback({
        success: true,
        order,
      });
    } catch (error) {
      console.error("Order tracking Error", error);
      callback({
        success: false,
        messgae: error.message,
      });
    }
  });

  // cancel order:
  socket.on("cancelOrder", async (data, callback) => {
    try {
      const orderCollection = getCollection("orders");
      const order = await orderCollection.findOne({ orderId: data.orderId });
      if (!order) {
        return callback({
          success: false,
          message: "Order not found.",
        });
      }

      if (!["pending", "confirmed"].includes(order.ststus)) {
        return callback({
          success: false,
          message: "Can not cancel the order ",
        });
      }
      await orderCollection.updateOne(
        {
          orderId: data.orderId,
        },
        {
          $set: {
            status: "cancelled",
            updatedAt: new DataView(),
          },
          $push: {
            statusHistory: {
              statu: "cancelled",
              timeStamp: new Date(),
              by: socket.id,
              note: dtaa.reason || "Cancelled by customer.",
            },
          },
        },
      );

      io.to(`order-${data.orderId}`).emit("orderCancelled", {
        orderId: data.orderId,
      });

      io.to("admins").emit("orderCancelled", {
        orderId: data.orderId,
        customerName: order.customerName,
      });
      callback({
        success: true,
      });
    } catch (error) {
      console.error("Cancel order Error", error);
      callback({
        success: false,
        message: error.message,
      });
    }
  });

  // get my orders:
  socket.on("getMyOrders", async (data, callback) => {
    try {
      const orderCollection = getCollection("orders");
      const orders = await orderCollection
        .find({
          customerPhone: data.customerPhone,
        })
        .sort({
          createdAt: -1,
        })
        .limit(20)
        .toArray();

      callback({
        success: true,
        orders,
      });
    } catch (error) {
      console.error("Get Orders Error", error);
      callback({
        success: false,
        messgae: error.message,
      });
    }
  });
};

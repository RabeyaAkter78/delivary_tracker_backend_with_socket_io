import { ReturnDocument } from "mongodb";
import { getCollection } from "../config/database.js";
import {
  calculateTotals,
  crateOrderDocument,
  generateOrderId,
  isValidSTatusTransition,
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

  // Admin Event:

  // Admin Login:

  socket.on("adminLogin", async (data, callback) => {
    try {
      if (data.password === process.env.ADMIN_PASSWORD) {
        socket.isAdmin = true;
        socket.join("admins");
        console.log(`admin logged in:${socket.id}`);
        callback({
          success: true,
        });
      } else {
        callback({
          success: false,
          message: "Invalid Password",
        });
      }
    } catch (error) {
      callback.error({
        success: false,
        message: "Login Faild",
      });
    }
  });

  // Get All orders:
  socket.on(getAllorders, async (data, callback) => {
    try {
      if (!socket.isAdmin) {
        return callback({
          success: false,
          message: "UnAuthorized",
        });
      }

      const orderCollection = getCollection("orders");
      const filter = data?.status ? { status: data.status } : {};
      const orders = await orderCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

      callback({
        success: true,
        orders,
      });
    } catch (error) {
      callback.error({
        success: false,
        message: "Faild to Load orders",
      });
    }
  });

  // status update:

  socket.on("updateOrderStatus", async (data, callback) => {
    try {
      const orderCollection = getCollection("orders");
      const order = await orderCollection.findOne({
        orderId: data.orderId,
      });

      if (!order) {
        return callback({
          success: false,
          message: "Order not found.",
        });
      }

      if (!isValidSTatusTransition(order.status, data.newStatus)) {
        return callback({
          success: false,
          message: "Invalid Status Transition",
        });
      }

      const result = await orderCollection.findOneAndUpdate(
        {
          orderId: data.orderId,
        },
        {
          $set: { status: data.newStatus, updatedAt: new Date() },
          $push: {
            statusHistory: {
              status: data.newStatus,
              timeStamp: new Date(),
              by: socket.id,
              note: "Status Updated by Admin",
            },
          },
        },
        {
          ReturnDocument: "after",
        },
      );
      io.to(`order-${data.orderId}`).emit("statusUpdated", {
        orderId: data.orderId,
        status: data.newStatus,
        order: result,
      });

      socket.to("admin").emit("orderStatusChnaged", {
        orderId: data.orderId,
        newStatus: data.newStatus,
      });
      callback({
        success: true,
        order: result,
      });
    } catch (error) {
      callback.error({
        success: false,
        message: "Faild to Update order Status.",
      });
    }
  });
};

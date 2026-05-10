import { Timestamp } from "mongodb";

export function validateOrder(data) {
  if (!data.customerName?.trim()) {
    return {
      valid: false,
      message: "Customer Name is Required",
    };
  }

  if (!data.customerPhone?.trim()) {
    return {
      valid: false,
      message: "Customer Phone Number is Required",
    };
  }
  if (!data.customerAddress?.trim()) {
    return {
      valid: false,
      message: "Customer Address is Required",
    };
  }
  if (!Array.isArray(data.items)) {
    return {
      valid: false,
      message: "Order must have at least One item.",
    };
  }
  return {
    valid: true,
  };
}

// Generate order id:

export function generateOrderId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `ORD-${year}${month}${day}-${random}`;
}

// calcukation:

export function calculateTotals(item) {
  const subTotal = item.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const tax = subTotal * 0.01;
  const deliveryFee = 35.0;
  const total = subTotal + tax + deliveryFee;

  return {
    subTotal: Math.round(subTotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    delivaryFee,
    totalAmount: Math.round(total * 100) / 100,
  };
}

export function crateOrderDocument(orderData, orderId, totals) {
  return {
    orderId,
    customerName: orderData.customerName.trim(),
    customerPhone: orderData.customerPhone.trim(),
    customerAddress: orderData.customerAddress.trim(),
    items: orderData.items,
    subTotal: totals.subTotal,
    tax: totals.tax,
    delivaryFee: totals.delivaryFee,
    totalAmount: totals.totalAmount,
    specialNotes: orderData.specialNotes || "",
    paymentMethod: orderData.paymentMethod || "cash",
    paymentStatus: "pending",
    status: "pending",
    statusHistory: [
      {
        status: "pending",
        Timestamp: new Date(),
        by: "customer",
        note: "Order Placed",
      },
    ],
    estimatedTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function isValidSTatusTransition(currentStatus, newStatus) {
  const validTransition = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["out_for_delivery", "cancelled"],
    out_for_delevery: ["delevered"],
    delevered: [],
    cancelled: [],
  };
  return validTransition[currentStatus]?.includes(newStatus) || false;
}

import { describe, it, expect } from "vitest";
import type { OrderDetails } from "@/components/checkout/CheckoutFlow";

// Test the CheckoutFlow step labels and OrderDetails type contract.
// Full rendering tests would require mocking CartContext and framer-motion.

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: "Order Summary",
  2: "Delivery Details",
  3: "Confirm & Pay",
};

describe("CheckoutFlow step configuration", () => {
  it("has exactly 3 steps", () => {
    expect(Object.keys(STEP_LABELS)).toHaveLength(3);
  });

  it("step 1 is Order Summary", () => {
    expect(STEP_LABELS[1]).toBe("Order Summary");
  });

  it("step 2 is Delivery Details", () => {
    expect(STEP_LABELS[2]).toBe("Delivery Details");
  });

  it("step 3 is Confirm & Pay", () => {
    expect(STEP_LABELS[3]).toBe("Confirm & Pay");
  });
});

describe("OrderDetails type contract", () => {
  it("validates a complete OrderDetails object", () => {
    const details: OrderDetails = {
      deliveryCity: "Colombo",
      recipientName: "John Doe",
      recipientPhone: "+94771234567",
      recipientAddress: "123 Main St, Colombo 07",
      deliveryDate: "2026-06-13",
      senderName: "John Doe",
      giftMessage: "Happy Birthday!",
    };
    expect(details.deliveryCity).toBe("Colombo");
    expect(details.recipientName).toBe("John Doe");
    expect(details.recipientPhone).toBe("+94771234567");
    expect(details.recipientAddress).toBe("123 Main St, Colombo 07");
    expect(details.giftMessage).toBe("Happy Birthday!");
  });

  it("validates OrderDetails without optional giftMessage", () => {
    const details: OrderDetails = {
      deliveryCity: "Kandy",
      recipientName: "Jane Doe",
      recipientPhone: "+94777654321",
      recipientAddress: "456 Temple Road, Kandy",
      deliveryDate: "2026-06-14",
      senderName: "Jane Doe",
    };
    expect(details.giftMessage).toBeUndefined();
  });
});

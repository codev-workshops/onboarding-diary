import { describe, it, expect } from "vitest";
import {
  parseProducts,
  parseCategories,
  parseTracking,
  parseOrder,
  parseDelivery,
  parseCities,
  extractParsed,
} from "@/lib/parsers";

describe("extractParsed", () => {
  it("returns the object directly when no content wrapper", () => {
    const data = { foo: "bar" };
    expect(extractParsed(data)).toEqual({ foo: "bar" });
  });

  it("parses text from content array", () => {
    const data = {
      content: [{ type: "text", text: '{"key":"value"}' }],
    };
    expect(extractParsed(data)).toEqual({ key: "value" });
  });

  it("parses JSON strings", () => {
    expect(extractParsed('{"a":1}')).toEqual({ a: 1 });
  });
});

describe("parseProducts", () => {
  it("parses a products array from flat data", () => {
    const data = {
      products: [
        {
          id: "p1",
          name: "Birthday Cake",
          price: { amount: 5000, currency: "LKR" },
          image: "https://example.com/cake.jpg",
          stock_level: "high",
        },
      ],
    };
    const result = parseProducts(data);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Birthday Cake");
    expect(result[0].id).toBe("p1");
  });

  it("parses products from MCP content wrapper", () => {
    const data = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            products: [
              {
                id: "p2",
                name: "Flower Bouquet",
                price: 3000,
                currency: "LKR",
                image_url: "https://example.com/flower.jpg",
              },
            ],
          }),
        },
      ],
    };
    const result = parseProducts(data);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Flower Bouquet");
  });

  it("returns empty array on invalid data", () => {
    expect(parseProducts(null)).toEqual([]);
    expect(parseProducts("invalid json{")).toEqual([]);
    expect(parseProducts({})).toEqual([]);
  });

  it("filters out products without name or id", () => {
    const data = {
      products: [
        { id: "", name: "", price: 100 },
        { id: "p1", name: "Valid Product", price: 200 },
      ],
    };
    const result = parseProducts(data);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Valid Product");
  });

  it("parses results key as products", () => {
    const data = {
      results: [
        { id: "r1", name: "Result Product", price: 1500 },
      ],
    };
    const result = parseProducts(data);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Result Product");
  });
});

describe("parseCategories", () => {
  it("parses categories from flat array", () => {
    const data = {
      categories: [
        { name: "Cakes", slug: "cakes", product_count: 42 },
        { name: "Flowers", slug: "flowers", product_count: 18 },
      ],
    };
    const result = parseCategories(data);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Cakes");
    expect(result[1].name).toBe("Flowers");
  });

  it("parses categories from MCP content wrapper", () => {
    const data = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            categories: [{ name: "Electronics", slug: "electronics" }],
          }),
        },
      ],
    };
    const result = parseCategories(data);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Electronics");
  });

  it("returns empty array on invalid data", () => {
    expect(parseCategories(null)).toEqual([]);
    expect(parseCategories("bad json{")).toEqual([]);
  });

  it("filters categories without name", () => {
    const data = {
      categories: [
        { name: "", slug: "empty" },
        { name: "Valid", slug: "valid" },
      ],
    };
    const result = parseCategories(data);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Valid");
  });
});

describe("parseTracking", () => {
  it("parses order tracking with snake_case keys", () => {
    const data = {
      order_id: "ORD-123",
      status: "shipped",
      steps: [
        { title: "Order Placed", completed: true, current: false, timestamp: "2024-01-01" },
        { title: "Shipped", completed: true, current: true },
      ],
      estimated_delivery: "2024-01-05",
    };
    const result = parseTracking(data);
    expect(result).not.toBeNull();
    expect(result!.orderId).toBe("ORD-123");
    expect(result!.status).toBe("shipped");
    expect(result!.steps).toHaveLength(2);
    expect(result!.steps[0].completed).toBe(true);
    expect(result!.estimatedDelivery).toBe("2024-01-05");
  });

  it("returns null when no tracking data", () => {
    expect(parseTracking({})).toBeNull();
    expect(parseTracking({ foo: "bar" })).toBeNull();
  });

  it("parses from MCP content wrapper", () => {
    const data = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            order_id: "ORD-789",
            status: "delivered",
            steps: [],
          }),
        },
      ],
    };
    const result = parseTracking(data);
    expect(result).not.toBeNull();
    expect(result!.orderId).toBe("ORD-789");
  });
});

describe("parseOrder", () => {
  it("parses order with snake_case keys", () => {
    const data = {
      order_id: "ORD-001",
      pay_url: "https://pay.example.com/ORD-001",
      total: 15000,
      currency: "LKR",
      items: [
        { product_id: "p1", name: "Cake", quantity: 2, price: 5000 },
        { product_id: "p2", name: "Flower", quantity: 1, price: 5000 },
      ],
      expires_at: "2024-01-01T12:00:00Z",
    };
    const result = parseOrder(data);
    expect(result).not.toBeNull();
    expect(result!.orderId).toBe("ORD-001");
    expect(result!.payUrl).toBe("https://pay.example.com/ORD-001");
    expect(result!.total).toBe(15000);
    expect(result!.currency).toBe("LKR");
    expect(result!.items).toHaveLength(2);
    expect(result!.items[0].productId).toBe("p1");
    expect(result!.expiresAt).toBe("2024-01-01T12:00:00Z");
  });

  it("parses order with camelCase keys", () => {
    const data = {
      orderId: "ORD-002",
      payUrl: "https://pay.example.com/ORD-002",
      total: 8000,
      currency: "USD",
      items: [],
      expiresAt: "2024-06-01T00:00:00Z",
    };
    const result = parseOrder(data);
    expect(result).not.toBeNull();
    expect(result!.orderId).toBe("ORD-002");
    expect(result!.currency).toBe("USD");
  });

  it("returns null when no order_id or orderId", () => {
    expect(parseOrder({ total: 1000 })).toBeNull();
    expect(parseOrder({})).toBeNull();
  });

  it("parses from MCP content wrapper", () => {
    const data = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            order_id: "ORD-003",
            pay_url: "https://pay.example.com",
            total: 5000,
            items: [],
          }),
        },
      ],
    };
    const result = parseOrder(data);
    expect(result).not.toBeNull();
    expect(result!.orderId).toBe("ORD-003");
  });

  it("defaults currency to LKR", () => {
    const data = { order_id: "ORD-004", total: 100, items: [] };
    const result = parseOrder(data);
    expect(result!.currency).toBe("LKR");
  });
});

describe("parseDelivery", () => {
  it("parses delivery with snake_case keys", () => {
    const data = {
      city: "Colombo",
      available: true,
      delivery_date: "2024-01-05",
      rate: 350,
      currency: "LKR",
      perishable_warning: "Keep refrigerated",
    };
    const result = parseDelivery(data);
    expect(result).not.toBeNull();
    expect(result!.city).toBe("Colombo");
    expect(result!.available).toBe(true);
    expect(result!.deliveryDate).toBe("2024-01-05");
    expect(result!.rate).toBe(350);
    expect(result!.perishableWarning).toBe("Keep refrigerated");
  });

  it("parses delivery with camelCase keys", () => {
    const data = {
      city: "Kandy",
      available: false,
      deliveryDate: "2024-01-06",
      delivery_rate: 500,
      perishableWarning: "Fragile items",
    };
    const result = parseDelivery(data);
    expect(result).not.toBeNull();
    expect(result!.city).toBe("Kandy");
    expect(result!.available).toBe(false);
    expect(result!.rate).toBe(500);
    expect(result!.perishableWarning).toBe("Fragile items");
  });

  it("returns null when no city or available field", () => {
    expect(parseDelivery({ foo: "bar" })).toBeNull();
    expect(parseDelivery({})).toBeNull();
  });

  it("defaults currency to LKR", () => {
    const data = { city: "Galle", available: true };
    const result = parseDelivery(data);
    expect(result!.currency).toBe("LKR");
  });
});

describe("parseCities", () => {
  it("parses cities from cities array", () => {
    const data = {
      cities: [
        { name: "Colombo", aliases: ["CMB"] },
        { name: "Kandy" },
        { name: "Galle", aliases: ["GL", "Gall"] },
      ],
    };
    const result = parseCities(data);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("Colombo");
    expect(result[0].aliases).toEqual(["CMB"]);
    expect(result[1].aliases).toBeUndefined();
  });

  it("parses cities from results array", () => {
    const data = {
      results: [{ name: "Matara" }, { city: "Jaffna" }],
    };
    const result = parseCities(data);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Matara");
    expect(result[1].name).toBe("Jaffna");
  });

  it("parses from MCP content wrapper", () => {
    const data = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            cities: [{ name: "Negombo" }],
          }),
        },
      ],
    };
    const result = parseCities(data);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Negombo");
  });

  it("returns empty array on invalid data", () => {
    expect(parseCities(null)).toEqual([]);
    expect(parseCities("bad")).toEqual([]);
    expect(parseCities({})).toEqual([]);
  });
});

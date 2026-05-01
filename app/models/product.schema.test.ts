import { describe, it, expect } from "vitest";
import { ProductSchema, type Product } from "./product.schema";

describe("ProductSchema Validation", () => {
  const validProduct: Product = {
    id: "prod_001",
    name: "Classic Red Roses",
    price: 45.0,
    stock_quantity: 100,
    unit_of_sale: "bunch",
    description: "A stunning bunch of 12 classic red roses for any occasion.",
    category: "roses",
    images: [
      {
        url: "https://example.com/red-roses.jpg",
        alt_text: "A beautiful bunch of 12 red roses",
      },
    ],
    isDeleted: false,
  };

  it("should pass for a valid product (happy path)", () => {
    const result = ProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it("should fail when price is less than 0.01", () => {
    const invalidProduct = { ...validProduct, price: 0.005 };
    const result = ProductSchema.safeParse(invalidProduct);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("price"));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain("0.01");
    }
  });

  it("should fail when image alt_text is missing or empty", () => {
    const invalidProduct = {
      ...validProduct,
      images: [
        {
          url: "https://example.com/red-roses.jpg",
          alt_text: "",
        },
      ],
    };
    const result = ProductSchema.safeParse(invalidProduct);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("alt_text"));
      expect(issue).toBeDefined();
      expect(issue?.message).toBe("Alt text is required");
    }
  });

  it("should fail when stock_quantity is not an integer", () => {
    const invalidProduct = { ...validProduct, stock_quantity: 10.5 };
    const result = ProductSchema.safeParse(invalidProduct);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("stock_quantity")
      );
      expect(issue).toBeDefined();
      expect(issue?.message).toBe("Stock must be an integer");
    }
  });

  it("should fail when images array is empty", () => {
    const invalidProduct = { ...validProduct, images: [] };
    const result = ProductSchema.safeParse(invalidProduct);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("images"));
      expect(issue).toBeDefined();
      expect(issue?.message).toBe("At least one image is required");
    }
  });

  it("should fail when image url is not a valid URL", () => {
    const invalidProduct = {
      ...validProduct,
      images: [{ url: "not-a-url", alt_text: "Valid alt text here" }],
    };
    const result = ProductSchema.safeParse(invalidProduct);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.includes("url") && i.path.includes("images")
      );
      expect(issue).toBeDefined();
      expect(issue?.message).toBe("Must be a valid URL");
    }
  });
});

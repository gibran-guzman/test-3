import crypto from "crypto";
import { ProductSchema, type Product } from "../models/product.schema";
import { Redis } from "@upstash/redis";

class ProductService {
  private static instance: ProductService;
  private redis: Redis;

  private constructor() {
    this.redis = new Redis({
      url: process.env.KV_REST_API_URL || "",
      token: process.env.KV_REST_API_TOKEN || "",
    });
  }

  public static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  /**
   * Reads raw data from the DB.
   */
  private async readDb(): Promise<Product[]> {
    const data = await this.redis.get<Product[]>("products");
    return data || [];
  }

  /**
   * Writes the full array back to the JSON file.
   */
  private async writeDb(data: Product[]): Promise<void> {
    await this.redis.set("products", data);
  }

  /**
   * Return all products that are NOT soft deleted.
   * Supports optional filtering by search query (q) and one or many categories.
   */
  public async getAll(filters?: {
    q?: string | null;
    category?: string | null;
    categories?: string[] | null;
  }): Promise<Product[]> {
    let products = await this.readDb();
    products = products.filter((p) => !p.isDeleted);

    if (filters?.q) {
      const lowerQ = filters.q.toLowerCase();
      products = products.filter((p) => p.name.toLowerCase().includes(lowerQ));
    }

    const categories = filters?.categories?.filter(Boolean) ?? [];
    if (categories.length > 0) {
      products = products.filter((p) => categories.includes(p.category));
    } else if (filters?.category) {
      products = products.filter((p) => p.category === filters.category);
    }

    return products;
  }

  /**
   * Get a single product by ID (fails if soft deleted).
   */
  public async getById(id: string): Promise<Product | null> {
    const products = await this.readDb();
    const product = products.find((p) => p.id === id);
    if (!product || product.isDeleted) {
      return null;
    }
    return product;
  }

  /**
   * Creates a new product. ID is generated if omitted. Validates via Zod before saving.
   */
  public async create(payload: Omit<Product, "id"> & { id?: string }): Promise<Product> {
    const products = await this.readDb();
    const newId = payload.id || crypto.randomUUID();

    const newProduct = {
      ...payload,
      id: newId,
      isDeleted: false,
    };

    // Strict validation enforcing Zero 'any' policy
    const validatedProduct = ProductSchema.parse(newProduct);
    
    products.push(validatedProduct);
    await this.writeDb(products);
    
    return validatedProduct;
  }

  /**
   * Updates an existing product, explicitly preventing ID mutation and validating before save.
   */
  public async update(id: string, payload: Partial<Product>): Promise<Product> {
    const products = await this.readDb();
    const index = products.findIndex((p) => p.id === id);

    if (index === -1 || products[index].isDeleted) {
      throw new Error("Product not found or has been deleted.");
    }

    const updatedData = {
      ...products[index],
      ...payload,
      id, // Force keep the original ID
    };

    const validatedProduct = ProductSchema.parse(updatedData);
    products[index] = validatedProduct;
    
    await this.writeDb(products);
    
    return validatedProduct;
  }

  /**
   * Soft deletes a product instead of physically removing it.
   */
  public async softDelete(id: string): Promise<Product> {
    const products = await this.readDb();
    const index = products.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error("Product not found.");
    }

    products[index].isDeleted = true;
    products[index].deletedAt = new Date().toISOString();

    await this.writeDb(products);
    return products[index];
  }

  /**
   * Restores a soft-deleted product.
   */
  public async restore(id: string): Promise<Product> {
    const products = await this.readDb();
    const index = products.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error("Product not found.");
    }

    products[index].isDeleted = false;
    products[index].deletedAt = undefined;

    await this.writeDb(products);
    return products[index];
  }
}

export const dbOffset = ProductService.getInstance();
export const db = ProductService.getInstance();

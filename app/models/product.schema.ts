import { z } from "zod";

const ProductCategory = z.enum([
  "roses",
  "tulips",
  "sunflowers",
  "hydrangeas",
  "mixed",
]);

const UnitOfSale = z.enum(["stem", "bunch", "bouquet"]);

export const ImageSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  alt_text: z.string().min(1, "Alt text is required"),
});

export const ProductSchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(80, "Name must be at most 80 characters"),
  price: z.number().min(0.01, "Price must be at least 0.01"),
  stock_quantity: z
    .number()
    .int("Stock must be an integer")
    .min(0, "Stock cannot be negative"),
  unit_of_sale: UnitOfSale,
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(200, "Description must be at most 200 characters"),
  category: ProductCategory,
  images: z.array(ImageSchema).min(1, "At least one image is required"),
  
  // Bonus: Soft Delete field preparation
  isDeleted: z.boolean().optional().default(false),
  deletedAt: z.string().datetime().optional(),
});

export type Product = z.infer<typeof ProductSchema>;
export type ProductImage = z.infer<typeof ImageSchema>;
export type ProductCategoryType = z.infer<typeof ProductCategory>;
export type UnitOfSaleType = z.infer<typeof UnitOfSale>;

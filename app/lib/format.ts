import type { UnitOfSaleType } from "../models/product.schema";

/**
 * Formats a monetary value and unit for consistent presentation.
 * Returns formats like: "$12.50 / bunch" or "$3.00 / stem"
 */
export function formatPrice(price: number, unit: UnitOfSaleType): string {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);

  return `${formatted} / ${unit}`;
}

import { useEffect, useState } from "react";
import { Form, useActionData, useNavigation, useSubmit } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { action } from "~/routes/home";

const FormSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 chars")
    .max(80, "Max 80 chars"),
  price: z.coerce.number().min(0.01, "Min price is $0.01"),
  stock_quantity: z.coerce.number().int().min(0, "Stock cannot be negative"),
  unit_of_sale: z.enum(["stem", "bunch", "bouquet"], {
    message: "Invalid unit",
  }),
  category: z.enum(["roses", "tulips", "sunflowers", "hydrangeas", "mixed"], {
    message: "Invalid category",
  }),
  description: z
    .string()
    .min(10, "Min 10 chars")
    .max(200, "Max 200 chars"),
  imageUrl: z.string().url("Valid URL required"),
  imageAlt: z.string().min(1, "Alt text required"),
});

type FormValues = z.infer<typeof FormSchema>;

export function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const submit = useSubmit();
  const navigation = useNavigation();
  
  // Strict typing inferred directly from the route action
  const actionData = useActionData<typeof action>();

  const isSubmitting =
    navigation.state === "submitting" && navigation.formMethod === "POST";

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      price: 0,
      stock_quantity: 0,
      description: "",
      imageUrl: "",
      imageAlt: "",
    },
  });

  useEffect(() => {
    // Narrow down the actionData type safely
    const data = actionData as { success?: boolean; errors?: Record<string, string[]> } | undefined;
    
    if (data?.success) {
      toast.success("Product created successfully!");
      setOpen(false);
      reset();
    } else if (data?.errors) {
      toast.error("Failed to add product. Check the form for details.");
    }
  }, [actionData, reset]);

  const onValidSubmit = (data: FormValues) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) =>
      formData.append(key, String(value))
    );
    // Submit using React Router to hit our action
    submit(formData, { method: "POST" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Product</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>

        {/* Leverage RR7 Form component */}
        <Form
          method="post"
          onSubmit={handleSubmit(onValidSubmit)}
          className="grid gap-4 py-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-red-500 text-xs">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={undefined}
                onValueChange={(val) =>
                  setValue("category", val as FormValues["category"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roses">Roses</SelectItem>
                  <SelectItem value="tulips">Tulips</SelectItem>
                  <SelectItem value="sunflowers">Sunflowers</SelectItem>
                  <SelectItem value="hydrangeas">Hydrangeas</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-red-500 text-xs">
                  {errors.category.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register("price")}
              />
              {errors.price && (
                <p className="text-red-500 text-xs">{errors.price.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Stock</Label>
              <Input
                id="stock_quantity"
                type="number"
                min="0"
                step="1"
                onKeyDown={(e) => {
                  // Prevent typing decimals, exponential notation, or negative signs
                  if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                {...register("stock_quantity")}
              />
              {errors.stock_quantity && (
                <p className="text-red-500 text-xs">
                  {errors.stock_quantity.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_of_sale">Unit</Label>
              <Select
                onValueChange={(val) =>
                  setValue("unit_of_sale", val as FormValues["unit_of_sale"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stem">Stem</SelectItem>
                  <SelectItem value="bunch">Bunch</SelectItem>
                  <SelectItem value="bouquet">Bouquet</SelectItem>
                </SelectContent>
              </Select>
              {errors.unit_of_sale && (
                <p className="text-red-500 text-xs">
                  {errors.unit_of_sale.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register("description")} />
            {errors.description && (
              <p className="text-red-500 text-xs">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input id="imageUrl" {...register("imageUrl")} />
              {errors.imageUrl && (
                <p className="text-red-500 text-xs">{errors.imageUrl.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageAlt">Image Alt Text</Label>
              <Input id="imageAlt" {...register("imageAlt")} />
              {errors.imageAlt && (
                <p className="text-red-500 text-xs">{errors.imageAlt.message}</p>
              )}
            </div>
          </div>

          {/* Action-based Server Validation UX Fallback */}
          {actionData && "errors" in actionData && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mt-2 font-medium">
              Server validation failed. Please address the errors.
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
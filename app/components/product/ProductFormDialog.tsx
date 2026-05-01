import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ImagePlusIcon } from "lucide-react";

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
import { SortableImageItem } from "./SortableImageItem";
import type { action } from "~/routes/home";
import type { Product } from "~/models/product.schema";

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
  description: z.string().min(10, "Min 10 chars").max(200, "Max 200 chars"),
  images: z
    .array(
      z.object({
        id: z.string(),
        url: z.string().url("Valid URL or file required"),
        alt_text: z.string().min(1, "Alt text is mandatory"),
        file: z.custom<File>((value) => value instanceof File).optional(),
      })
    )
    .min(1, "At least one image is required"),
});

type FormValues = z.infer<typeof FormSchema>;

export function ProductFormDialog({
  product,
  trigger,
}: {
  product?: Product;
  trigger?: React.ReactNode;
}) {
  const isEdit = !!product;
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher<typeof action>();

  const isSubmitting =
    fetcher.state === "submitting" && fetcher.formMethod === "POST";

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: product?.name || "",
      price: product?.price || 0,
      stock_quantity: product?.stock_quantity || 0,
      unit_of_sale:
        (product?.unit_of_sale as FormValues["unit_of_sale"]) || undefined,
      category: (product?.category as FormValues["category"]) || undefined,
      description: product?.description || "",
      images: product?.images?.map((img) => ({
        id: crypto.randomUUID(),
        url: img.url,
        alt_text: img.alt_text,
      })) || [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "images",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      move(oldIndex, newIndex);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      newFiles.forEach((file) => {
        // Create local object URL for preview
        const url = URL.createObjectURL(file);
        append({ id: crypto.randomUUID(), url, alt_text: "", file });
      });
      // Reset input so the same files can be chosen again if needed
      e.target.value = "";
    }
  };

  useEffect(() => {
    // Clean up temporary URLs when component unmounts or resets
    return () => {
      fields.forEach((f) => {
        if (f.file && f.url.startsWith("blob:")) {
          URL.revokeObjectURL(f.url);
        }
      });
    };
  }, [fields]);

  useEffect(() => {
    // Reset form with appropriate entity data upon opening mapping modal
    if (open) {
      reset({
        name: product?.name || "",
        price: product?.price || 0,
        stock_quantity: product?.stock_quantity || 0,
        unit_of_sale:
          (product?.unit_of_sale as FormValues["unit_of_sale"]) || undefined,
        category: (product?.category as FormValues["category"]) || undefined,
        description: product?.description || "",
        images: product?.images?.map((img) => ({
          id: crypto.randomUUID(),
          url: img.url,
          alt_text: img.alt_text,
        })) || [],
      });
    }
  }, [open, product, reset]);

  useEffect(() => {
    const data = fetcher.data as
      | { success?: boolean; operation?: string; errors?: Record<string, string[]> }
      | undefined;

    if (
      data?.success &&
      (data.operation === "create" || data.operation === "update")
    ) {
      toast.success(
        `Product ${data.operation === "create" ? "created" : "updated"} successfully!`
      );
      setOpen(false);
      reset();
    } else if (data?.errors) {
      toast.error("Failed to save product. Check the form for details.");
    }
  }, [fetcher.data, reset]);

  const onValidSubmit = (data: FormValues) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key !== "images") {
        formData.append(key, String(value));
      }
    });

    // Instead of sending raw Form elements, serialize image metadata 
    const imagePayload = data.images.map((img) => ({
      url: img.url,
      alt_text: img.alt_text,
    }));
    formData.append("images_payload", JSON.stringify(imagePayload));

    // Handle actual files if any were uploaded (they'll be sent as multipart)
    data.images.forEach((img, idx) => {
      if (img.file) {
        formData.append(`image_file_${idx}`, img.file);
      }
    });

    formData.append("_action", isEdit ? "update" : "create");
    if (isEdit && product?.id) {
      formData.append("id", product.id);
    }
    fetcher.submit(formData, { method: "POST", encType: "multipart/form-data" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Add Product</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Product" : "Add New Product"}
          </DialogTitle>
        </DialogHeader>

        {/* Leverage RR7 Fetcher Form for isolated nested list scopes */}
        <fetcher.Form
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
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
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
                )}
              />
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
              <Controller
                control={control}
                name="unit_of_sale"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stem">Stem</SelectItem>
                      <SelectItem value="bunch">Bunch</SelectItem>
                      <SelectItem value="bouquet">Bouquet</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Product Images</Label>
              <div>
                <Input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("image-upload")?.click()}
                >
                  <ImagePlusIcon className="mr-2 size-4" />
                  Add Images
                </Button>
              </div>
            </div>

            {fields.length === 0 && (
              <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
                No images added. Click "Add Images" to select files.
              </div>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={fields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {fields.map((field, index) => (
                    <SortableImageItem
                      key={field.id}
                      id={field.id}
                      url={field.url}
                      index={index}
                      registerAlt={register(`images.${index}.alt_text`)}
                      error={errors.images?.[index]?.alt_text?.message || errors.images?.[index]?.url?.message}
                      onRemove={() => remove(index)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {errors.images?.root && (
              <p className="text-red-500 text-xs">{errors.images.root.message}</p>
            )}
          </div>

          {/* Action-based Server Validation UX Fallback */}
          {fetcher.data && "errors" in fetcher.data && (
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
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
import { z } from "zod";

export const slotSchema = z.object({
  label: z.string().min(1).max(20),
  level: z.string().min(1).max(30),
  type: z.enum(["standard", "compact", "electric", "accessible"]),
});

export const sessionSchema = z.object({
  slotId: z.number().int().positive(),
  vehiclePlate: z
    .string()
    .min(3)
    .max(20)
    .transform((value) => value.toUpperCase()),
  vehicleType: z.string().min(2).max(30),
  driverName: z.string().min(2).max(120),
});

export const checkoutSchema = z.object({
  hourlyRate: z.number().positive().max(1000).optional(),
});

export type SlotPayload = z.infer<typeof slotSchema>;
export type SessionPayload = z.infer<typeof sessionSchema>;
export type CheckoutPayload = z.infer<typeof checkoutSchema>;


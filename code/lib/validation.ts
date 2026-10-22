import { z } from "zod";

export const locationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
}).strict();

export const reportSchema = locationSchema.extend({
  waterLevel: z.number().finite().min(0).max(2000),
  description: z.string().trim().min(1, "Deskripsi wajib diisi.").max(2000),
});

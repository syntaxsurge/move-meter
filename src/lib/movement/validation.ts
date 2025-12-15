import { z } from "zod";

export const MovementAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[0-9a-fA-F]{1,64}$/);


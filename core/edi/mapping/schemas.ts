import { z } from "zod";

export const PartnerInboundSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("sftp"),
    host: z.string(),
    port: z.number().default(22),
    username: z.string(),
    password: z.string().optional(),
    privateKey: z.string().optional(),
    pattern: z.string().default("*.edi"),
    archiveDir: z.string().default("/archive"),
    directory: z.string().default("/in"),
  }),
  z.object({
    type: z.literal("https"),
    endpoint: z.string().url(),
    secret: z.string().optional(),
    headerName: z.string().default("X-Signature"),
    pattern: z.string().default("ORDERS"),
    archiveDir: z.string().default(""),
  }),
]);

export const PartnerOutboundSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("sftp"),
    host: z.string(),
    port: z.number().default(22),
    username: z.string(),
    password: z.string().optional(),
    privateKey: z.string().optional(),
    directory: z.string().default("/out")
  }),
  z.object({
    type: z.literal("https"),
    endpoint: z.string().url(),
    headers: z.record(z.string()).default({}),
  }),
  z.object({
    type: z.literal("as2"),
    endpoint: z.string().url(),
    headers: z.record(z.string()).default({}),
  }),
]);

export const MappingOverrideSchema = z.object({
  // Free-form JSON; UI will validate known paths.
}).passthrough();

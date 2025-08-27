import { Queue, Worker, QueueScheduler, JobsOptions } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
export const queueName = "edi-jobs";
export const queue = new Queue(queueName, { connection });
export const scheduler = new QueueScheduler(queueName, { connection });

export type JobType = "SFTP_POLL" | "SHOPIFY_CREATE_ORDER" | "SEND_DESADV" | "RETRY";

export function jobOptions(): JobsOptions {
  return {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  };
}

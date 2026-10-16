// Hand-written helpers (not generated) — survive `pnpm gen:nodejs`.
// Render calls that may answer 200 (file ready) or 202 (queued, "async": true — Pro),
// job polling, and a typed error for 429 (too many pending async jobs).
import type {
  ExportPdfAsyncResponse,
  HttpResponse,
} from "./QorstackApi";

/** Result of a render call: the finished file, or a queued job (async: true, Pro). */
export type RenderOutcome<TDownload> =
  | { kind: "download"; download: TDownload }
  | { kind: "queued"; job: ExportPdfAsyncResponse };

/** Status of an async render job (GET /render/jobs/{id}). */
export interface RenderJobStatus {
  id: string;
  /** pending → processing → success | failed */
  status: "pending" | "processing" | "success" | "failed" | string;
  /** Fresh download link once status is "success". */
  downloadUrl?: string | null;
  downloadUrlExpiresAt?: string | null;
  errorMessage?: string | null;
  durationMs?: number | null;
  fileSizeBytes?: number | null;
}

/** HTTP 429: too many unfinished async renders for this user. */
export class RenderQueueFullError extends Error {
  constructor(public readonly retryAfterSeconds: number | null) {
    super("Too many async renders are pending. Retry later.");
    this.name = "RenderQueueFullError";
  }
}

/** The async render job finished with status "failed". */
export class RenderJobFailedError extends Error {
  constructor(public readonly job: RenderJobStatus) {
    super(`Render job ${job.id} failed: ${job.errorMessage ?? "unknown error"}`);
    this.name = "RenderJobFailedError";
  }
}

export interface WaitForJobOptions {
  /** Poll interval in ms (default 2000). */
  intervalMs?: number;
  /** Give up after this many ms (default 600000 = 10 min). */
  timeoutMs?: number;
}

/** Turns a raw render response into a RenderOutcome; maps 429 to RenderQueueFullError. */
export async function toRenderOutcome<T>(
  call: Promise<HttpResponse<T, unknown>>,
): Promise<RenderOutcome<T>> {
  try {
    const res = await call;
    if (res.status === 202) {
      return { kind: "queued", job: res.data as unknown as ExportPdfAsyncResponse };
    }
    return { kind: "download", download: res.data };
  } catch (err) {
    const res = err as Partial<Response>;
    if (res && res.status === 429) {
      const header = res.headers?.get?.("Retry-After");
      const seconds = header ? Number.parseInt(header, 10) : NaN;
      throw new RenderQueueFullError(Number.isFinite(seconds) ? seconds : null);
    }
    throw err;
  }
}

/** Polls until the job finishes; resolves with the job (downloadUrl set) or rejects on failure / timeout. */
export async function waitForJob(
  getJob: (jobId: string) => Promise<RenderJobStatus>,
  jobId: string,
  { intervalMs = 2000, timeoutMs = 600_000 }: WaitForJobOptions = {},
): Promise<RenderJobStatus> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const job = await getJob(jobId);
    if (job.status === "success") return job;
    if (job.status === "failed") throw new RenderJobFailedError(job);
    if (Date.now() + intervalMs > deadline) {
      throw new Error(`Render job ${jobId} did not finish in time (last status: ${job.status}).`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

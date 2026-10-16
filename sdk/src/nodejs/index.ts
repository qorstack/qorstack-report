import {
  Api,
  ExcelFromTemplateRequest,
  ExportExcelUrlResponse,
  ExportPdfUrlResponse,
  PdfFromTemplateRequest,
  RequestParams,
} from "./QorstackApi";
import {
  RenderJobStatus,
  RenderOutcome,
  WaitForJobOptions,
  toRenderOutcome,
  waitForJob,
} from "./async";
export * from "./QorstackApi";
export * from "./async";

export class QorstackApi<
  SecurityDataType = unknown,
> extends Api<SecurityDataType> {
  /**
   * Creates a new instance of QorstackApi.
   * @param config Optional configuration. If baseUrl is not provided, it tries to read from QORSTACK_API_URL or RENDOX_API_URL environment variables.
   */
  constructor(
    config: { baseUrl?: string; securityData?: SecurityDataType } = {},
  ) {
    let baseUrl = config.baseUrl;

    // Try to load from environment variable if not provided
    if (!baseUrl) {
      try {
        if (typeof process !== "undefined" && process.env) {
          baseUrl =
            process.env.QORSTACK_API_URL || process.env.RENDOX_API_URL;
        }
      } catch (e) {
        // Ignore errors accessing process.env
      }
    }

    // Fallback to the self-host default if still not found. Since v2 the API lives under /api on the
    // same port as the web UI; a v1-style URL without it (http://host:8080) gets /api appended.
    baseUrl = (baseUrl || "http://localhost:8080/api").replace(/\/+$/, "");
    if (!/\/api$/.test(baseUrl)) baseUrl = `${baseUrl}/api`;

    super({
      baseUrl,
      securityWorker: (securityData) => {
        if (securityData) {
          return securityData as unknown as RequestParams;
        }
        return {};
      },
    });

    if (config.securityData) {
      this.setSecurityData(config.securityData);
    }
  }

  /** Render from a Word template: the file link, or (with async: true, Pro) the queued job. */
  renderWord(
    data: PdfFromTemplateRequest,
    params: RequestParams = {},
  ): Promise<RenderOutcome<ExportPdfUrlResponse>> {
    return toRenderOutcome(this.render.postRenderWordTemplate(data, params));
  }

  /** Render from an Excel template: the file link, or (with async: true, Pro) the queued job. */
  renderExcel(
    data: ExcelFromTemplateRequest,
    params: RequestParams = {},
  ): Promise<RenderOutcome<ExportExcelUrlResponse>> {
    return toRenderOutcome(this.render.postRenderExcelTemplate(data, params));
  }

  /** GET /render/jobs/{jobId}. */
  async getRenderJob(
    jobId: string,
    params: RequestParams = {},
  ): Promise<RenderJobStatus> {
    const res = await this.request<RenderJobStatus, unknown>({
      path: `/render/jobs/${encodeURIComponent(jobId)}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
    return res.data;
  }

  /** Polls an async job until it finishes; resolves with downloadUrl set, rejects on failure or timeout. */
  waitForJob(
    jobId: string,
    options?: WaitForJobOptions,
  ): Promise<RenderJobStatus> {
    return waitForJob((id) => this.getRenderJob(id), jobId, options);
  }
}

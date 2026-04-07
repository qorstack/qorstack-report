import { Api, RequestParams } from "./QorstackApi";
export * from "./QorstackApi";

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

    // Fallback to default if still not found
    baseUrl = baseUrl || "https://api.qorstack.dev";

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
}

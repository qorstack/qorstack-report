/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface ProblemDetails {
  type?: string | null;
  title?: string | null;
  /** @format int32 */
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
  [key: string]: any;
}

export interface DashboardSummaryDto {
  /** @format int32 */
  totalGenerated?: number;
  totalGeneratedTrend?: number[];
  /** @format int32 */
  activeProjects?: number;
  /** @format int32 */
  maxProjects?: number;
  /** @format double */
  successRate?: number;
  successRateTrend?: number[];
  /** @format int32 */
  totalTemplates?: number;
  templateBreakdown?: TemplateBreakdownDto[];
  /** @format int32 */
  creditBalance?: number;
  /** @format int32 */
  creditLimit?: number;
}

export interface TemplateBreakdownDto {
  type?: string;
  /** @format int32 */
  count?: number;
}

export interface ContributionDataDto {
  /** @format int32 */
  totalContributions?: number;
  /** @format double */
  growthPercent?: number;
  busiestDay?: BusiestDayDto;
  /** @format int32 */
  activeDays?: number;
  dailyData?: DailyContributionDto[];
}

export interface BusiestDayDto {
  date?: string;
  /** @format int32 */
  count?: number;
}

export interface DailyContributionDto {
  date?: string;
  /** @format int32 */
  count?: number;
}

export interface UsageDataDto {
  range?: string;
  groupBy?: string;
  /** @format int32 */
  totalVolume?: number;
  data?: UsageDataPointDto[];
}

export interface UsageDataPointDto {
  date?: string;
  /** @format int32 */
  count?: number;
  breakdown?: Record<string, number>;
}

export interface HourlyUsageDto {
  /** @format int32 */
  hour?: number;
  /** @format int32 */
  count?: number;
}

export interface WeeklyUsageDto {
  date?: string;
  /** @format int32 */
  count?: number;
}

export interface TemplatePerformanceDto {
  templateKey?: string;
  templateName?: string;
  projectName?: string;
  type?: string;
  /** @format int32 */
  totalGenerations?: number;
  /** @format double */
  avgDurationMs?: number;
  /** @format int64 */
  avgFileSizeBytes?: number;
  /** @format int32 */
  errorCount?: number;
  /** @format double */
  successRate?: number;
  /** @format double */
  errorRate?: number;
  /** @format date-time */
  lastGeneratedAt?: string | null;
}

export interface PaginatedListOfGenerationDto {
  items?: GenerationDto[];
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  totalPages?: number;
  /** @format int32 */
  totalCount?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface GenerationDto {
  /** @format guid */
  id?: string;
  templateName?: string | null;
  templateKey?: string | null;
  type?: string | null;
  status?: string;
  /** @format date-time */
  createdDatetime?: string | null;
  /** @format int64 */
  durationMs?: number | null;
  /** @format int64 */
  fileSizeBytes?: number | null;
  errorMessage?: string | null;
  downloadUrl?: string | null;
}

export interface LoginRequest {
  email?: string;
  password?: string;
}

export interface RegisterResponse {
  /** @format guid */
  id?: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  status?: string;
  refCode?: string;
}

export interface RegisterRequest {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

export interface VerifyOtpResponse {
  verificationToken?: string;
}

export interface VerifyOtpRequest {
  email?: string;
  otp?: string;
  type?: string;
}

export interface ForgotPasswordResponse {
  refCode?: string;
}

export interface ForgotPasswordRequest {
  email?: string;
}

export interface ResetPasswordRequest {
  verificationToken?: string;
  newPassword?: string;
}

export interface GoogleLoginRequest {
  googleId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
}

export interface GithubLoginRequest {
  githubId?: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

export interface GitlabLoginRequest {
  gitlabId?: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

export interface ChangePasswordRequest {
  oldPassword?: string;
  newPassword?: string;
}

export interface CreateExampleCategoryCommand {
  name?: string;
}

export interface PaginatedListOfExampleCategoryDto {
  items?: ExampleCategoryDto[];
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  totalPages?: number;
  /** @format int32 */
  totalCount?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface ExampleCategoryDto {
  /** @format int32 */
  categoryId?: number;
  name?: string;
  /** @format date-time */
  createdDatetime?: string | null;
  createdBy?: string | null;
  /** @format date-time */
  updatedDatetime?: string | null;
  updatedBy?: string | null;
}

export interface UpdateExampleCategoryCommand {
  /** @format int32 */
  id?: number;
  name?: string;
}

export interface CreateExampleProductCommand {
  name?: string;
  /** @format decimal */
  price?: number;
  /** @format int32 */
  categoryId?: number;
}

export interface PaginatedListOfExampleProductDto {
  items?: ExampleProductDto[];
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  totalPages?: number;
  /** @format int32 */
  totalCount?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface ExampleProductDto {
  /** @format int32 */
  productId?: number;
  name?: string;
  /** @format decimal */
  price?: number;
  /** @format int32 */
  categoryId?: number;
  categoryName?: string;
  /** @format date-time */
  createdDatetime?: string | null;
  createdBy?: string | null;
  /** @format date-time */
  updatedDatetime?: string | null;
  updatedBy?: string | null;
}

export interface UpdateExampleProductCommand {
  /** @format int32 */
  id?: number;
  name?: string;
  /** @format decimal */
  price?: number;
  /** @format int32 */
  categoryId?: number;
}

export interface CreatePaymentResponse {
  /** @format guid */
  paymentId?: string;
  status?: string;
  /** @format decimal */
  amount?: number;
  currency?: string;
}

export interface CreatePaymentCommand {
  /** @format guid */
  planId?: string;
  paymentMethod?: string;
}

export interface PaginatedListOfPaymentDto {
  items?: PaymentDto[];
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  totalPages?: number;
  /** @format int32 */
  totalCount?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface PaymentDto {
  /** @format guid */
  id?: string;
  /** @format guid */
  userId?: string;
  /** @format guid */
  planId?: string | null;
  /** @format int32 */
  creditAmount?: number | null;
  /** @format guid */
  packageId?: string | null;
  /** @format decimal */
  amountMoney?: number;
  currency?: string;
  status?: string | null;
  paymentMethod?: string | null;
  externalRef?: string | null;
  createdBy?: string | null;
  /** @format date-time */
  createdDatetime?: string | null;
  updatedBy?: string | null;
  /** @format date-time */
  updatedDatetime?: string | null;
}

export interface PaginatedListOfPlanDto {
  items?: PlanDto[];
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  totalPages?: number;
  /** @format int32 */
  totalCount?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface PlanDto {
  /** @format guid */
  id?: string;
  name?: string;
  code?: string;
  /** @format decimal */
  price?: number | null;
  currency?: string | null;
  featuresConfig?: string;
  isShow?: boolean | null;
  /** @format int32 */
  displayOrder?: number | null;
  isActive?: boolean | null;
  createdBy?: string | null;
  /** @format date-time */
  createdDatetime?: string | null;
  updatedBy?: string | null;
  /** @format date-time */
  updatedDatetime?: string | null;
}

export interface ProjectDto {
  /** @format guid */
  id?: string;
  name?: string;
  description?: string | null;
  status?: string | null;
  /** @format date-time */
  createdDatetime?: string | null;
}

export interface CreateProjectRequest {
  name?: string;
  description?: string | null;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string | null;
}

export interface ProjectApiKeyDto {
  apiKey?: string;
}

export interface CreateProjectApiKeyRequest {
  name?: string;
}

export type ExportPdfUrlResponse = RenderResponse & object;

export interface RenderResponse {
  /** @format guid */
  jobId?: string;
  downloadUrl?: string | null;
  /** @format int32 */
  expiresIn?: number;
  fileType?: string;
  status?: string;
  isZipped?: boolean;
}

export type PdfFromTemplateRequest = DocumentProcessingRequestBase & {
  templateKey?: string;
  fileName?: string | null;
  fileType?: string;
  table?: WordTableDataRequest[] | null;
};

export type WordTableDataRequest = TableDataRequest & {
  repeatHeader?: boolean;
};

export interface TableDataRequest {
  rows?: Record<string, any>[];
  sort?: SortDefinition[] | null;
  verticalMerge?: string[] | null;
  collapse?: string[] | null;
}

export interface SortDefinition {
  field?: string;
  direction?: string;
}

export interface DocumentProcessingRequestBase {
  replace?: Record<string, string>;
  image?: Record<string, ImageDataRequest>;
  qrcode?: Record<string, QrCodeDataRequest>;
  barcode?: Record<string, BarcodeDataRequest>;
  pdfPassword?: PdfPasswordRequest | null;
  watermark?: PdfWatermarkRequest | null;
  zipOutput?: boolean;
}

export interface ImageDataRequest {
  src?: string;
  /** @format int32 */
  width?: number | null;
  /** @format int32 */
  height?: number | null;
  fit?: string | null;
}

export interface QrCodeDataRequest {
  text?: string;
  /** @format int32 */
  size?: number;
  color?: string | null;
  backgroundColor?: string | null;
  logo?: string | null;
}

export interface BarcodeDataRequest {
  text?: string;
  format?: string;
  /** @format int32 */
  width?: number;
  /** @format int32 */
  height?: number;
  includeText?: boolean;
  color?: string | null;
  backgroundColor?: string | null;
}

export interface PdfPasswordRequest {
  userPassword?: string | null;
  ownerPassword?: string | null;
  restrictPrinting?: boolean;
  restrictCopying?: boolean;
  restrictModifying?: boolean;
}

export interface PdfWatermarkRequest {
  type?: string;
  text?: string | null;
  imageSrc?: string | null;
  /** @format double */
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  /** @format double */
  opacity?: number;
  /** @format double */
  rotation?: number;
  positionX?: string;
  positionY?: string;
  /** @format double */
  width?: number | null;
  /** @format double */
  height?: number | null;
  pages?: number[] | null;
}

export interface KeyValuePairOfStringAndJsonNode {
  key?: string;
  value?: JsonNode | null;
}

export interface JsonNode {
  underlyingElement?: any;
  options?: JsonNodeOptions | null;
  parent?: JsonNode | null;
  root?: JsonNode;
}

export interface JsonNodeOptions {
  propertyNameCaseInsensitive?: boolean;
}

export interface ExportExcelUrlResponse {
  /** @format guid */
  jobId?: string;
  downloadUrl?: string | null;
  /** @format int32 */
  expiresIn?: number;
  status?: string;
  fileType?: string;
  isZipped?: boolean;
}

export type ExcelFromTemplateRequest = DocumentProcessingRequestBase & {
  templateKey?: string;
  fileName?: string | null;
  fileType?: string;
  table?: ExcelTableDataRequest[] | null;
};

export type ExcelTableDataRequest = TableDataRequest & {
  autoFilter?: boolean;
  freezeHeader?: boolean;
  autoFitColumns?: boolean;
  asExcelTable?: boolean;
  excelTableStyle?: string | null;
  outline?: boolean;
  generateTotals?: Record<string, string>;
  numberFormat?: Record<string, string>;
  conditionalFormat?: ConditionalFormatConfigRequest[] | null;
  splitToSheets?: SplitToSheetsConfigRequest | null;
};

export interface ConditionalFormatConfigRequest {
  field?: string;
  rules?: ConditionalFormatRuleRequest[];
}

export interface ConditionalFormatRuleRequest {
  value?: any;
  operator?: string | null;
  fontColor?: string | null;
  backgroundColor?: string | null;
  bold?: boolean | null;
  italic?: boolean | null;
}

export interface SplitToSheetsConfigRequest {
  field?: string;
  templateSheet?: string | null;
}

export interface PaginatedListOfReportJobDto {
  items?: ReportJobDto[];
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  totalPages?: number;
  /** @format int32 */
  totalCount?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface ReportJobDto {
  /** @format guid */
  id?: string;
  /** @format guid */
  userId?: string;
  /** @format guid */
  apiKeyId?: string | null;
  /** @format guid */
  subscriptionId?: string | null;
  sourceType?: string | null;
  /** @format guid */
  templateVersionId?: string | null;
  chargedType?: string | null;
  status?: string | null;
  requestData?: string | null;
  outputFilePath?: string | null;
  errorMessage?: string | null;
  /** @format date-time */
  startedAt?: string | null;
  /** @format date-time */
  finishedAt?: string | null;
  /** @format int64 */
  durationMs?: number | null;
  /** @format int64 */
  fileSizeBytes?: number | null;
  createdBy?: string | null;
  /** @format date-time */
  createdDatetime?: string | null;
  updatedBy?: string | null;
  /** @format date-time */
  updatedDatetime?: string | null;
}

export interface CreateReportJobResponse {
  /** @format guid */
  jobId?: string;
  status?: string;
  chargedType?: string;
}

export interface CreateReportJobCommand {
  templateKey?: string;
  requestData?: JsonDocument;
}

export interface JsonDocument {
  isDisposable?: boolean;
  rootElement?: any;
}

export interface ProfileDto {
  /** @format guid */
  id?: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  /** @format int32 */
  creditBalance?: number;
}

export interface UpdateProfileRequest {
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

export type TemplateDetailResponse = TemplateResponse & {
  fileSandboxLastTestPresigned?: string | null;
};

export type TemplateResponse = TemplateDto & {
  activeVersion?: TemplateVersionResponse | null;
  allVersions?: TemplateVersionResponse[];
  sandboxPayload?: string | null;
};

export type TemplateVersionResponse = TemplateVersionDto & {
  previewFilePathPresigned?: string | null;
};

export interface TemplateVersionDto {
  /** @format guid */
  id?: string;
  /** @format guid */
  templateId?: string;
  /** @format int32 */
  version?: number;
  filePath?: string;
  status?: string | null;
  previewFilePath?: string | null;
  sandboxPayload?: string | null;
  sandboxFilePath?: string | null;
  createdBy?: string | null;
  /** @format date-time */
  createdDatetime?: string | null;
  updatedBy?: string | null;
  /** @format date-time */
  updatedDatetime?: string | null;
}

export interface TemplateDto {
  /** @format guid */
  id?: string;
  /** @format guid */
  userId?: string;
  /** @format guid */
  projectId?: string | null;
  templateKey?: string;
  name?: string;
  createdBy?: string | null;
  /** @format date-time */
  createdDatetime?: string | null;
  updatedBy?: string | null;
  /** @format date-time */
  updatedDatetime?: string | null;
}

export interface PaginatedListOfTemplateResponse {
  items?: TemplateResponse[];
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  totalPages?: number;
  /** @format int32 */
  totalCount?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface SwitchVersionRequest {
  /** @format int32 */
  version?: number | null;
}

export interface DownloadTemplateResponse {
  url?: string;
}

export interface PaginatedListOfCreditTransactionDto {
  items?: CreditTransactionDto[];
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  totalPages?: number;
  /** @format int32 */
  totalCount?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface CreditTransactionDto {
  /** @format guid */
  id?: string;
  /** @format guid */
  userId?: string;
  /** @format guid */
  paymentId?: string | null;
  transactionType?: string;
  /** @format int32 */
  amount?: number;
  /** @format int32 */
  balanceAfter?: number;
  referenceId?: string | null;
  createdBy?: string | null;
  /** @format date-time */
  createdDatetime?: string | null;
  updatedBy?: string | null;
  /** @format date-time */
  updatedDatetime?: string | null;
}

export interface CreateUserResponse {
  /** @format guid */
  id?: string;
}

export interface CreateUserRequest {
  email?: string;
  password?: string;
  firstName?: string | null;
  lastName?: string | null;
  status?: string | null;
}

export interface PaginatedListOfUserDto {
  items?: UserDto[];
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  totalPages?: number;
  /** @format int32 */
  totalCount?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface UserDto {
  /** @format guid */
  id?: string;
  email?: string;
  passwordHash?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  profileImageUrl?: string | null;
  googleId?: string | null;
  githubId?: string | null;
  gitlabId?: string | null;
  /** @format int32 */
  creditBalance?: number;
  status?: string | null;
  createdBy?: string | null;
  /** @format date-time */
  createdDatetime?: string | null;
  updatedBy?: string | null;
  /** @format date-time */
  updatedDatetime?: string | null;
}

export interface UpdateUserRequest {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  status?: string | null;
}

export interface CreateApiKeyResponse {
  /** @format guid */
  id?: string;
  apiKey?: string;
}

export interface CreateApiKeyRequest {
  name?: string | null;
  /** @format int32 */
  quotaPerDay?: number | null;
}

export interface ApiKeyDto {
  /** @format guid */
  id?: string;
  /** @format guid */
  userId?: string;
  /** @format guid */
  projectId?: string | null;
  xApiKey?: string;
  name?: string | null;
  isActive?: boolean | null;
  createdBy?: string | null;
  /** @format date-time */
  createdDatetime?: string | null;
  updatedBy?: string | null;
  /** @format date-time */
  updatedDatetime?: string | null;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const responseToParse = responseFormat ? response.clone() : response;
      const data = !responseFormat
        ? r
        : await responseToParse[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title Qorstack Report API
 * @version v1
 *
 * API for generating PDF reports from Word templates
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  render = {
    /**
     * No description
     *
     * @tags Render
     * @name PostRenderWordTemplate
     * @request POST:/render/word/template
     * @secure
     */
    postRenderWordTemplate: (
      data: PdfFromTemplateRequest,
      params: RequestParams = {},
    ) =>
      this.request<ExportPdfUrlResponse, ProblemDetails>({
        path: `/render/word/template`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Render
     * @name PostRenderExcelTemplate
     * @request POST:/render/excel/template
     * @secure
     */
    postRenderExcelTemplate: (
      data: ExcelFromTemplateRequest,
      params: RequestParams = {},
    ) =>
      this.request<ExportExcelUrlResponse, ProblemDetails>({
        path: `/render/excel/template`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
}

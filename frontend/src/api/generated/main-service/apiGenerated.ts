/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface ApiKeyDto {
  /** @format uuid */
  id: string
  /** @format uuid */
  userId: string
  /** @format uuid */
  projectId?: null | string
  xApiKey: string
  name?: null | string
  isActive?: null | boolean
  createdBy?: null | string
  /** @format date-time */
  createdDatetime?: any
  updatedBy?: null | string
  /** @format date-time */
  updatedDatetime?: any
}

export interface BarcodeDataRequest {
  text?: string
  format?: string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  width?: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  height?: number | string
  includeText?: boolean
  color?: null | string
  backgroundColor?: null | string
}

export interface BusiestDayDto {
  date: string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  count: number | string
}

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

export interface ConditionalFormatConfigRequest {
  field?: string
  rules?: ConditionalFormatRuleRequest[]
}

export interface ConditionalFormatRuleRequest {
  value?: any
  operator?: null | string
  fontColor?: null | string
  backgroundColor?: null | string
  bold?: null | boolean
  italic?: null | boolean
}

export interface ContributionDataDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalContributions: number | string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$
   */
  growthPercent: number | string
  busiestDay: BusiestDayDto
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  activeDays: number | string
  dailyData: DailyContributionDto[]
}

export interface CreateApiKeyRequest {
  name?: null | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  quotaPerDay?: null | number | string
}

export interface CreateApiKeyResponse {
  /** @format uuid */
  id?: string
  apiKey: string
}

export interface CreateExampleCategoryCommand {
  name?: string
}

export interface CreateExampleProductCommand {
  name?: string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  price?: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  categoryId?: number | string
}

export interface CreatePaymentCommand {
  /** @format uuid */
  planId?: string
  paymentMethod?: string
}

export interface CreatePaymentResponse {
  /** @format uuid */
  paymentId?: string
  status?: string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  amount?: number | string
  currency?: string
}

export interface CreateProjectApiKeyRequest {
  name: string
}

export interface CreateProjectRequest {
  name: string
  description: null | string
}

export interface CreateReportJobCommand {
  templateKey?: string
  requestData?: JsonDocument
}

export interface CreateReportJobResponse {
  /** @format uuid */
  jobId?: string
  status?: string
  chargedType?: string
}

export interface CreateUserRequest {
  email: string
  password: string
  firstName?: null | string
  lastName?: null | string
  status?: null | string
}

export interface CreateUserResponse {
  /** @format uuid */
  id?: string
}

export interface CreditTransactionDto {
  /** @format uuid */
  id: string
  /** @format uuid */
  userId: string
  /** @format uuid */
  paymentId?: null | string
  transactionType: string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  amount: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  balanceAfter: number | string
  referenceId?: null | string
  createdBy?: null | string
  /** @format date-time */
  createdDatetime?: any
  updatedBy?: null | string
  /** @format date-time */
  updatedDatetime?: any
}

export interface DailyContributionDto {
  date: string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  count: number | string
}

export interface DashboardSummaryDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalGenerated: number | string
  totalGeneratedTrend: (number | string)[]
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  activeProjects: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  maxProjects: number | string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$
   */
  successRate: number | string
  successRateTrend: (number | string)[]
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalTemplates: number | string
  templateBreakdown: TemplateBreakdownDto[]
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  creditBalance: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  creditLimit: number | string
}

export interface DownloadTemplateResponse {
  url?: string
}

export interface ExampleCategoryDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  categoryId?: number | string
  name?: string
  /** @format date-time */
  createdDatetime?: any
  createdBy?: null | string
  /** @format date-time */
  updatedDatetime?: any
  updatedBy?: null | string
}

export interface ExampleProductDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  productId?: number | string
  name?: string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  price?: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  categoryId?: number | string
  categoryName?: string
  /** @format date-time */
  createdDatetime?: any
  createdBy?: null | string
  /** @format date-time */
  updatedDatetime?: any
  updatedBy?: null | string
}

export interface ExcelFromTemplateRequest {
  templateKey?: string
  fileName?: null | string
  fileType?: string
  table?: null | any[]
  replace?: null | object
  image?: null | object
  qrcode?: null | object
  barcode?: null | object
  pdfPassword?: null | PdfPasswordRequest
  watermark?: null | PdfWatermarkRequest
  zipOutput?: boolean
}

export interface ExcelTableDataRequest {
  autoFilter?: boolean
  freezeHeader?: boolean
  autoFitColumns?: boolean
  asExcelTable?: boolean
  excelTableStyle?: null | string
  outline?: boolean
  generateTotals?: null | object
  numberFormat?: null | object
  conditionalFormat?: null | any[]
  splitToSheets?: null | SplitToSheetsConfigRequest
  rows?: object[]
  sort?: null | any[]
  verticalMerge?: null | any[]
  collapse?: null | any[]
}

export interface ExportExcelUrlResponse {
  /** @format uuid */
  jobId?: string
  downloadUrl?: null | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  expiresIn?: number | string
  status?: string
  fileType?: string
  isZipped?: boolean
}

export interface ExportPdfUrlResponse {
  /** @format uuid */
  jobId?: string
  downloadUrl?: null | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  expiresIn?: number | string
  fileType?: string
  status?: string
  isZipped?: boolean
}

export interface FontDetailDto {
  /** @format uuid */
  id: string
  name: string
  familyName: string
  subFamilyName: string
  /**
   * @format int16
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  weight: number | string
  isItalic: boolean
  fileFormat: string
  /**
   * @format int64
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  fileSizeBytes: number | string
  isSystemFont: boolean
  accessType: string
  /** @format date-time */
  createdDatetime: any
  /** @format uuid */
  ownershipId?: null | string
  licenseNote?: null | string
  downloadUrl?: null | string
}

export interface FontSummaryDto {
  /** @format uuid */
  id: string
  name: string
  familyName: string
  subFamilyName: string
  /**
   * @format int16
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  weight: number | string
  isItalic: boolean
  fileFormat: string
  /**
   * @format int64
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  fileSizeBytes: number | string
  isSystemFont: boolean
  accessType: string
  /** @format date-time */
  createdDatetime: any
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ForgotPasswordResponse {
  refCode: string
}

export interface GenerationDto {
  /** @format uuid */
  id: string
  templateName: null | string
  templateKey: null | string
  type: null | string
  status: string
  /** @format date-time */
  createdDatetime: any
  /**
   * @format int64
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  durationMs: null | number | string
  /**
   * @format int64
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  fileSizeBytes: null | number | string
  errorMessage: null | string
  downloadUrl: null | string
}

export interface GithubLoginRequest {
  githubId: string
  email: string
  name: string
  avatarUrl: string
}

export interface GitlabLoginRequest {
  gitlabId: string
  email: string
  name: string
  avatarUrl: string
}

export interface GoogleLoginRequest {
  googleId: string
  email: string
  firstName: string
  lastName: string
  photoUrl: string
}

export interface HourlyUsageDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  hour: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  count: number | string
}

/** @format binary */
export type IFormFile = File

export interface ImageDataRequest {
  src?: string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  width?: null | number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  height?: null | number | string
  fit?: null | string
}

export type JsonDocument = any

export type JsonObject = object

export interface LoginRequest {
  email: string
  password: string
}

export interface PaginatedListOfCreditTransactionDto {
  items: CreditTransactionDto[]
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  pageNumber: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalPages?: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalCount?: number | string
  hasPreviousPage?: boolean
  hasNextPage?: boolean
}

export interface PaginatedListOfExampleCategoryDto {
  items: ExampleCategoryDto[]
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  pageNumber: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalPages?: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalCount?: number | string
  hasPreviousPage?: boolean
  hasNextPage?: boolean
}

export interface PaginatedListOfExampleProductDto {
  items: ExampleProductDto[]
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  pageNumber: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalPages?: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalCount?: number | string
  hasPreviousPage?: boolean
  hasNextPage?: boolean
}

export interface PaginatedListOfGenerationDto {
  items: GenerationDto[]
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  pageNumber: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalPages?: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalCount?: number | string
  hasPreviousPage?: boolean
  hasNextPage?: boolean
}

export interface PaginatedListOfPaymentDto {
  items: PaymentDto[]
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  pageNumber: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalPages?: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalCount?: number | string
  hasPreviousPage?: boolean
  hasNextPage?: boolean
}

export interface PaginatedListOfPlanDto {
  items: PlanDto[]
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  pageNumber: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalPages?: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalCount?: number | string
  hasPreviousPage?: boolean
  hasNextPage?: boolean
}

export interface PaginatedListOfReportJobDto {
  items: ReportJobDto[]
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  pageNumber: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalPages?: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalCount?: number | string
  hasPreviousPage?: boolean
  hasNextPage?: boolean
}

export interface PaginatedListOfTemplateResponse {
  items: TemplateResponse[]
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  pageNumber: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalPages?: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalCount?: number | string
  hasPreviousPage?: boolean
  hasNextPage?: boolean
}

export interface PaginatedListOfUserDto {
  items: UserDto[]
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  pageNumber: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalPages?: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalCount?: number | string
  hasPreviousPage?: boolean
  hasNextPage?: boolean
}

export interface PaymentDto {
  /** @format uuid */
  id: string
  /** @format uuid */
  userId: string
  /** @format uuid */
  planId?: null | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  creditAmount?: null | number | string
  /** @format uuid */
  packageId?: null | string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  amountMoney: number | string
  currency: string
  status?: null | string
  paymentMethod?: null | string
  externalRef?: null | string
  createdBy?: null | string
  /** @format date-time */
  createdDatetime?: any
  updatedBy?: null | string
  /** @format date-time */
  updatedDatetime?: any
}

export interface PdfFromTemplateRequest {
  templateKey?: string
  fileName?: null | string
  fileType?: string
  table?: null | any[]
  replace?: null | object
  image?: null | object
  qrcode?: null | object
  barcode?: null | object
  pdfPassword?: null | PdfPasswordRequest
  watermark?: null | PdfWatermarkRequest
  zipOutput?: boolean
}

export interface PdfPasswordRequest {
  userPassword?: null | string
  ownerPassword?: null | string
  restrictPrinting?: boolean
  restrictCopying?: boolean
  restrictModifying?: boolean
}

export interface PdfWatermarkRequest {
  type?: string
  text?: null | string
  imageSrc?: null | string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$
   */
  fontSize?: number | string
  fontFamily?: string
  color?: string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$
   */
  opacity?: number | string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$
   */
  rotation?: number | string
  positionX?: string
  positionY?: string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$
   */
  width?: null | number | string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$
   */
  height?: null | number | string
  pages?: null | any[]
}

export interface PlanDto {
  /** @format uuid */
  id: string
  name: string
  code: string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  price?: null | number | string
  currency?: null | string
  featuresConfig: string
  isShow?: null | boolean
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  displayOrder?: null | number | string
  isActive?: null | boolean
  createdBy?: null | string
  /** @format date-time */
  createdDatetime?: any
  updatedBy?: null | string
  /** @format date-time */
  updatedDatetime?: any
}

export interface ProblemDetails {
  type?: null | string
  title?: null | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  status?: null | number | string
  detail?: null | string
  instance?: null | string
}

export interface ProfileDto {
  /** @format uuid */
  id: string
  email: string
  firstName: null | string
  lastName: null | string
  profileImageUrl: null | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  creditBalance: number | string
}

export interface ProjectApiKeyDto {
  apiKey: string
}

export interface ProjectDto {
  /** @format uuid */
  id: string
  name: string
  description: null | string
  status: null | string
  /** @format date-time */
  createdDatetime: any
}

export interface QrCodeDataRequest {
  text?: string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  size?: number | string
  color?: null | string
  backgroundColor?: null | string
  logo?: null | string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface RegisterResponse {
  /** @format uuid */
  id: string
  email: string
  firstName: null | string
  lastName: null | string
  status: string
  refCode: string
}

export interface ReportJobDto {
  /** @format uuid */
  id: string
  /** @format uuid */
  userId: string
  /** @format uuid */
  apiKeyId?: null | string
  /** @format uuid */
  subscriptionId?: null | string
  sourceType?: null | string
  /** @format uuid */
  templateVersionId?: null | string
  chargedType?: null | string
  status?: null | string
  requestData?: null | string
  outputFilePath?: null | string
  errorMessage?: null | string
  /** @format date-time */
  startedAt?: any
  /** @format date-time */
  finishedAt?: any
  /**
   * @format int64
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  durationMs?: null | number | string
  /**
   * @format int64
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  fileSizeBytes?: null | number | string
  createdBy?: null | string
  /** @format date-time */
  createdDatetime?: any
  updatedBy?: null | string
  /** @format date-time */
  updatedDatetime?: any
}

export interface ResetPasswordRequest {
  verificationToken: string
  newPassword: string
}

export interface SortDefinition {
  field?: string
  direction?: string
}

export interface SplitToSheetsConfigRequest {
  field?: string
  templateSheet?: null | string
}

export interface SwitchVersionRequest {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  version?: null | number | string
}

export interface TemplateBreakdownDto {
  type: string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  count: number | string
}

export interface TemplateDetailResponse {
  fileSandboxLastTestPresigned?: null | string
  activeVersion?: null | TemplateVersionResponse
  allVersions?: TemplateVersionResponse[]
  sandboxPayload?: null | string
  /** @format uuid */
  id: string
  /** @format uuid */
  userId: string
  /** @format uuid */
  projectId?: null | string
  templateKey: string
  name: string
  createdBy?: null | string
  /** @format date-time */
  createdDatetime?: any
  updatedBy?: null | string
  /** @format date-time */
  updatedDatetime?: any
}

export interface TemplatePerformanceDto {
  templateKey: string
  templateName: string
  projectName: string
  type: string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalGenerations: number | string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$
   */
  avgDurationMs: number | string
  /**
   * @format int64
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  avgFileSizeBytes: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  errorCount: number | string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$
   */
  successRate: number | string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$
   */
  errorRate: number | string
  /** @format date-time */
  lastGeneratedAt: any
}

export interface TemplateResponse {
  activeVersion?: null | TemplateVersionResponse
  allVersions?: TemplateVersionResponse[]
  sandboxPayload?: null | string
  /** @format uuid */
  id: string
  /** @format uuid */
  userId: string
  /** @format uuid */
  projectId?: null | string
  templateKey: string
  name: string
  createdBy?: null | string
  /** @format date-time */
  createdDatetime?: any
  updatedBy?: null | string
  /** @format date-time */
  updatedDatetime?: any
}

export interface TemplateVersionResponse {
  previewFilePathPresigned?: null | string
  /** @format uuid */
  id: string
  /** @format uuid */
  templateId: string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  version: number | string
  filePath: string
  status?: null | string
  previewFilePath?: null | string
  sandboxPayload?: null | string
  sandboxFilePath?: null | string
  createdBy?: null | string
  /** @format date-time */
  createdDatetime?: any
  updatedBy?: null | string
  /** @format date-time */
  updatedDatetime?: any
}

export interface UpdateExampleCategoryCommand {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  id?: number | string
  name?: string
}

export interface UpdateExampleProductCommand {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  id?: number | string
  name?: string
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  price?: number | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  categoryId?: number | string
}

export interface UpdateProfileRequest {
  firstName: null | string
  lastName: null | string
  profileImageUrl: null | string
}

export interface UpdateProjectRequest {
  name: string
  description: null | string
}

export interface UpdateUserRequest {
  email?: null | string
  firstName?: null | string
  lastName?: null | string
  status?: null | string
}

export interface UsageDataDto {
  range: string
  groupBy: string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalVolume: number | string
  data: UsageDataPointDto[]
}

export interface UsageDataPointDto {
  date: string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  count: number | string
  breakdown: Record<string, number | string>
}

export interface UserDto {
  /** @format uuid */
  id: string
  email: string
  passwordHash?: null | string
  firstName?: null | string
  lastName?: null | string
  phoneNumber?: null | string
  profileImageUrl?: null | string
  googleId?: null | string
  githubId?: null | string
  gitlabId?: null | string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  creditBalance: number | string
  status?: null | string
  createdBy?: null | string
  /** @format date-time */
  createdDatetime?: any
  updatedBy?: null | string
  /** @format date-time */
  updatedDatetime?: any
}

export interface VerifyOtpRequest {
  email: string
  otp: string
  type: string
}

export interface VerifyOtpResponse {
  verificationToken: string
}

export interface WeeklyUsageDto {
  date: string
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  count: number | string
}

export interface WordTableDataRequest {
  repeatHeader?: boolean
  rows?: object[]
  sort?: null | any[]
  verticalMerge?: null | any[]
  collapse?: null | any[]
}

import type { AxiosInstance, AxiosRequestConfig, HeadersDefaults, ResponseType } from 'axios'
import axios from 'axios'

export type QueryParamsType = Record<string | number, any>

export interface FullRequestParams extends Omit<AxiosRequestConfig, 'data' | 'params' | 'url' | 'responseType'> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean
  /** request path */
  path: string
  /** content type of request body */
  type?: ContentType
  /** query params */
  query?: QueryParamsType
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType
  /** request body */
  body?: unknown
}

export type RequestParams = Omit<FullRequestParams, 'body' | 'method' | 'query' | 'path'>

export interface ApiConfig<SecurityDataType = unknown> extends Omit<AxiosRequestConfig, 'data' | 'cancelToken'> {
  securityWorker?: (
    securityData: SecurityDataType | null
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void
  secure?: boolean
  format?: ResponseType
}

export enum ContentType {
  Json = 'application/json',
  FormData = 'multipart/form-data',
  UrlEncoded = 'application/x-www-form-urlencoded',
  Text = 'text/plain'
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance
  private securityData: SecurityDataType | null = null
  private securityWorker?: ApiConfig<SecurityDataType>['securityWorker']
  private secure?: boolean
  private format?: ResponseType

  constructor({ securityWorker, secure, format, ...axiosConfig }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({ ...axiosConfig, baseURL: axiosConfig.baseURL || 'http://localhost:5000/' })
    this.secure = secure
    this.format = format
    this.securityWorker = securityWorker
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data
  }

  protected mergeRequestParams(params1: AxiosRequestConfig, params2?: AxiosRequestConfig): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method)

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method && this.instance.defaults.headers[method.toLowerCase() as keyof HeadersDefaults]) || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {})
      }
    }
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === 'object' && formItem !== null) {
      return JSON.stringify(formItem)
    } else {
      return `${formItem}`
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    if (input instanceof FormData) {
      return input
    }
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key]
      const propertyContent: any[] = property instanceof Array ? property : [property]

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File
        formData.append(key, isFileType ? formItem : this.stringifyFormItem(formItem))
      }

      return formData
    }, new FormData())
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<T> => {
    const secureParams =
      ((typeof secure === 'boolean' ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {}
    const requestParams = this.mergeRequestParams(params, secureParams)
    const responseFormat = format || this.format || undefined

    if (type === ContentType.FormData && body && body !== null && typeof body === 'object') {
      body = this.createFormData(body as Record<string, unknown>)
    }

    if (type === ContentType.Text && body && body !== null && typeof body !== 'string') {
      body = JSON.stringify(body)
    }

    return this.instance
      .request({
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData ? { 'Content-Type': type } : {})
        },
        params: query,
        responseType: responseFormat,
        data: body,
        url: path
      })
      .then(response => response.data)
  }
}

/**
 * @title Qorstack Report API
 * @version 1.0.0
 * @baseUrl http://localhost:5000/
 *
 * API for generating PDF reports from Word templates
 */
export class Api<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
  apiKeys = {
    /**
     * No description
     *
     * @tags Users
     * @name ApiKeysDelete
     * @request DELETE:/api-keys/{id}
     * @secure
     */
    apiKeysDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, ProblemDetails>({
        path: `/api-keys/${id}`,
        method: 'DELETE',
        secure: true,
        ...params
      })
  }
  analytics = {
    /**
     * No description
     *
     * @tags Analytics
     * @name DashboardSummaryList
     * @request GET:/analytics/dashboard-summary
     * @secure
     */
    dashboardSummaryList: (
      query?: {
        /** @default "7D" */
        range?: string
        /** @format uuid */
        projectId?: string
        /** @format date-time */
        fromDate?: any
        /** @format date-time */
        toDate?: any
      },
      params: RequestParams = {}
    ) =>
      this.request<DashboardSummaryDto, any>({
        path: `/analytics/dashboard-summary`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Analytics
     * @name ContributionsList
     * @request GET:/analytics/contributions
     * @secure
     */
    contributionsList: (
      query?: {
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        year?: number | string
      },
      params: RequestParams = {}
    ) =>
      this.request<ContributionDataDto, any>({
        path: `/analytics/contributions`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Analytics
     * @name UsageList
     * @request GET:/analytics/usage
     * @secure
     */
    usageList: (
      query?: {
        /** @default "7D" */
        range?: string
        /** @default "day" */
        groupBy?: string
        /** @format uuid */
        projectId?: string
        /** @format date-time */
        fromDate?: any
        /** @format date-time */
        toDate?: any
      },
      params: RequestParams = {}
    ) =>
      this.request<UsageDataDto, any>({
        path: `/analytics/usage`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Analytics
     * @name UsageHourlyList
     * @request GET:/analytics/usage/hourly
     * @secure
     */
    usageHourlyList: (
      query?: {
        date?: string
      },
      params: RequestParams = {}
    ) =>
      this.request<HourlyUsageDto[], any>({
        path: `/analytics/usage/hourly`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Analytics
     * @name UsageWeeklyList
     * @request GET:/analytics/usage/weekly
     * @secure
     */
    usageWeeklyList: (params: RequestParams = {}) =>
      this.request<WeeklyUsageDto[], any>({
        path: `/analytics/usage/weekly`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Analytics
     * @name TemplatesList
     * @request GET:/analytics/templates
     * @secure
     */
    templatesList: (
      query?: {
        range?: string
        /** @format uuid */
        projectId?: string
        /** @format date-time */
        fromDate?: any
        /** @format date-time */
        toDate?: any
      },
      params: RequestParams = {}
    ) =>
      this.request<TemplatePerformanceDto[], any>({
        path: `/analytics/templates`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Analytics
     * @name GenerationsList
     * @request GET:/analytics/generations
     * @secure
     */
    generationsList: (
      query?: {
        /** @format uuid */
        projectId?: string
        templateKey?: string
        status?: string
        /** @format date-time */
        fromDate?: any
        /** @format date-time */
        toDate?: any
        /**
         * @format int32
         * @default 1
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        pageNumber?: number | string
        /**
         * @format int32
         * @default 15
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        pageSize?: number | string
        /** @default "createdDatetime" */
        sortBy?: string
        /** @default "desc" */
        sortDirection?: string
      },
      params: RequestParams = {}
    ) =>
      this.request<PaginatedListOfGenerationDto, any>({
        path: `/analytics/generations`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      })
  }
  auth = {
    /**
     * No description
     *
     * @tags Auth
     * @name LoginCreate
     * @request POST:/auth/login
     * @secure
     */
    loginCreate: (data: LoginRequest, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/auth/login`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name RegisterCreate
     * @request POST:/auth/register
     * @secure
     */
    registerCreate: (data: RegisterRequest, params: RequestParams = {}) =>
      this.request<RegisterResponse, any>({
        path: `/auth/register`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name VerifyOtpCreate
     * @request POST:/auth/verify-otp
     * @secure
     */
    verifyOtpCreate: (data: VerifyOtpRequest, params: RequestParams = {}) =>
      this.request<VerifyOtpResponse, any>({
        path: `/auth/verify-otp`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name RefreshTokenCreate
     * @request POST:/auth/refresh-token
     * @secure
     */
    refreshTokenCreate: (params: RequestParams = {}) =>
      this.request<void, void>({
        path: `/auth/refresh-token`,
        method: 'POST',
        secure: true,
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name RevokeTokenCreate
     * @request POST:/auth/revoke-token
     * @secure
     */
    revokeTokenCreate: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/auth/revoke-token`,
        method: 'POST',
        secure: true,
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name ForgotPasswordCreate
     * @request POST:/auth/forgot-password
     * @secure
     */
    forgotPasswordCreate: (data: ForgotPasswordRequest, params: RequestParams = {}) =>
      this.request<ForgotPasswordResponse, any>({
        path: `/auth/forgot-password`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name ResetPasswordCreate
     * @request POST:/auth/reset-password
     * @secure
     */
    resetPasswordCreate: (data: ResetPasswordRequest, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/auth/reset-password`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name GoogleLoginCreate
     * @request POST:/auth/google-login
     * @secure
     */
    googleLoginCreate: (data: GoogleLoginRequest, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/auth/google-login`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name GithubLoginCreate
     * @request POST:/auth/github-login
     * @secure
     */
    githubLoginCreate: (data: GithubLoginRequest, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/auth/github-login`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name GitlabLoginCreate
     * @request POST:/auth/gitlab-login
     * @secure
     */
    gitlabLoginCreate: (data: GitlabLoginRequest, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/auth/gitlab-login`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name ChangePasswordCreate
     * @request POST:/auth/change-password
     * @secure
     */
    changePasswordCreate: (data: ChangePasswordRequest, params: RequestParams = {}) =>
      this.request<void, void>({
        path: `/auth/change-password`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params
      })
  }
  exampleCategories = {
    /**
     * No description
     *
     * @tags Example Categories
     * @name ExampleCategoriesCreate
     * @request POST:/example-categories
     * @secure
     */
    exampleCategoriesCreate: (data: CreateExampleCategoryCommand, params: RequestParams = {}) =>
      this.request<number | string, ProblemDetails>({
        path: `/example-categories`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Example Categories
     * @name ExampleCategoriesList
     * @request GET:/example-categories
     * @secure
     */
    exampleCategoriesList: (
      query: {
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        PageNumber: number | string
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        PageSize: number | string
        SearchTerm?: string
      },
      params: RequestParams = {}
    ) =>
      this.request<PaginatedListOfExampleCategoryDto, any>({
        path: `/example-categories`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Example Categories
     * @name GetExampleCategoryById
     * @request GET:/example-categories/{id}
     * @secure
     */
    getExampleCategoryById: (id: number, params: RequestParams = {}) =>
      this.request<ExampleCategoryDto, ProblemDetails>({
        path: `/example-categories/${id}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Example Categories
     * @name ExampleCategoriesUpdate
     * @request PUT:/example-categories/{id}
     * @secure
     */
    exampleCategoriesUpdate: (id: number, data: UpdateExampleCategoryCommand, params: RequestParams = {}) =>
      this.request<void, ProblemDetails>({
        path: `/example-categories/${id}`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params
      }),

    /**
     * No description
     *
     * @tags Example Categories
     * @name ExampleCategoriesDelete
     * @request DELETE:/example-categories/{id}
     * @secure
     */
    exampleCategoriesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, ProblemDetails>({
        path: `/example-categories/${id}`,
        method: 'DELETE',
        secure: true,
        ...params
      })
  }
  exampleProducts = {
    /**
     * No description
     *
     * @tags Example Products
     * @name ExampleProductsCreate
     * @request POST:/example-products
     * @secure
     */
    exampleProductsCreate: (data: CreateExampleProductCommand, params: RequestParams = {}) =>
      this.request<number | string, ProblemDetails>({
        path: `/example-products`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Example Products
     * @name ExampleProductsList
     * @request GET:/example-products
     * @secure
     */
    exampleProductsList: (
      query: {
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        PageNumber: number | string
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        PageSize: number | string
        SearchTerm?: string
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        CategoryId?: number | string
      },
      params: RequestParams = {}
    ) =>
      this.request<PaginatedListOfExampleProductDto, any>({
        path: `/example-products`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Example Products
     * @name GetExampleProductById
     * @request GET:/example-products/{id}
     * @secure
     */
    getExampleProductById: (id: number, params: RequestParams = {}) =>
      this.request<ExampleProductDto, ProblemDetails>({
        path: `/example-products/${id}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Example Products
     * @name ExampleProductsUpdate
     * @request PUT:/example-products/{id}
     * @secure
     */
    exampleProductsUpdate: (id: number, data: UpdateExampleProductCommand, params: RequestParams = {}) =>
      this.request<void, ProblemDetails>({
        path: `/example-products/${id}`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params
      }),

    /**
     * No description
     *
     * @tags Example Products
     * @name ExampleProductsDelete
     * @request DELETE:/example-products/{id}
     * @secure
     */
    exampleProductsDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, ProblemDetails>({
        path: `/example-products/${id}`,
        method: 'DELETE',
        secure: true,
        ...params
      })
  }
  projects = {
    /**
     * @description Upload a font (.ttf, .otf, .woff, .woff2). If the same file already exists in the system, the project gets ownership without re-uploading storage.
     *
     * @tags Fonts
     * @name FontsCreate
     * @summary Upload a font file
     * @request POST:/projects/{projectId}/fonts
     * @secure
     */
    fontsCreate: (
      projectId: string,
      data: {
        file?: IFormFile
      },
      query?: {
        licenseNote?: string
      },
      params: RequestParams = {}
    ) =>
      this.request<FontDetailDto, ProblemDetails>({
        path: `/projects/${projectId}/fonts`,
        method: 'POST',
        query: query,
        body: data,
        secure: true,
        type: ContentType.FormData,
        format: 'json',
        ...params
      }),

    /**
     * @description Returns system fonts (usable by all) and fonts owned by this project.
     *
     * @tags Fonts
     * @name FontsDetail
     * @summary List fonts accessible to a project
     * @request GET:/projects/{projectId}/fonts
     * @secure
     */
    fontsDetail: (
      projectId: string,
      query?: {
        search?: string
      },
      params: RequestParams = {}
    ) =>
      this.request<FontSummaryDto[], ProblemDetails>({
        path: `/projects/${projectId}/fonts`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Fonts
     * @name FontsDetail2
     * @summary Get font details
     * @request GET:/projects/{projectId}/fonts/{fontId}
     * @originalName fontsDetail
     * @duplicate
     * @secure
     */
    fontsDetail2: (projectId: string, fontId: string, params: RequestParams = {}) =>
      this.request<FontDetailDto, ProblemDetails>({
        path: `/projects/${projectId}/fonts/${fontId}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * @description Removes this project's ownership of the font. If no other project owns the font, it is deactivated.
     *
     * @tags Fonts
     * @name FontsDelete
     * @summary Remove font ownership
     * @request DELETE:/projects/{projectId}/fonts/{fontId}
     * @secure
     */
    fontsDelete: (projectId: string, fontId: string, params: RequestParams = {}) =>
      this.request<void, ProblemDetails>({
        path: `/projects/${projectId}/fonts/${fontId}`,
        method: 'DELETE',
        secure: true,
        ...params
      }),

    /**
     * No description
     *
     * @tags Projects
     * @name ProjectsList
     * @request GET:/projects
     * @secure
     */
    projectsList: (params: RequestParams = {}) =>
      this.request<ProjectDto[], any>({
        path: `/projects`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Projects
     * @name ProjectsCreate
     * @request POST:/projects
     * @secure
     */
    projectsCreate: (data: CreateProjectRequest, params: RequestParams = {}) =>
      this.request<string, any>({
        path: `/projects`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Projects
     * @name ProjectsDetail
     * @request GET:/projects/{id}
     * @secure
     */
    projectsDetail: (id: string, params: RequestParams = {}) =>
      this.request<ProjectDto, void>({
        path: `/projects/${id}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Projects
     * @name ProjectsUpdate
     * @request PUT:/projects/{id}
     * @secure
     */
    projectsUpdate: (id: string, data: UpdateProjectRequest, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/projects/${id}`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params
      }),

    /**
     * No description
     *
     * @tags Projects
     * @name ProjectsDelete
     * @request DELETE:/projects/{id}
     * @secure
     */
    projectsDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/projects/${id}`,
        method: 'DELETE',
        secure: true,
        ...params
      }),

    /**
     * No description
     *
     * @tags Projects
     * @name ApiKeysCreate
     * @request POST:/projects/{id}/api-keys
     * @secure
     */
    apiKeysCreate: (id: string, data: CreateProjectApiKeyRequest, params: RequestParams = {}) =>
      this.request<ProjectApiKeyDto, any>({
        path: `/projects/${id}/api-keys`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      })
  }
  payments = {
    /**
     * @description Create a new payment intent for purchasing credits.
     *
     * @tags Payments
     * @name PaymentsCreate
     * @summary Create payment intent
     * @request POST:/payments
     * @secure
     */
    paymentsCreate: (data: CreatePaymentCommand, params: RequestParams = {}) =>
      this.request<CreatePaymentResponse, ProblemDetails>({
        path: `/payments`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * @description Retrieve payment history for the authenticated user.
     *
     * @tags Payments
     * @name PaymentsList
     * @summary Get payment history
     * @request GET:/payments
     * @secure
     */
    paymentsList: (
      query: {
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        PageNumber: number | string
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        PageSize: number | string
      },
      params: RequestParams = {}
    ) =>
      this.request<PaginatedListOfPaymentDto, any>({
        path: `/payments`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      })
  }
  plans = {
    /**
     * @description Retrieve all active and visible plans ordered by display order.
     *
     * @tags Plans
     * @name PlansList
     * @summary Get available plans
     * @request GET:/plans
     * @secure
     */
    plansList: (
      query: {
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        PageNumber: number | string
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        PageSize: number | string
      },
      params: RequestParams = {}
    ) =>
      this.request<PaginatedListOfPlanDto, any>({
        path: `/plans`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      })
  }
  render = {
    /**
     * @description Render a PDF or DOCX using a stored template. Supports variable replacement, tables, images, QR codes, and barcodes. Returns download link.
     *
     * @tags Render
     * @name WordTemplateCreate
     * @summary Render Word/PDF from stored template (returns link)
     * @request POST:/render/word/template
     * @secure
     */
    wordTemplateCreate: (data: PdfFromTemplateRequest, params: RequestParams = {}) =>
      this.request<ExportPdfUrlResponse, ProblemDetails>({
        path: `/render/word/template`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * @description Render a PDF using a stored template with its configured sandbox payload. Returns download link.
     *
     * @tags Render
     * @name WordTemplateSandboxCreate
     * @summary Render PDF from template using sandbox payload (returns link)
     * @request POST:/render/word/template-sandbox/{templateKey}
     * @secure
     */
    wordTemplateSandboxCreate: (
      templateKey: string,
      data: null | JsonObject,
      query?: {
        fileName?: string
      },
      params: RequestParams = {}
    ) =>
      this.request<ExportPdfUrlResponse, ProblemDetails>({
        path: `/render/word/template-sandbox/${templateKey}`,
        method: 'POST',
        query: query,
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * @description Render an Excel file using a stored .xlsx template. Supports variable replacement, tables, images, QR codes, and barcodes. Can output as .xlsx or convert to PDF. Returns download link.
     *
     * @tags Render
     * @name ExcelTemplateCreate
     * @summary Render Excel from stored template (returns link)
     * @request POST:/render/excel/template
     * @secure
     */
    excelTemplateCreate: (data: ExcelFromTemplateRequest, params: RequestParams = {}) =>
      this.request<ExportExcelUrlResponse, ProblemDetails>({
        path: `/render/excel/template`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * @description Get a list of render jobs with pagination and filtering options.
     *
     * @tags Render
     * @name JobsList
     * @summary Get render jobs with pagination
     * @request GET:/render/jobs
     * @secure
     */
    jobsList: (
      query?: {
        templateKey?: string
        status?: string
        /** @format date-time */
        fromDate?: any
        /** @format date-time */
        toDate?: any
        /**
         * @format int32
         * @default 1
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        pageNumber?: number | string
        /**
         * @format int32
         * @default 10
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        pageSize?: number | string
      },
      params: RequestParams = {}
    ) =>
      this.request<PaginatedListOfReportJobDto, ProblemDetails>({
        path: `/render/jobs`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * @description Get details of a specific render job by its ID.
     *
     * @tags Render
     * @name GetRenderJobById
     * @summary Get render job by ID
     * @request GET:/render/jobs/{id}
     * @secure
     */
    getRenderJobById: (id: string, params: RequestParams = {}) =>
      this.request<ReportJobDto, ProblemDetails>({
        path: `/render/jobs/${id}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      })
  }
  reportJobs = {
    /**
     * @description Create a new report generation job with hybrid quota charging (subscription first, then credit fallback).
     *
     * @tags Report Jobs
     * @name ReportJobsCreate
     * @summary Create report job
     * @request POST:/report-jobs
     * @secure
     */
    reportJobsCreate: (data: CreateReportJobCommand, params: RequestParams = {}) =>
      this.request<CreateReportJobResponse, ProblemDetails | void>({
        path: `/report-jobs`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * @description Retrieve report jobs for the authenticated user.
     *
     * @tags Report Jobs
     * @name ReportJobsList
     * @summary Get report jobs
     * @request GET:/report-jobs
     * @secure
     */
    reportJobsList: (
      query: {
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        PageNumber: number | string
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        PageSize: number | string
      },
      params: RequestParams = {}
    ) =>
      this.request<PaginatedListOfReportJobDto, any>({
        path: `/report-jobs`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      })
  }
  settings = {
    /**
     * No description
     *
     * @tags Settings
     * @name ProfileList
     * @request GET:/settings/profile
     * @secure
     */
    profileList: (params: RequestParams = {}) =>
      this.request<ProfileDto, any>({
        path: `/settings/profile`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Settings
     * @name ProfileUpdate
     * @request PUT:/settings/profile
     * @secure
     */
    profileUpdate: (data: UpdateProfileRequest, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/settings/profile`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params
      })
  }
  templates = {
    /**
     * @description Upload a template file (DOCX or XLSX). Name is required via query parameter, file is required via multipart form data.
     *
     * @tags Templates
     * @name TemplatesCreate
     * @summary Upload a new template
     * @request POST:/templates
     * @secure
     */
    templatesCreate: (
      query: {
        name?: string
        templateKey?: string
        /** @format uuid */
        project_id?: string
        isAutoGeneratedVariable: boolean
      },
      data: {
        file?: IFormFile
      },
      params: RequestParams = {}
    ) =>
      this.request<TemplateDetailResponse, ProblemDetails>({
        path: `/templates`,
        method: 'POST',
        query: query,
        body: data,
        secure: true,
        type: ContentType.FormData,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Templates
     * @name TemplatesList
     * @request GET:/templates
     * @secure
     */
    templatesList: (
      query?: {
        status?: string
        search?: string
        /** @format uuid */
        projectId?: string
        /**
         * @format int32
         * @default 1
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        pageNumber?: number | string
        /**
         * @format int32
         * @default 10
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        pageSize?: number | string
      },
      params: RequestParams = {}
    ) =>
      this.request<PaginatedListOfTemplateResponse, ProblemDetails>({
        path: `/templates`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Templates
     * @name GetTemplateById
     * @request GET:/templates/{templateKey}
     * @secure
     */
    getTemplateById: (templateKey: string, params: RequestParams = {}) =>
      this.request<TemplateDetailResponse, ProblemDetails>({
        path: `/templates/${templateKey}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Templates
     * @name TemplatesUpdate
     * @request PUT:/templates/{templateKey}
     * @secure
     */
    templatesUpdate: (
      templateKey: string,
      query: {
        name?: string
        status?: string
        sandboxPayload?: string
        /** @format uuid */
        project_id?: string
        isAutoGeneratedVariable: boolean
      },
      data: {
        file?: IFormFile
      },
      params: RequestParams = {}
    ) =>
      this.request<TemplateDetailResponse, ProblemDetails>({
        path: `/templates/${templateKey}`,
        method: 'PUT',
        query: query,
        body: data,
        secure: true,
        type: ContentType.FormData,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Templates
     * @name TemplatesDelete
     * @request DELETE:/templates/{templateKey}
     * @secure
     */
    templatesDelete: (templateKey: string, params: RequestParams = {}) =>
      this.request<void, ProblemDetails>({
        path: `/templates/${templateKey}`,
        method: 'DELETE',
        secure: true,
        ...params
      }),

    /**
     * @description Switch the active version of a template to a specified version number.
     *
     * @tags Templates
     * @name SwitchVersionUpdate
     * @summary Switch active version of a template
     * @request PUT:/templates/{templateKey}/switch-version
     * @secure
     */
    switchVersionUpdate: (templateKey: string, data: SwitchVersionRequest, params: RequestParams = {}) =>
      this.request<void, ProblemDetails>({
        path: `/templates/${templateKey}/switch-version`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params
      }),

    /**
     * No description
     *
     * @tags Templates
     * @name DownloadTemplate
     * @request GET:/templates/{templateKey}/download
     * @secure
     */
    downloadTemplate: (templateKey: string, params: RequestParams = {}) =>
      this.request<DownloadTemplateResponse, ProblemDetails>({
        path: `/templates/${templateKey}/download`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * @description Generates a unique template key for the current user.
     *
     * @tags Templates
     * @name TemplateGenerateKeyList
     * @summary Generate a new unique template key
     * @request GET:/templates/template-generate-key
     * @secure
     */
    templateGenerateKeyList: (params: RequestParams = {}) =>
      this.request<string, ProblemDetails>({
        path: `/templates/template-generate-key`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      })
  }
  transactions = {
    /**
     * @description Retrieve credit transaction history for the authenticated user.
     *
     * @tags Transactions
     * @name TransactionsList
     * @summary Get credit transaction history
     * @request GET:/transactions
     * @secure
     */
    transactionsList: (
      query: {
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        PageNumber: number | string
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        PageSize: number | string
      },
      params: RequestParams = {}
    ) =>
      this.request<PaginatedListOfCreditTransactionDto, any>({
        path: `/transactions`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      })
  }
  users = {
    /**
     * No description
     *
     * @tags Users
     * @name UsersCreate
     * @request POST:/users
     * @secure
     */
    usersCreate: (data: CreateUserRequest, params: RequestParams = {}) =>
      this.request<CreateUserResponse, ProblemDetails>({
        path: `/users`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Users
     * @name UsersList
     * @request GET:/users
     * @secure
     */
    usersList: (
      query?: {
        status?: string
        search?: string
        /**
         * @format int32
         * @default 1
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        pageNumber?: number | string
        /**
         * @format int32
         * @default 10
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        pageSize?: number | string
      },
      params: RequestParams = {}
    ) =>
      this.request<PaginatedListOfUserDto, any>({
        path: `/users`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Users
     * @name GetUserById
     * @request GET:/users/{id}
     * @secure
     */
    getUserById: (id: string, params: RequestParams = {}) =>
      this.request<UserDto, ProblemDetails>({
        path: `/users/${id}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Users
     * @name UsersUpdate
     * @request PUT:/users/{id}
     * @secure
     */
    usersUpdate: (id: string, data: UpdateUserRequest, params: RequestParams = {}) =>
      this.request<void, ProblemDetails>({
        path: `/users/${id}`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params
      }),

    /**
     * No description
     *
     * @tags Users
     * @name ApiKeysCreate
     * @request POST:/users/{id}/api-keys
     * @secure
     */
    apiKeysCreate: (id: string, data: CreateApiKeyRequest, params: RequestParams = {}) =>
      this.request<CreateApiKeyResponse, ProblemDetails>({
        path: `/users/${id}/api-keys`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params
      }),

    /**
     * No description
     *
     * @tags Users
     * @name ApiKeysDetail
     * @request GET:/users/{id}/api-keys
     * @secure
     */
    apiKeysDetail: (id: string, params: RequestParams = {}) =>
      this.request<ApiKeyDto[], ProblemDetails>({
        path: `/users/${id}/api-keys`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params
      })
  }
}

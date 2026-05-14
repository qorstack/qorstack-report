export interface BundleScriptCustomSVGConfig {
    dir: string;
    monotone: boolean;
    prefix: string;
}
export interface BundleScriptCustomJSONConfig {
    filename: string;
    icons?: string[];
}
export interface BundleScriptConfig {
    svg?: BundleScriptCustomSVGConfig[];
    icons?: string[];
    json?: (string | BundleScriptCustomJSONConfig)[];
}
export declare const sources: BundleScriptConfig;

// bundle-config.ts

export interface BundleScriptCustomSVGConfig {
  // Path to SVG files
  dir: string

  // True if icons should be treated as monotone: colors replaced with currentColor
  monotone: boolean

  // Icon set prefix
  prefix: string
}

export interface BundleScriptCustomJSONConfig {
  // Path to JSON file
  filename: string

  // List of icons to import. If missing, all icons will be imported
  icons?: string[]
}

export interface BundleScriptConfig {
  // Custom SVG to import and bundle
  svg?: BundleScriptCustomSVGConfig[]

  // Icons to bundled from @iconify/json packages
  icons?: string[]

  // List of JSON files to bundled
  // Entry can be a string, pointing to filename or a BundleScriptCustomJSONConfig object (see type above)
  // If entry is a string or object without 'icons' property, an entire JSON file will be bundled
  json?: (string | BundleScriptCustomJSONConfig)[]
}

// Export configuration
export const sources: BundleScriptConfig = {
  json: [
    require.resolve('@iconify-json/solar/icons.json'),
    {
      filename: require.resolve('@iconify/json/json/mdi.json'),
      icons: ['star', 'heart', 'circle', 'github', 'google', 'twitter', 'facebook', 'star-outline', 'heart-outline']
    }
  ],
  svg: [
    {
      dir: 'src/iconify-bundle/svg',
      monotone: false,
      prefix: 'custom'
    }
  ]
}

// eslint-config-next 16 ships a native flat config, so no FlatCompat / @eslint/eslintrc is needed
// (FlatCompat broke with "minimatch is not a function" after the dependency security bumps).
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    rules: {
      '@next/next/no-img-element': 'off',
      'react/no-unescaped-entities': 'off',
      // React Compiler advisory rules (new in eslint-plugin-react-hooks 7): reported, not blocking.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    ignores: ['src/api/generated/**', 'src/iconify-bundle/**', 'src/generated/**', 'node_modules/**', '.next/**', 'public/**', 'dist/**', 'build/**', 'out/**', '**/*.min.js']
  }
]

export default eslintConfig

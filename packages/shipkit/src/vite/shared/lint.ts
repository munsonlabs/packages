import type { OxlintConfig } from 'oxlint'

export const lint: OxlintConfig = {
  ignorePatterns: ['**/dist/**', '**/node_modules/**', '**/test-results/**', '**/playwright-report/**'],
  rules: {
    'no-unused-vars': ['warn'],
    'typescript/unbound-method': 'off',
    'typescript/no-unused-vars': [
      'warn',
      {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
  },
  options: {
    typeAware: true,
    typeCheck: true,
  },
}

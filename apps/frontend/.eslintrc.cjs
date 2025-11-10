/** apps/frontend/.eslintrc.cjs */
module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: undefined
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier'
  ],
  settings: { react: { version: 'detect' } },
  // Exponer DOM globals explícitamente (sin env.browser)
  globals: {
    window: 'readonly',
    document: 'readonly',
    localStorage: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly'
  },
  rules: {
    'no-undef': 'off',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
  },
  overrides: [
    {
      files: ['src/{routes,pages,components}/**/*.{ts,tsx}'],
      rules: { '@typescript-eslint/no-explicit-any': 'off' }
    }
  ],
  ignorePatterns: ['dist', 'build', 'coverage', 'node_modules', '*.config.*', 'vite.config.*']
};

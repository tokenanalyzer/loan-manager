/**
 * Base shared ESLint configuration.
 * Extended by app-specific configs (see nestjs.js, react.js).
 */
module.exports = {
  root: true,

  env: {
    node: true,
    es2022: true,
  },

  parser: '@typescript-eslint/parser',

  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },

  plugins: ['@typescript-eslint', 'import'],

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],

  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
      node: true,
    },
  },

  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',

    // Disabled: unreliable with esModuleInterop + `export =`-typed CJS
    // packages (e.g. react, react-dom) under eslint-import-resolver-typescript,
    // and redundant with the separate `tsc`/typecheck step, which already
    // verifies these imports correctly.
    'import/default': 'off',

    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],

    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },

  ignorePatterns: ['dist', 'build', 'coverage', 'node_modules', '.turbo'],
};

'use strict';

const init = require('eslint-config-metarhia');

module.exports = [
  ...init,
  {
    rules: {
      'no-promise-executor-return': ['error', { allowVoid: true }],
    },
  },
  {
    files: ['schemas/**/*.js', 'test/**/*.js'],
    rules: {
      strict: 'off',
      camelcase: 'off',
    },
    languageOptions: {
      globals: {
        application: true,
        lib: true,
      },
    },
  },
];

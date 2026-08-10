import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'app',
    typescript: { tsconfigPath: './tsconfig.json' },
    react: true,
    stylistic: false,
    formatters: false,
    // Typed-lint rules need the file to be in tsconfig's `include`.
    // The eslint + vite configs are JS/TS in the project root and aren't
    // part of `src/**`, so skip them — otherwise eslint crashes trying
    // to look up parser services for them.
    // `_managed/` holds canonical demo pages the CLI copies on demand; their
    // relative imports only resolve once copied into `src/pages/`, so keep them
    // out of the in-place lint run.
    ignores: ['eslint.config.js', 'vite.config.ts', 'dist', 'node_modules', '_managed'],
  },
  {
    rules: {
      'unicorn/filename-case': [
        'error',
        {
          cases: { kebabCase: true, pascalCase: true },
          // Conventional uppercase doc files (README.md, USAGE.md, LICENSE)
          // stay uppercase; everything else follows kebab- or PascalCase.
          ignore: [/^[A-Z_]+\.md$/, /^LICENSE$/],
        },
      ],
      'no-console': 'warn',
      // The route table lazy-loads pages via `page: () => import('./pages/X')`.
      // That exact (non-async) form is what `mdk-ui add page` appends verbatim,
      // so the arrow must stay non-async — disable the rule that flags it.
      'ts/promise-function-async': 'off',
      'antfu/no-top-level-await': 'off',
      'antfu/top-level-function': 'off',
      'node/prefer-global/process': 'off',
    },
  },
)

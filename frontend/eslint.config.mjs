import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'next-env.d.ts']),
  { files: ['src/**/*.js'], rules: { '@typescript-eslint/no-unused-vars': 'off', '@typescript-eslint/no-require-imports': 'off', 'prefer-const': 'off', 'react-hooks/immutability': 'off' } },
  { rules: { '@next/next/no-img-element': 'off', '@next/next/no-html-link-for-pages': 'off' } },
]);

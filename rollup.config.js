// @rollup/plugin-typescript: faster, but I couldn't get it to properly emit declaration files
// rollup-plugin-typescript2: couldn't get it to respect output.file instead of tsconfig.json
import typescript from 'rollup-plugin-ts';

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import polyfill from 'rollup-plugin-polyfill-node';
import {terser} from 'rollup-plugin-terser';
import pkg from './package.json';

const clean = {comments: /[^\w\W]/};

const builds = [
  {
    input: 'src/electionguard/index.ts',
    output: {file: pkg.main, format: 'esm'},
    plugins: [
      commonjs(),
      typescript(),
      terser({
        output: clean,
      }),
    ],
    external: [
      'bigint-mod-arith',
      'io-ts/Decoder',
      'io-ts/Codec',
      'fp-ts/function',
      'fp-ts/lib/Either',
      'randombytes',
      'create-hash',
      'create-hmac',
      'seedrandom',
    ],
  },
  {
    input: 'src/electionguard/index.ts',
    output: [
      {file: pkg.browser, format: 'esm'},
      {
        file: 'dist/electionguard.umd.js',
        name: 'eg',
        format: 'umd',
      },
    ],
    context: 'this',
    plugins: [
      commonjs(),
      resolve({preferBuiltins: false, browser: true}),
      polyfill(),
      typescript({
        // somewhat hacky, but official, way to prevent redundant declaration files
        hook: {
          outputPath: (path, kind) =>
            kind === 'declaration' ? './dist/index.d.ts' : path,
        },
      }),
      terser({
        output: clean,
      }),
    ],
  },
];

export default builds;

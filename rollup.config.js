import typescript from 'rollup-plugin-ts';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import polyfill from 'rollup-plugin-polyfill-node';
import {terser} from 'rollup-plugin-terser';

const clean = {comments: /[^\w\W]/};

const builds = [
  {
    input: 'src/electionguard/index.ts',
    output: {file: 'dist/index.js', format: 'esm'},
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
    output: {file: 'dist/electionguard.mjs', format: 'esm'},
    plugins: [
      commonjs(),
      resolve({preferBuiltins: false, browser: true}),
      polyfill(),
      typescript(),
      terser({
        output: clean,
      }),
    ],
  },
  {
    input: 'src/electionguard/index.ts',
    output: {
      file: 'dist/electionguard.js',
      name: 'eg',
      format: 'umd',
    },
    plugins: [
      commonjs(),
      resolve({preferBuiltins: false, browser: true}),
      polyfill(),
      typescript(),
      terser({
        output: clean,
      }),
    ],
  },
];

export default builds;

import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'
import svg from 'rollup-plugin-svg'
import pkg from './package.json'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

const isDevMode = Boolean(process.env.ROLLUP_WATCH)
console.log('is dev mode', isDevMode)

export default [{
  input: 'src/UI.ts',
  output: {
    file: 'dist/StroeerVideoplayer-default-ui.umd.js',
    exports: 'default',
    format: 'umd',
    name: 'StroeerVideoplayerDefaultUI',
    sourcemap: isDevMode
  },
  plugins: [
    typescript({
      sourceMap: isDevMode
    }),
    json(),
    svg()
  ]
},
{
  input: 'src/UI.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      exports: 'default',
      sourcemap: isDevMode
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      sourceMap: isDevMode
    }),
    json(),
    svg()
  ]
},
{
  input: 'src/UI.ts',
  output: [
    {
      file: pkg.module,
      format: 'es',
      exports: 'default',
      sourcemap: isDevMode
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      sourceMap: isDevMode
    }),
    json(),
    svg()
  ]
}]

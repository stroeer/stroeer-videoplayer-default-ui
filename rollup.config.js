import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'
import svg from 'rollup-plugin-svg'
import pkg from './package.json'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default [{
  input: 'src/UI.ts',
  output: {
    file: 'dist/StroeerVideoplayer-default-ui.umd.js',
    exports: 'default',
    format: 'umd',
    name: 'StroeerVideoplayerDefaultUI',
    sourcemap: true
  },
  plugins: [
    typescript(),
    json(),
    svg()
  ]
},
{
  input: 'src/UI.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs'
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript(),
    json(),
    svg()
  ]
},
{
  input: 'src/UI.ts',
  output: [
    {
      file: pkg.module,
      format: 'es'
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript(),
    json(),
    svg()
  ]
}]

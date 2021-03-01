import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'
import svg from 'rollup-plugin-svg'

export default {
  input: 'src/UI.ts',
  output: {
    file: 'dist/StroeerVideoplayer-default-ui.js',
    exports: 'default',
    format: 'iife',
    // format: 'umd',
    // name: 'StroeerVideoplayerDefaultUI',
    sourcemap: true
  },
  plugins: [
    typescript(),
    json(),
    svg()
  ]
}

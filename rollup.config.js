import resolve from '@rollup/plugin-node-resolve';

export default [
  {
  input: './index.js',
  output: [
    {
      format: 'esm',
      file: './index-bundle.js'
    },
  ],
  plugins: [
    resolve(),
  ]
  },
  {
    input: './viewer.js',
    output: [
      {
        format: 'esm',
        file: './viewer-bundle.js'
      },
    ],
    plugins: [
      resolve(),
    ]
    },
    {
      input: './tour.js',
      output: [
        {
          format: 'esm',
          file: './tour-bundle.js'
        },
      ],
      plugins: [
        resolve(),
      ]
      }
];
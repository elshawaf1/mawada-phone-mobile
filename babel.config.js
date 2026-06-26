module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { unstable_transformProfile: 'hermes-v0' }],
    ],
    plugins: [
      'react-native-reanimated/plugin',
    ],
    overrides: [
      {
        test: function(filename) {
          return filename && filename.includes('supabase');
        },
        plugins: [
          ['@babel/plugin-transform-modules-commonjs', { strict: false, strictMode: false }],
          '@babel/plugin-transform-dynamic-import',
        ],
      },
    ],
  };
};

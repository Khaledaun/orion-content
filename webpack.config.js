
const path = require('path');

module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/app': path.resolve(__dirname, './app'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/hooks': path.resolve(__dirname, './hooks'),
      '@/types': path.resolve(__dirname, './types'),
      '@/utils': path.resolve(__dirname, './utils')
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
  }
};

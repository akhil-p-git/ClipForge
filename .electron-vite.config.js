// Quick reference for electron-vite config if needed in the future
export default {
  main: {
    entry: 'electron/main.js',
  },
  preload: {
    entry: 'electron/preload.js',
  },
  renderer: {
    entry: 'src/main.jsx',
  },
};


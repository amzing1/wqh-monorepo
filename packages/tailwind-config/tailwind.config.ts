import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['**/*/index.html', '**/*.{js,ts,jsx,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'brand-main': '#414066'
      }
    }
  },
  plugins: []
};

export default config;

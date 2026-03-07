module.exports = {
  content: ['./*.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#D35400',
          dark: '#2C3E50',
          ink: '#2C3E50'
        },
        text: {
          primary: '#2E2E2E',
          secondary: '#6B7280'
        },
        surface: {
          base: '#FFFFFF',
          subtle: '#F9FAFB'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        soft: '0 2px 10px rgba(0,0,0,0.06)',
        note: '0 14px 40px rgba(15, 23, 42, 0.08)'
      }
    }
  }
};

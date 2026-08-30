/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: 'var(--primary)',
        'primary-strong': 'var(--primary-strong)',
        'primary-soft': 'var(--primary-soft)',
        secondary: 'var(--secondary)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        
        // Text colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-inverse': 'var(--text-inverse)',
        
        // Surfaces
        'card-bg': 'var(--card-bg)',
        'card-bg-strong': 'var(--card-bg-strong)',
        'card-bg-soft': 'var(--card-bg-soft)',
        'card-border': 'var(--card-border)',
        'input-bg': 'var(--input-bg)',
        'input-border': 'var(--input-border)',
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      animation: {
        pulse: 'pulse 1.2s infinite ease-in-out',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'ease-spring': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      backdropBlur: {
        card: '20px',
      },
      zIndex: {
        background: '-1',
        content: '1',
        nav: '40',
        overlay: '50',
        chat: '90',
        modal: '100',
      },
    },
  },
  plugins: [],
}
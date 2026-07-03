import type { Config } from 'tailwindcss'

// Semua nilai di bawah ini merefer langsung ke design.md
// JANGAN tambah warna/radius/spacing baru di luar design.md tanpa update dokumen itu dulu.
const config: Config = {
  darkMode: 'class', // dikontrol manual via class .dark di <html>, bukan prefers-color-scheme
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary — Biru Elektrik
        blue: {
          DEFAULT: '#2563EB',
          dark: '#3B82F6',
          hover: '#1D4ED8',
          'hover-dark': '#60A5FA',
          subtle: '#EFF6FF',
          'subtle-dark': '#1E3A5F',
        },
        // Accent — Merah tipis (HANYA dekoratif, lihat design.md §2)
        red: {
          DEFAULT: '#EF4444',
          subtle: '#FEF2F2',
          'subtle-dark': '#3B0E0E',
        },
        // Background & Surface
        bg: {
          DEFAULT: '#FFFFFF',
          dark: '#0F172A',
        },
        surface: {
          DEFAULT: '#F8FAFC',
          2: '#F1F5F9',
          dark: '#1E293B',
          '2-dark': '#263449',
        },
        // Teks
        text: {
          primary: '#111827',
          secondary: '#6B7280',
          muted: '#9CA3AF',
          'primary-dark': '#F9FAFB',
          'secondary-dark': '#94A3B8',
          'muted-dark': '#64748B',
        },
        // Border
        border: {
          DEFAULT: '#E5E7EB',
          dark: '#334155',
        },
        // Status
        success: '#10B981',
        warning: '#F59E0B',
      },
      fontFamily: {
        heading: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
        // 'full' sudah built-in di Tailwind (9999px)
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        md: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        lg: '0 12px 32px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)',
        blue: '0 4px 16px rgba(37,99,235,0.25)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(-2deg)' },
          '50%': { transform: 'translateY(-8px) rotate(-2deg)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config

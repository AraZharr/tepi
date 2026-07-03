/**
 * Menerapkan tema SEBELUM React hydrate, agar tidak ada "flash" dari
 * light ke dark saat halaman pertama kali dimuat.
 *
 * Cara kerja: inline script ini jalan duluan di <head>, langsung baca
 * localStorage / waktu lokal, lalu set class .dark ke <html> sebelum
 * browser sempat paint apapun.
 */
export function ThemeInitializer() {
  const script = `
    (function () {
      try {
        var STORAGE_KEY = 'tepi-theme';
        var saved = localStorage.getItem(STORAGE_KEY);
        var theme = saved;

        if (theme !== 'light' && theme !== 'dark') {
          var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          var formatter = new Intl.DateTimeFormat('en', { timeZone: tz, hour: 'numeric', hour12: false });
          var hour = parseInt(formatter.format(new Date()), 10);
          theme = (hour >= 4 && hour < 16) ? 'light' : 'dark';
        }

        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {
        // Kalau gagal (mis. localStorage diblokir), diamkan — fallback ke light
      }
    })();
  `

  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}

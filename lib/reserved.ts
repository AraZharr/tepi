/**
 * Reserved subdomain names — gak bisa diklaim user biasa, reserved buat admin.
 */
export const RESERVED_SUBDOMAINS = new Set([
  // Admin & system
  'admin', 'adm', 'root', 'system', 'sys', 'server', 'panel', 'dashboard',
  'cpanel', 'whm', 'plesk', 'directadmin',
  // Email
  'mail', 'email', 'noreply', 'no-reply', 'no_reply', 'reply', 'contact',
  'support', 'help', 'cs', 'care', 'service', 'info',
  // DNS
  'ns1', 'ns2', 'ns3', 'ns4', 'dns', 'mx', 'smtp', 'pop3', 'imap',
  // Security
  'ssl', 'tls', 'auth', 'login', 'register', 'signup', 'signin',
  'logout', 'signout', 'verify', 'verification', 'captcha',
  // Web
  'www', 'wwww', 'web', 'site', 'home', 'index', 'main', 'app', 'dev',
  'test', 'beta', 'alpha', 'staging', 'demo', 'stage', 'prod', 'production',
  'api', 'rest', 'graphql', 'cdn', 'static', 'assets', 'media', 'upload',
  'files', 'download', 'status', 'health', 'monitor', 'ping',
  // Social
  'blog', 'news', 'forum', 'community', 'chat', 'group', 'event',
  // Monitoring
  'tracker', 'analytics', 'stats', 'log', 'logs', 'debug',
  // Payment
  'payment', 'billing', 'invoice', 'receipt', 'order', 'cart',
  // Legal
  'legal', 'terms', 'privacy', 'policy', 'copyright', 'dmca',
  // Company
  'about', 'company', 'team', 'career', 'job', 'office',
  // Generic dangerous
  'null', 'undefined', 'localhost', '0', '127001',
  '*', 'wildcard', 'any', 'all',
])

export function isReserved(name: string): boolean {
  return RESERVED_SUBDOMAINS.has(name.toLowerCase().trim())
}

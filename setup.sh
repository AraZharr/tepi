#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# setup.sh — tepi.my.id Project Setup
# Jalankan di GitHub Codespace setelah upload dan unzip file proyek.
#
# Flow:
#   1. Deteksi apakah dijalankan dari dalam subfolder → pindahkan file ke root
#   2. Bersihkan ZIP yang tersisa
#   3. Install dependencies (npm install)
#   4. Buat .env.local dari .env.example (jika belum ada)
#   5. Commit dan push ke GitHub → trigger Cloudflare Pages redeploy
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Stop jika ada error

# Warna output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       tepi.my.id — Project Setup        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Step 1: Deteksi dan tangani subfolder ────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "")"

if [ -n "$GIT_ROOT" ] && [ "$SCRIPT_DIR" != "$GIT_ROOT" ]; then
  SUBFOLDER_NAME=$(basename "$SCRIPT_DIR")
  echo -e "${YELLOW}📁 File ada di subfolder '$SUBFOLDER_NAME', memindahkan ke root repo...${NC}"

  shopt -s dotglob nullglob
  for item in "$SCRIPT_DIR"/*; do
    BASENAME=$(basename "$item")
    TARGET="$GIT_ROOT/$BASENAME"
    # Hapus target lama jika ada (kecuali .git)
    [ "$BASENAME" = ".git" ] && continue
    [ -e "$TARGET" ] && rm -rf "$TARGET"
    mv "$item" "$GIT_ROOT/"
  done
  shopt -u dotglob nullglob

  rm -rf "$SCRIPT_DIR"
  cd "$GIT_ROOT"
  echo -e "${GREEN}✅ File berhasil dipindahkan ke root repo${NC}"
fi

# ── Step 2: Hapus ZIP yang tersisa ──────────────────────────────────────────
shopt -s nullglob
ZIP_FOUND=false
for ZIP in *.zip; do
  rm -f "$ZIP"
  echo -e "${GREEN}🗑️  Dihapus: $ZIP${NC}"
  ZIP_FOUND=true
done
shopt -u nullglob

if [ "$ZIP_FOUND" = false ]; then
  echo "ℹ️  Tidak ada file ZIP yang perlu dihapus"
fi

# ── Step 3: Install dependencies ────────────────────────────────────────────
echo ""
echo "📦 Menginstall dependencies..."

if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js tidak ditemukan. Pastikan Codespace sudah load dengan benar.${NC}"
  exit 1
fi

npm install
echo -e "${GREEN}✅ Dependencies berhasil diinstall${NC}"

# ── Step 4: Buat .env.local ──────────────────────────────────────────────────
if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
  cp ".env.example" ".env.local"
  echo ""
  echo -e "${YELLOW}📋 .env.local dibuat dari .env.example${NC}"
  echo -e "${YELLOW}   ⚠️  Jangan lupa isi semua nilai di .env.local sebelum development!${NC}"
fi

# ── Step 5: Git commit dan push ──────────────────────────────────────────────
echo ""
echo "🔄 Menyimpan perubahan ke GitHub..."

git config user.email "setup@tepi.pages.dev"
git config user.name "Tepi Setup"

git add -A

if git diff --cached --quiet; then
  echo "ℹ️  Tidak ada perubahan baru untuk di-commit"
else
  git commit -m "chore: initial project setup [skip ci]"
  git push
  echo -e "${GREEN}✅ Push berhasil!${NC}"
  echo "   Cloudflare Pages akan mulai redeploy otomatis dalam beberapa detik."
fi

# ── Selesai ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║           Setup Selesai! ✅             ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Langkah selanjutnya:"
echo ""
echo "  1. Isi semua nilai di .env.local"
echo "  2. Buka Cloudflare dashboard → Workers & Pages → Create → Workers Builds:"
echo "     - Hubungkan ke repo GitHub 'tepi', branch main"
echo "     - Build command : npm run deploy"
echo "     (D1 binding otomatis terbaca dari wrangler.toml, tidak perlu diatur manual)"
echo "  3. Set environment variables di Cloudflare dashboard"
echo "     (lihat .env.example untuk daftar lengkapnya)"
echo "  4. Buat D1 database dan jalankan db/schema.sql"
echo "  5. Set GitHub Secrets untuk workflow keep-alive:"
echo "     - SUPABASE_PROJECT_REF"
echo "     - SUPABASE_ANON_KEY"
echo ""
echo "  Preview URL: cek di Cloudflare dashboard setelah deploy pertama"
echo "  (formatnya: tepi.<subdomain-akun-kamu>.workers.dev)"
echo ""

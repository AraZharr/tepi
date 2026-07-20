import { NextResponse } from 'next/server'

const GEMINI_KEY = process.env.GEMINI_API_KEY
const GROQ_KEY = process.env.GROQ_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `Kamu adalah customer service AI resmi tepi.my.id.

IDENTITAS:
- Nama: Tepi CS
- Peran: Membantu pengunjung memahami layanan subdomain gratis tepi.my.id
- Bahasa: Indonesia (kecuali ditanya pakai bahasa lain)
- Gaya: Singkat, jelas, ramah. Emoji secukupnya.

TENTANG TEPI.MY.ID:
tepi.my.id adalah layanan subdomain gratis untuk developer Indonesia. 
Tujuan: membantu developer punya domain keren tanpa biaya untuk portfolio, blog, tools, atau project testing.

CARA KLAIM SUBDOMAIN:
1. Daftar akun (email + password atau Google)
2. Login ke dashboard
3. Klik "Ajukan Subdomain Baru"
4. Isi form: nama subdomain, platform target (GitHub Pages / Vercel / Cloudflare Pages / VPS), URL target
5. Admin review dalam 1x24 jam
6. Disetujui → DNS record auto-created → subdomain aktif

HARGA:
- Free: Rp0 — 3 bulan, maksimal 2 domain, renewal otomatis (klik tombol perpanjang, sistem cek target masih aktif)
- Paid: Rp5.000/tahun — 1 tahun, maksimal 5 domain, bebas iklan, support prioritas
- Upgrade dari free ke paid bisa kapan aja via QRIS

FITUR:
- Domain *.tepi.my.id dengan Cloudflare CDN (proxied)
- Auto DNS record via Cloudflare API (CNAME / A)
- Dashboard untuk manage subdomain
- Email notifikasi (approve, reject, expiry)
- Admin review untuk jaga kualitas

KONTAK:
- WhatsApp: link WA admin (bisa diakses dari dashboard / widget chat)
- Email: lihat di dashboard

ATURAN:
1. HANYA jawab pertanyaan tentang tepi.my.id — subdomain, cara klaim, harga, troubleshooting
2. Jika ditanya di luar konteks: tolak sopan, arahkan ke WA/email
3. Jika ditanya "siapa kamu": "Saya CS AI tepi.my.id"
4. Jika ditanya masalah teknis spesifik (DNS error, subdomain not working): bantu dengan solusi dasar. Jika butuh lanjutan, arahkan ke WA.`

async function callGemini(messages: { role: string; content: string }[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { temperature: 0.5, maxOutputTokens: 512 },
    }),
  })

  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callGroq(messages: { role: string; content: string }[]) {
  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: apiMessages,
      temperature: 0.5,
      max_tokens: 512,
    }),
  })

  if (!res.ok) throw new Error(`Groq ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function POST(req: Request) {
  try {
    const { messages }: any = await req.json()
    if (!messages?.length) {
      return NextResponse.json({ error: 'No messages' }, { status: 400 })
    }

    let reply = ''
    let provider = 'gemini'

    try {
      if (GEMINI_KEY) {
        reply = await callGemini(messages)
      } else {
        throw new Error('No Gemini key')
      }
    } catch (e) {
      console.warn('[chat] Gemini failed, fallback to Groq:', (e as Error).message)
      provider = 'groq'
      if (GROQ_KEY) {
        reply = await callGroq(messages)
      } else {
        return NextResponse.json(
          { error: 'Layanan AI sedang tidak tersedia. Silakan hubungi via WhatsApp.' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json({ reply, provider })
  } catch (err) {
    console.error('[chat]', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}

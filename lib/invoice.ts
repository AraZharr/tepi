let counter = Date.now() % 100000

/** Generate invoice number: INV-20260715-XXXXX */
export function generateInvoiceNumber(): string {
  counter++
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const seq = counter.toString(36).toUpperCase().slice(-5).padStart(5, '0')
  return `INV-${date}-${seq}`
}

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

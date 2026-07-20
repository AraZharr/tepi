import { useMemo } from 'react'

type Strength = 0 | 1 | 2 | 3 | 4

function calcStrength(pw: string): Strength {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  return Math.min(score, 4) as Strength
}

const labelMap: Record<Strength, string> = {
  0: '',
  1: 'Lemah',
  2: 'Cukup',
  3: 'Kuat',
  4: 'Sangat Kuat',
}

const colorMap: Record<Strength, string> = {
  0: 'bg-border',
  1: 'bg-red',
  2: 'bg-warning',
  3: 'bg-success',
  4: 'bg-success',
}

const textColorMap: Record<Strength, string> = {
  0: '',
  1: 'text-red',
  2: 'text-warning',
  3: 'text-success',
  4: 'text-success',
}

export function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => calcStrength(password), [password])
  if (!password) return null

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              strength >= level ? colorMap[strength] : 'bg-border'
            }`}
          />
        ))}
      </div>
      {strength > 0 && (
        <p className={`text-xs font-medium ${textColorMap[strength]}`}>
          {labelMap[strength]}
        </p>
      )}
    </div>
  )
}

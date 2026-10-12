const MAX_EXPRESSION_LENGTH = 256
const MAX_NESTING = 32

/** Safely evaluate a basic arithmetic expression without using eval or Function. */
export function evaluateMathExpression(input: string): number | null {
  let source = input.trim()
  if (source.startsWith('$')) source = source.slice(1).trimStart()
  if (!source || source.length > MAX_EXPRESSION_LENGTH) return null

  let position = 0
  let nesting = 0

  function skipWhitespace() {
    while (/\s/.test(source[position] ?? '')) position += 1
  }

  function parsePrimary(): number | null {
    skipWhitespace()
    if (source[position] === '(') {
      nesting += 1
      if (nesting > MAX_NESTING) return null
      position += 1
      const value = parseExpression()
      skipWhitespace()
      if (source[position] !== ')') return null
      position += 1
      nesting -= 1
      return value
    }

    const remaining = source.slice(position)
    const match = /^(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)/.exec(remaining)
    if (!match) return null
    position += match[0].length
    const value = Number(match[0].replaceAll(',', ''))
    return Number.isFinite(value) ? value : null
  }

  function parseUnary(): number | null {
    skipWhitespace()
    const operator = source[position]
    if (operator === '+' || operator === '-') {
      position += 1
      const value = parseUnary()
      if (value === null) return null
      return operator === '-' ? -value : value
    }
    return parsePrimary()
  }

  function parseTerm(): number | null {
    let value = parseUnary()
    if (value === null) return null

    while (true) {
      skipWhitespace()
      const operator = source[position]
      if (operator !== '*' && operator !== '/') return value
      position += 1
      const right = parseUnary()
      if (right === null || (operator === '/' && right === 0)) return null
      value = operator === '*' ? value * right : value / right
      if (!Number.isFinite(value)) return null
    }
  }

  function parseExpression(): number | null {
    let value = parseTerm()
    if (value === null) return null

    while (true) {
      skipWhitespace()
      const operator = source[position]
      if (operator !== '+' && operator !== '-') return value
      position += 1
      const right = parseTerm()
      if (right === null) return null
      value = operator === '+' ? value + right : value - right
      if (!Number.isFinite(value)) return null
    }
  }

  const result = parseExpression()
  skipWhitespace()
  return result !== null && position === source.length && Number.isFinite(result) ? result : null
}

/** Normalize arithmetic results to cents for currency fields. */
export function normalizeMathExpression(input: string): string | null {
  const result = evaluateMathExpression(input)
  if (result === null) return null
  const cents = Math.sign(result) * Math.round((Math.abs(result) + Number.EPSILON) * 100)
  if (!Number.isSafeInteger(cents)) return null
  const normalized = (cents / 100).toFixed(2)
  return normalized.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

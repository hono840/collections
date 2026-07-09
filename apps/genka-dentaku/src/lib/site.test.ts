import { describe, it, expect } from 'vitest'
import { jsonLdString } from './site'

describe('jsonLdString (JSON-LD injection guard)', () => {
  it('produces valid JSON that round-trips', () => {
    const obj = { '@type': 'FAQPage', name: 'x' }
    expect(JSON.parse(jsonLdString(obj))).toEqual(obj)
  })

  it('escapes every "<" as \\u003c so a </script> cannot break out of the tag', () => {
    const out = jsonLdString({ text: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('<')
    expect(out).toContain('\\u003c/script>')
    // Still parses back to the original string (escape is JSON-transparent).
    expect(JSON.parse(out).text).toBe('</script><script>alert(1)</script>')
  })

  it('neutralizes an HTML comment opener embedded in content', () => {
    const out = jsonLdString({ a: '<!-- x' })
    expect(out).not.toContain('<')
    expect(out).toContain('\\u003c!-- x')
  })
})

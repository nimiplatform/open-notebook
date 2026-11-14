import { NextRequest } from 'next/server'
import { afterEach, expect, it, vi } from 'vitest'
import { proxy } from './proxy'
afterEach(() => vi.unstubAllEnvs())
it('leaves the exact Web login callback for Kit instead of dropping its query in a root redirect', () => {
  vi.stubEnv('NEXT_PUBLIC_NIMI_WEB', '1')
  const response = proxy(new NextRequest('https://127.0.0.1:4487/?code=one-use-test-code&state=test-state'))
  expect(response.headers.get('location')).toBeNull()
  expect(response.headers.get('x-middleware-next')).toBe('1')
})
it('preserves the native notebook landing redirect', () => {
  vi.stubEnv('NEXT_PUBLIC_NIMI_WEB', '')
  const request = new NextRequest('http://127.0.0.1:6012/')
  expect(proxy(request).headers.get('location')).toBe(new URL('/notebooks', request.url).href)
})

'use client'
// Native and Web retain Next navigation. The packaged mobile renderer selects
// the App-owned history implementation at build time.
export { useRouter, usePathname, useParams, useSearchParams } from 'next/navigation'
export { default as Link } from 'next/link'

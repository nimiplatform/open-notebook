'use client'
import dynamic from 'next/dynamic'
export default dynamic(() => import('@uiw/react-md-editor').then(module => module.default), { ssr: false })

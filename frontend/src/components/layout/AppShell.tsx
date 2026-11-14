'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { AppSidebar } from './AppSidebar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useTranslation } from '@/lib/hooks/use-translation'
import { isNotebookMobile } from '@/mobile/bridge'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { t } = useTranslation()
  const [navigationOpen, setNavigationOpen] = useState(false)
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 border-b px-3 py-2 md:hidden">
        <Dialog open={navigationOpen} onOpenChange={setNavigationOpen}>
          <DialogTrigger asChild><Button variant="outline" size="sm" aria-label={t('nimi.navigation')}><Menu className="h-4 w-4" /><span>{t('nimi.navigation')}</span></Button></DialogTrigger>
          <DialogContent className="left-0 top-0 block h-dvh w-[min(20rem,calc(100vw-2rem))] max-w-none translate-x-0 translate-y-0 rounded-none p-0">
            <DialogTitle className="sr-only">{t('nimi.navigation')}</DialogTitle>
            <AppSidebar mobile onNavigate={() => setNavigationOpen(false)} />
          </DialogContent>
        </Dialog>
        {!isNotebookMobile() && <span className="font-display font-semibold">{t('common.appName')}</span>}
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden shrink-0 md:block"><AppSidebar /></div>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}

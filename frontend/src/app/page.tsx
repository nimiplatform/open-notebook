import { redirect } from 'next/navigation'
import DashboardLayout from './(dashboard)/layout'
import NotebooksPage from './(dashboard)/notebooks/page'

export default function HomePage() {
  // The declared Web callback must reach Kit before any route redirect drops it.
  if (process.env.NEXT_PUBLIC_NIMI_WEB === '1') return <DashboardLayout><NotebooksPage /></DashboardLayout>
  redirect('/notebooks')
}

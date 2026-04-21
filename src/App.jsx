import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import { CityProvider } from './hooks/useCity'
import { FiltersProvider } from './hooks/useFilters'
import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import BottomTabBar from './components/Mobile/BottomTabBar'
import Home from './pages/Home'
import PostListing from './pages/PostListing'
import ListingDetail from './pages/ListingDetail'
import MyListings from './pages/MyListings'
import EditListing from './pages/EditListing'
import Profile from './pages/Profile'
import Messages from './pages/Messages'
import { supabase } from './lib/supabase'
import { useAuth } from './hooks/useAuth'

function Layout() {
  const isMobile = window.matchMedia('(max-width: 767px)').matches
  const [unread, setUnread] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) { setUnread(0); return }
    const fetch = async () => {
      const { data: convs } = await supabase.from('conversations').select('id').or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`)
      if (!convs?.length) return
      const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true })
        .neq('sender_id', user.id).is('read_at', null).in('conversation_id', convs.map(c => c.id))
      setUnread(count ?? 0)
    }
    fetch()
    const channel = supabase.channel('layout-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id])

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black">
      <div className="hidden md:block shrink-0">
        <Navbar />
      </div>
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
      <div className="md:hidden shrink-0">
        <BottomTabBar unreadCount={unread} />
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'post', element: <div className="h-full overflow-y-auto"><PostListing /></div> },
      { path: 'listing/:id', element: <div className="h-full overflow-y-auto"><ListingDetail /></div> },
      { path: 'my-listings', element: <div className="h-full overflow-y-auto"><MyListings /></div> },
      { path: 'edit/:id', element: <div className="h-full overflow-y-auto"><EditListing /></div> },
      { path: 'profile', element: <div className="h-full overflow-y-auto"><Profile /></div> },
      { path: 'messages', element: <Messages /> },
    ],
  },
])

export default function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <CityProvider>
          <AuthProvider>
            <FiltersProvider>
              <RouterProvider router={router} />
            </FiltersProvider>
          </AuthProvider>
        </CityProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}

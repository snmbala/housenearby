import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PlusCircle, ListChecks, LogOut, User, Sun, Moon, Monitor, ChevronDown, MessageSquare } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useTheme } from '../hooks/useTheme.jsx'
import { useCity, CITIES } from '../hooks/useCity.jsx'
import { supabase } from '../lib/supabase'
import AuthModal from './Auth/AuthModal'

const THEME_CYCLE = { auto: 'light', light: 'dark', dark: 'auto' }
const THEME_ICONS = { auto: <Monitor size={14} />, light: <Sun size={14} />, dark: <Moon size={14} /> }
const THEME_LABELS = { auto: 'System', light: 'Light', dark: 'Dark' }

export default function Navbar() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const { city, selectCity } = useCity()

  const [showAuth, setShowAuth] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) { setUnreadCount(0); return }
    const fetchUnread = async () => {
      const { data: convs } = await supabase.from('conversations').select('id').or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`)
      if (!convs?.length) return
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .neq('sender_id', user.id)
        .is('read_at', null)
        .in('conversation_id', convs.map(c => c.id))
      setUnreadCount(count ?? 0)
    }
    fetchUnread()
    const channel = supabase.channel('navbar-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchUnread)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id])

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handlePostClick = () => {
    if (!user) setShowAuth(true)
    else navigate('/post')
  }

  const avatarUrl = user?.user_metadata?.avatar_url
  const initial = user ? (user.user_metadata?.name || user.email)[0].toUpperCase() : null

  return (
    <>
      <nav className="bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-900 sticky top-0 z-[1000]">
        <div className="px-4 py-2.5 flex items-center gap-4">

          {/* Logo + city */}
          <div className="flex items-center gap-4 shrink-0">
            <Link to="/" className="font-[Bricolage_Grotesque] font-semibold text-base tracking-tight text-neutral-950 dark:text-white">
              HouseNearby
            </Link>
            <div className="relative hidden sm:block">
              <select
                value={city}
                onChange={(e) => selectCity(e.target.value)}
                className="appearance-none bg-transparent font-[Bricolage_Grotesque] text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white cursor-pointer focus:outline-none pr-4 transition-colors"
              >
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600 pointer-events-none" />
            </div>
          </div>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePostClick}
              className="flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <PlusCircle size={14} />
              <span className="hidden sm:inline">Post Rental</span>
            </button>

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors shrink-0"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full border-2 border-neutral-300 dark:border-neutral-700 rounded-full flex items-center justify-center bg-transparent">
                      <span className="font-[Bricolage_Grotesque] text-xs font-semibold text-neutral-600 dark:text-neutral-400">{initial}</span>
                    </div>
                  )}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-900">
                      <p className="text-xs font-medium text-neutral-950 dark:text-white truncate">{user.user_metadata?.name || user.email}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-600 truncate mt-0.5">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <button onClick={() => { setMenuOpen(false); navigate('/profile') }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                        <User size={13} className="text-neutral-400 dark:text-neutral-600" /> Profile
                      </button>
                      <button onClick={() => { setMenuOpen(false); navigate('/my-listings') }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                        <ListChecks size={13} className="text-neutral-400 dark:text-neutral-600" /> My Listings
                      </button>
                      <button onClick={() => { setMenuOpen(false); navigate('/messages') }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                        <MessageSquare size={13} className="text-neutral-400 dark:text-neutral-600" />
                        Messages
                        {unreadCount > 0 && (
                          <span className="ml-auto w-5 h-5 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-black text-[10px] font-bold flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                      <div className="border-t border-neutral-100 dark:border-neutral-900 my-1" />
                      <button onClick={() => setTheme(THEME_CYCLE[theme])}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                        <span className="text-neutral-400 dark:text-neutral-600">{THEME_ICONS[theme]}</span>
                        {THEME_LABELS[theme]} mode
                      </button>
                      <div className="border-t border-neutral-100 dark:border-neutral-900 my-1" />
                      <button onClick={async () => { setMenuOpen(false); await signOut() }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                        <LogOut size={13} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button onClick={() => setTheme(THEME_CYCLE[theme])} title={`Theme: ${theme}`}
                  className="flex items-center text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors">
                  {THEME_ICONS[theme]}
                </button>
                <button onClick={() => setShowAuth(true)}
                  className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors">
                  <User size={14} /> Sign in
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}

import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Map, PlusCircle, MessageSquare, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useState } from 'react'
import AuthModal from '../Auth/AuthModal'

const TABS = [
  { to: '/',          icon: Map,           label: 'Explore' },
  { to: '/messages',  icon: MessageSquare, label: 'Messages' },
  { to: '/profile',   icon: User,          label: 'Profile' },
]

export default function BottomTabBar({ unreadCount = 0 }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  const handlePost = () => {
    if (!user) setShowAuth(true)
    else navigate('/post')
  }

  return (
    <>
      <nav className="flex items-center bg-white dark:bg-black border-t border-neutral-200 dark:border-neutral-900 px-2 pb-safe-or-2">
        {/* Left tabs */}
        <div className="flex flex-1 justify-around">
          {TABS.slice(0, 1).map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to
            return (
              <Link key={to} to={to} className={`flex flex-col items-center gap-0.5 py-2.5 px-5 transition-colors ${active ? 'text-neutral-950 dark:text-white' : 'text-neutral-400 dark:text-neutral-600'}`}>
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>

        {/* Center post button */}
        <button
          onClick={handlePost}
          className="flex flex-col items-center gap-0.5 py-2 px-6"
        >
          <div className="w-12 h-12 rounded-2xl bg-neutral-950 dark:bg-white flex items-center justify-center shadow-lg">
            <PlusCircle size={22} className="text-white dark:text-black" strokeWidth={2} />
          </div>
        </button>

        {/* Right tabs */}
        <div className="flex flex-1 justify-around">
          {TABS.slice(1).map(({ to, icon: Icon, label }) => {
            const active = location.pathname.startsWith(to)
            return (
              <Link key={to} to={to} className={`relative flex flex-col items-center gap-0.5 py-2.5 px-5 transition-colors ${active ? 'text-neutral-950 dark:text-white' : 'text-neutral-400 dark:text-neutral-600'}`}>
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
                {to === '/messages' && unreadCount > 0 && (
                  <span className="absolute top-2 right-3.5 w-4 h-4 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-black text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}

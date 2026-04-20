import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PlusCircle, ListChecks, LogOut, User, Sun, Moon, Monitor } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useTheme } from '../hooks/useTheme.jsx'
import AuthModal from './Auth/AuthModal'

const THEME_CYCLE = { auto: 'light', light: 'dark', dark: 'auto' }
const THEME_ICONS = {
  auto: <Monitor size={14} />,
  light: <Sun size={14} />,
  dark: <Moon size={14} />,
}

export default function Navbar() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [showAuth, setShowAuth] = useState(false)
  const navigate = useNavigate()

  const handlePostClick = () => {
    if (!user) setShowAuth(true)
    else navigate('/post')
  }

  return (
    <>
      <nav className="bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-900 sticky top-0 z-[1000]">
        <div className="max-w-7xl mx-auto px-4 h-13 flex items-center justify-between gap-4">

          <Link
            to="/"
            className="font-[Bricolage_Grotesque] font-semibold text-base tracking-tight text-neutral-950 dark:text-white shrink-0"
          >
            HouseNearby
          </Link>

          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(THEME_CYCLE[theme])}
              title={`Theme: ${theme}`}
              className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 px-2.5 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-xs font-medium"
            >
              {THEME_ICONS[theme]}
              <span className="hidden sm:inline capitalize">{theme}</span>
            </button>

            <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800 mx-1" />

            <button
              onClick={handlePostClick}
              className="flex items-center gap-1.5 bg-neutral-950 dark:bg-white text-white dark:text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
            >
              <PlusCircle size={14} />
              Post Rental
            </button>

            {user ? (
              <div className="flex items-center gap-0.5">
                <Link
                  to="/my-listings"
                  className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                >
                  <ListChecks size={14} />
                  <span className="hidden sm:inline">My Listings</span>
                </Link>
                <button
                  onClick={signOut}
                  className="flex items-center text-neutral-400 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  title="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
              >
                <User size={14} />
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}

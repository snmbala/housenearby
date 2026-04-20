import { useState } from 'react'
import { X, Mail, Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'

export default function AuthModal({ onClose }) {
  const { signInWithOtp } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signInWithOtp(email)
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative fade-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 dark:text-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
        >
          <X size={18} />
        </button>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-4">
              <Mail className="text-neutral-600 dark:text-neutral-400" size={22} />
            </div>
            <h2 className="font-[Bricolage_Grotesque] text-lg font-semibold text-neutral-950 dark:text-white mb-2">
              Check your email
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">
              We sent a magic link to{' '}
              <span className="font-medium text-neutral-800 dark:text-neutral-200">{email}</span>.
              Click it to sign in.
            </p>
          </div>
        ) : (
          <>
            <h2 className="font-[Bricolage_Grotesque] text-lg font-semibold text-neutral-950 dark:text-white mb-1">
              Sign in
            </h2>
            <p className="text-neutral-500 dark:text-neutral-500 text-sm mb-5">
              No password needed — we'll email you a magic link
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white"
              />
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Send magic link
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

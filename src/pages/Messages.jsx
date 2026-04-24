import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Send, Loader2, ArrowLeft, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import SEOMeta from '../components/SEOMeta.jsx'
import { listingUrl } from '../lib/listing'

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Messages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('c')

  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [convsLoading, setConvsLoading] = useState(true)
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    fetchConversations()
  }, [user])

  useEffect(() => {
    if (!selectedId) return
    fetchMessages(selectedId)
    markRead(selectedId)
    inputRef.current?.focus()

    const channel = supabase
      .channel(`msgs-${selectedId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new])
          if (payload.new.sender_id !== user.id) markRead(selectedId)
        })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*, listings(id, title, images, city, state, bhk, property_type, address)')
      .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!data) { setConvsLoading(false); return }

    // fetch last message + unread count for each
    const enriched = await Promise.all(data.map(async (conv) => {
      const { data: last } = await supabase
        .from('messages')
        .select('content, created_at, sender_id')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { count: unread } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .neq('sender_id', user.id)
        .is('read_at', null)

      return { ...conv, lastMessage: last, unread: unread ?? 0 }
    }))

    setConversations(enriched)
    setConvsLoading(false)
  }

  const fetchMessages = async (convId) => {
    setMsgsLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
    setMsgsLoading(false)
  }

  const markRead = async (convId) => {
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .neq('sender_id', user.id)
      .is('read_at', null)

    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, unread: 0 } : c)
    )
  }

  const sendMessage = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || !selectedId || sending) return
    setSending(true)
    setInput('')
    await supabase.from('messages').insert({
      conversation_id: selectedId,
      sender_id: user.id,
      content: text,
    })
    setSending(false)
    inputRef.current?.focus()
  }

  const selectedConv = conversations.find(c => c.id === selectedId)

  if (!user) return null

  return (
    <div className="h-full flex bg-white dark:bg-black overflow-hidden">
      <SEOMeta title="Messages" description="Your conversations on HouseNearby." />

      {/* Conversation list */}
      <div className={`w-80 shrink-0 border-r border-neutral-200 dark:border-neutral-800 flex flex-col ${selectedId ? 'hidden sm:flex' : 'flex'}`}>
        <div className="px-4 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h1 className="font-[Bricolage_Grotesque] text-lg font-bold text-neutral-950 dark:text-white">Messages</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {convsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-neutral-400" size={20} /></div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16 px-4">
              <MessageSquare size={32} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-3" />
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">No messages yet</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">Message a landlord from any listing</p>
            </div>
          ) : (
            conversations.map(conv => {
              const isSelected = conv.id === selectedId
              const isOwner = conv.owner_id === user.id
              const role = isOwner ? 'Renter' : 'Owner'
              const thumb = conv.listings?.images?.[0]

              return (
                <button
                  key={conv.id}
                  onClick={() => setSearchParams({ c: conv.id })}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-900 transition-colors ${
                    isSelected
                      ? 'bg-neutral-100 dark:bg-neutral-900'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-950'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
                    {thumb
                      ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">🏠</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-neutral-950 dark:text-white truncate">{conv.listings?.title ?? 'Listing'}</p>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-600 shrink-0">{timeAgo(conv.lastMessage.created_at)}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-600 mt-0.5">{role} · {conv.listings?.city}</p>
                    {conv.lastMessage && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-500 truncate mt-0.5">
                        {conv.lastMessage.sender_id === user.id ? 'You: ' : ''}{conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {conv.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-black text-[10px] font-bold flex items-center justify-center shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col overflow-hidden ${!selectedId ? 'hidden sm:flex' : 'flex'}`}>
        {!selectedId || !selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600">
            <MessageSquare size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <button
                onClick={() => setSearchParams({})}
                className="sm:hidden p-1.5 text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
                {selectedConv.listings?.images?.[0]
                  ? <img src={selectedConv.listings.images[0]} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">🏠</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold text-neutral-950 dark:text-white truncate cursor-pointer hover:underline"
                  onClick={() => navigate(listingUrl(selectedConv.listings ?? { id: selectedConv.listing_id }))}
                >
                  {selectedConv.listings?.title}
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-600">
                  {selectedConv.owner_id === user.id ? 'Renter enquiry' : 'Owner'}
                  {selectedConv.listings?.city ? ` · ${selectedConv.listings.city}` : ''}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {msgsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-neutral-400" size={20} /></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 dark:text-neutral-600 text-sm">
                  No messages yet. Say hello!
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = msg.sender_id === user.id
                  const showTime = i === 0 || new Date(msg.created_at) - new Date(messages[i - 1].created_at) > 5 * 60000
                  return (
                    <div key={msg.id}>
                      {showTime && (
                        <p className="text-center text-[10px] text-neutral-400 dark:text-neutral-600 my-2">
                          {new Date(msg.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[72%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                          isMine
                            ? 'bg-neutral-950 dark:bg-white text-white dark:text-black rounded-br-md'
                            : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-950 dark:text-white rounded-bl-md'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="flex items-center gap-2 px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="w-9 h-9 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-black flex items-center justify-center disabled:opacity-40 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shrink-0"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

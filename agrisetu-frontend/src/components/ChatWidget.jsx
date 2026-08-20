import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { sendChatMessage } from '../api/agrisetu'

export default function ChatWidget({ plotId }) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      const res = await sendChatMessage({
        message: userMsg,
        language: 'hi',
        plot_id: plotId || '00000000-0000-0000-0000-000000000000',
      })
      setMessages(prev => [...prev, { role: 'advisor', text: res.data.response }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'advisor', text: 'Sorry, I could not process your question. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl z-50"
        style={{ background: 'var(--green-primary)' }}
      >
        💬
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-[500px] bg-white rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden border">
      {/* Header */}
      <div className="p-4 text-white font-semibold flex justify-between items-center" style={{ background: 'var(--green-primary)' }}>
        <span>{t('dashboard.chat')}</span>
        <button onClick={() => setIsOpen(false)} className="text-white text-xl">&times;</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-8">{t('dashboard.chat')}</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'text-white rounded-br-none'
                  : 'bg-white shadow rounded-bl-none'
              }`}
              style={msg.role === 'user' ? { background: 'var(--green-primary)' } : {}}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white shadow rounded-lg px-3 py-2 text-sm text-gray-500">
              <div className="flex gap-1">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t('chat.placeholder')}
          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: loading || !input.trim() ? '#ccc' : 'var(--green-primary)' }}
        >
          →
        </button>
      </div>
    </div>
  )
}

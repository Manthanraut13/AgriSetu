import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { sendChatMessage, getChatHistory, clearChatSession } from '../api/agrisetu'

export default function ChatPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { farmer, plots } = useAuth()
  
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedPlot, setSelectedPlot] = useState(plots[0]?.id || null)
  const messagesEndRef = useRef(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => { scrollToBottom() }, [messages])
  
  const handleSend = async () => {
    if (!input.trim() || loading) return
    
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    
    try {
      const res = await sendChatMessage({
        message: userMessage,
        plot_id: selectedPlot,
        language: i18n.language,
        session_id: sessionId,
      })
      
      setSessionId(res.data.session_id)
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }
  
  const handleClear = async () => {
    if (sessionId) {
      try { await clearChatSession(sessionId) } catch (e) {}
    }
    setMessages([])
    setSessionId(null)
  }
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  if (!farmer) {
    navigate('/login')
    return null
  }
  
  return (
    <div className="min-h-screen bg-background font-sans">
      <nav className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm z-50">
        <div className="flex justify-between items-center px-4 md:px-10 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard/farmer')}>
            <span className="material-symbols-outlined text-primary text-3xl">eco</span>
            <span className="text-2xl font-display font-extrabold text-primary tracking-tight">{t('app_name')}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-full border border-outline-variant/40">
              {[{ code: 'hi', label: 'हिंदी' }, { code: 'mr', label: 'मराठी' }, { code: 'en', label: 'EN' }].map((lang) => (
                <button key={lang.code} onClick={() => i18n.changeLanguage(lang.code)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    i18n.language === lang.code
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}>
                  {lang.label}
                </button>
              ))}
            </div>
            <button onClick={() => navigate('/dashboard/farmer')}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-surface-container-low text-on-surface border border-outline-variant/40 hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-sm align-middle mr-1">dashboard</span>
              {t('farmer_hub')}
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-10 py-8">
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/30 flex flex-col h-[calc(100vh-160px)]">
          <div className="p-6 border-b border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-display font-bold text-primary">
                  <span className="material-symbols-outlined text-3xl align-middle mr-2">smart_toy</span>
                  {t('chat_title')}
                </h1>
                <p className="text-sm text-on-surface-variant mt-1">{t('chat_subtitle')}</p>
              </div>
              <div className="flex items-center gap-2">
                {plots.length > 0 && (
                  <select
                    value={selectedPlot}
                    onChange={(e) => setSelectedPlot(e.target.value)}
                    className="px-3 py-2 rounded-full text-xs font-semibold bg-surface-container-low border border-outline-variant/40 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="">{t('all_plots')}</option>
                    {plots.map(p => (
                      <option key={p.id} value={p.id}>{p.district || p.id.slice(0, 8)}</option>
                    ))}
                  </select>
                )}
                <button onClick={handleClear}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-surface-container-low text-on-surface border border-outline-variant/40 hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-sm align-middle mr-1">delete</span>
                  {t('clear')}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <span className="material-symbols-outlined text-6xl text-primary mb-4">smart_toy</span>
                <h3 className="text-lg font-display font-bold text-primary mb-2">{t('chat_title')}</h3>
                <p className="text-sm text-on-surface-variant max-w-md">{t('chat_subtitle')}</p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                  {['What should I plant next?', 'How is my soil health?', 'Weather forecast for my plot', 'Best irrigation schedule'].map((suggestion) => (
                    <button key={suggestion} onClick={() => setInput(suggestion)}
                      className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/40 text-sm text-on-surface hover:bg-surface-container transition-colors text-left">
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-primary text-on-primary rounded-br-none'
                    : 'bg-surface-container-low text-on-surface rounded-bl-none'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-container-low rounded-2xl rounded-bl-none px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary animate-spin">progress</span>
                    <span className="text-sm text-on-surface-variant">{t('typing')}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-6 border-t border-outline-variant/30">
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat_input')}
                rows={1}
                className="flex-1 px-4 py-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low text-on-surface placeholder-on-surface-variant focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
              <button onClick={handleSend} disabled={loading || !input.trim()}
                className="px-5 py-3 rounded-full bg-primary text-on-primary shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined text-lg align-middle">send</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
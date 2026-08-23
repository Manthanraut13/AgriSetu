import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { sendChatMessage } from '../api/agrisetu'

export default function ChatWidget({ plotId }) {
  const { t, i18n } = useTranslation()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)
    try {
      const lang = i18n.language === 'mr' ? 'mr' : i18n.language === 'hi' ? 'hi' : 'en'
      const res = await sendChatMessage({
        message: userMsg,
        language: lang,
        plot_id: plotId || '00000000-0000-0000-0000-000000000000',
      })
      setMessages(prev => [...prev, { role: 'advisor', text: res.data.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'advisor', text: 'Sorry, I could not process your question.' }])
    } finally { setLoading(false) }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks = []
      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks, { type: 'audio/webm' })
        await sendVoice(blob)
      }
      recorder.start()
      setMediaRecorder(recorder)
      setRecording(true)
    } catch {
      setMessages(prev => [...prev, { role: 'advisor', text: t('chat.voice_denied') }])
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      setRecording(false)
      setMediaRecorder(null)
    }
  }

  const sendVoice = async (audioBlob) => {
    setMessages(prev => [...prev, { role: 'user', text: '🎤' }])
    setLoading(true)
    try {
      const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
      const formData = new FormData()
      formData.append('audio', audioBlob, 'voice.webm')
      formData.append('language', i18n.language === 'mr' ? 'mr' : i18n.language === 'hi' ? 'hi' : 'en')
      formData.append('plot_id', plotId || '')
      const res = await fetch(`${API_BASE}/api/v1/voice/ask`, { method: 'POST', body: formData })
      const data = await res.json()
      if (data.text_response) {
        setMessages(prev => [...prev, { role: 'advisor', text: data.text_response }])
      } else {
        setMessages(prev => [...prev, { role: 'advisor', text: data.detail || t('chat.could_not_process') }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'advisor', text: t('chat.unavailable') }])
    } finally { setLoading(false) }
  }

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg flex items-center justify-center z-50 hover:shadow-xl transition-shadow">
        <span className="material-symbols-outlined text-2xl">smart_toy</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-[500px] bg-surface-container-lowest rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden border border-outline-variant/30">
      <div className="p-4 bg-primary text-on-primary font-semibold flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined">smart_toy</span>
          <span>{t('chat.title')}</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-on-primary hover:opacity-70">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-low">
        {messages.length === 0 && (
          <div className="text-center mt-12">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">agriculture</span>
            <p className="text-sm text-on-surface-variant mt-2">{t('chat.placeholder')}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-primary text-on-primary rounded-br-md'
                : 'bg-surface-container-lowest text-on-surface shadow-sm border border-outline-variant/20 rounded-bl-md'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-container-lowest shadow-sm border border-outline-variant/20 rounded-2xl rounded-bl-md px-3 py-2 text-sm text-on-surface-variant">
              <span className="animate-bounce inline-block">●</span>{' '}
              <span className="animate-bounce inline-block" style={{ animationDelay: '0.1s' }}>●</span>{' '}
              <span className="animate-bounce inline-block" style={{ animationDelay: '0.2s' }}>●</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-3 border-t border-outline-variant/30 bg-surface-container-lowest flex gap-2">
        <button onClick={recording ? stopRecording : startRecording}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            recording
              ? 'bg-error text-on-error animate-pulse'
              : 'bg-tertiary-container text-on-tertiary-container hover:opacity-80'
          }`}>
          <span className="material-symbols-outlined text-lg">
            {recording ? 'stop' : 'mic'}
          </span>
        </button>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t('chat.placeholder')}
          className="flex-1 px-3 py-2 border border-outline-variant/40 rounded-full text-sm bg-surface-container-low text-on-surface placeholder-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
        <button onClick={handleSend} disabled={loading || !input.trim()}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            loading || !input.trim()
              ? 'bg-surface-container-high text-on-surface-variant'
              : 'bg-primary text-on-primary hover:opacity-90'
          }`}>
          <span className="material-symbols-outlined text-lg">send</span>
        </button>
      </div>
    </div>
  )
}

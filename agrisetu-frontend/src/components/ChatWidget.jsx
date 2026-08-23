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
        language: i18n.language || 'hi',
        plot_id: plotId || '00000000-0000-0000-0000-000000000000',
      })
      setMessages(prev => [...prev, { role: 'advisor', text: res.data.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'advisor', text: 'Sorry, I could not process your request right now.' }])
    } finally {
      setLoading(false)
    }
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
      setMessages(prev => [...prev, { role: 'advisor', text: 'Microphone access denied.' }])
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
    setMessages(prev => [...prev, { role: 'user', text: '[Voice Note Received]' }])
    setLoading(true)
    try {
      const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
      const formData = new FormData()
      formData.append('audio', audioBlob, 'voice.webm')
      formData.append('language', i18n.language || 'hi')
      formData.append('plot_id', plotId || '')
      const res = await fetch(`${API_BASE}/api/v1/voice/ask`, { method: 'POST', body: formData })
      const data = await res.json()
      if (data.text_response) {
        setMessages(prev => [...prev, { role: 'advisor', text: data.text_response }])
      } else {
        setMessages(prev => [...prev, { role: 'advisor', text: data.detail || 'Could not process voice input.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'advisor', text: 'Voice service unavailable.' }])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-50 border border-inverse-primary/30"
      >
        <span className="material-symbols-outlined text-2xl">smart_toy</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-2rem)] h-[540px] bg-surface-container-lowest rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden border border-outline-variant/40 animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="p-4 bg-primary text-on-primary flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-base">smart_toy</span>
          </div>
          <div>
            <h4 className="text-sm font-bold font-display">AgriSetu AI Advisor</h4>
            <span className="text-[10px] font-mono opacity-80 block">RAG Agronomy Engine · BRICS Knowledge Base</span>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-colors"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-low/40">
        {messages.length === 0 && (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-2xl">chat</span>
            </div>
            <p className="text-sm font-semibold text-primary mb-1">Ask AgriSetu AI</p>
            <p className="text-xs text-on-surface-variant font-mono">
              "How much nitrogen to apply for wheat?" or tap 🎤 for voice query.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-on-primary rounded-br-none shadow-sm'
                  : 'bg-surface-container-lowest text-on-surface border border-outline-variant/30 rounded-bl-none shadow-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl px-4 py-2 text-xs text-on-surface-variant flex items-center gap-1.5 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.15s]"></div>
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.3s]"></div>
              <span className="ml-1 text-[11px] font-mono">Synthesizing agronomic response...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input controls */}
      <div className="p-3 border-t border-outline-variant/30 bg-surface flex items-center gap-2">
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            recording ? 'bg-error text-on-error animate-pulse' : 'bg-tertiary-fixed text-on-tertiary-fixed hover:bg-tertiary-fixed-dim'
          }`}
          title="Voice Command"
        >
          <span className="material-symbols-outlined text-lg">{recording ? 'stop' : 'mic'}</span>
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type query or tap mic..."
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary"
        />

        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-xl bg-primary text-on-primary disabled:opacity-40 flex items-center justify-center hover:bg-primary-container transition-colors"
        >
          <span className="material-symbols-outlined text-lg">send</span>
        </button>
      </div>
    </div>
  )
}

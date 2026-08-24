import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { sendChatMessage, sendVoiceQuestion } from '../api/agrisetu'
import { autoDetectAndSwitchLanguage } from '../utils/langDetect'

function FormattedMessage({ text, isUser }) {
  if (isUser) {
    return <div className="whitespace-pre-wrap leading-relaxed">{text}</div>
  }

  if (!text) return null

  // Ensure inline bullet points get proper line breaks
  const formattedRaw = text
    .replace(/ ([•\-\*]) /g, '\n$1 ')
    .replace(/([^\n])\s*•\s*/g, '$1\n• ')
    .replace(/\n\n+/g, '\n\n')
    .trim()

  const lines = formattedRaw.split('\n')

  const parseInlineBold = (str) => {
    const parts = str.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-primary">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return part
    })
  }

  return (
    <div className="space-y-1.5 text-xs text-on-surface leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return null

        const isBullet =
          trimmed.startsWith('•') ||
          trimmed.startsWith('* ') ||
          trimmed.startsWith('- ') ||
          /^\d+[\.\)]\s+/.test(trimmed)

        if (isBullet) {
          const content = trimmed.replace(/^[•\-\*]\s*/, '').replace(/^\d+[\.\)]\s*/, '')
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5 my-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5 shadow-sm" />
              <div className="flex-1 leading-normal">{parseInlineBold(content)}</div>
            </div>
          )
        }

        if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.includes('::')) {
          return (
            <div key={idx} className="font-bold text-primary text-[13px] pt-1 pb-0.5 border-b border-primary/10">
              {trimmed.slice(2, -2)}
            </div>
          )
        }

        return (
          <p key={idx} className="leading-relaxed my-0.5">
            {parseInlineBold(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

export default function ChatWidget({ plotId }) {
  const { t, i18n } = useTranslation()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isProcessingAudio, setIsProcessingAudio] = useState(false)
  const [speechError, setSpeechError] = useState(null)
  const [speakingIdx, setSpeakingIdx] = useState(null)
  const [micPermissionDenied, setMicPermissionDenied] = useState(false)

  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const mediaStreamRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Setup Web Speech Recognition instance
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true

      const langMap = { hi: 'hi-IN', mr: 'mr-IN', en: 'en-IN' }
      recognition.lang = langMap[i18n.language] || 'hi-IN'

      recognition.onstart = () => {
        setIsListening(true)
        setSpeechError(null)
        setMicPermissionDenied(false)
      }

      recognition.onresult = (event) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript
        }
        if (transcript) {
          setInput(transcript)
          autoDetectAndSwitchLanguage(transcript)
        }
      }

      recognition.onerror = (event) => {
        console.warn('Speech recognition event error:', event.error)
        setIsListening(false)

        // Fallback to MediaRecorder if stream is active
        if (mediaStreamRef.current && event.error !== 'not-allowed') {
          startMediaRecorder(mediaStreamRef.current)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }
  }, [i18n.language])

  // Stop media stream tracks helper
  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
  }

  // Start MediaRecorder with audio stream
  const startMediaRecorder = (stream) => {
    if (!stream || !window.MediaRecorder) return

    try {
      audioChunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        setIsListening(false)
        stopMediaStream()
        if (audioChunksRef.current.length === 0) return

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' })
        audioChunksRef.current = []

        if (audioBlob.size < 1500) {
          setSpeechError(
            i18n.language === 'mr'
              ? 'आवाज खूप लहान किंवा शांत होता. कृपया मायक्रोफोनजवळ स्पष्ट बोला.'
              : i18n.language === 'hi'
              ? 'आवाज़ बहुत छोटी या शांत थी। कृपया माइक के पास साफ़ बोलें।'
              : 'Audio was too short or quiet. Please speak closer to your microphone or try typing.'
          )
          return
        }

        // Send to backend voice ask endpoint
        setIsProcessingAudio(true)
        setLoading(true)
        setSpeechError(null)

        try {
          const formData = new FormData()
          formData.append('audio', audioBlob, 'speech.webm')
          formData.append('language', i18n.language || 'hi')
          formData.append('plot_id', plotId || '00000000-0000-0000-0000-000000000000')

          const res = await sendVoiceQuestion(formData)
          const questionText = (res.data.transcribed_question || '').trim()
          const responseText = res.data.text_response

          if (!questionText) {
            setSpeechError(
              i18n.language === 'mr'
                ? 'आवाज स्पष्ट ऐकू आला नाही. कृपया मायक्रोफोनजवळ स्पष्ट बोला.'
                : i18n.language === 'hi'
                ? 'आवाज़ साफ़ सुनाई नहीं दी। कृपया माइक के पास साफ़ बोलें।'
                : 'Could not hear clear speech in audio. Please speak closer to your microphone or try typing.'
            )
            return
          }

          setMessages(prev => [
            ...prev,
            { role: 'user', text: `🎙️ "${questionText}"` },
            { role: 'advisor', text: responseText }
          ])
        } catch (err) {
          console.error('Voice process error:', err)
          const detailMsg = err.response?.data?.detail
          setSpeechError(
            detailMsg || (
              i18n.language === 'mr'
                ? 'आवाज स्पष्ट ऐकू आला नाही. कृपया मायक्रोफोनजवळ स्पष्ट बोला किंवा टाईप करा.'
                : i18n.language === 'hi'
                ? 'आवाज़ साफ़ सुनाई नहीं दी। कृपया माइक के पास साफ़ बोलें या टाइप करें।'
                : 'Could not hear clear speech in audio. Please speak closer to your microphone or try typing.'
            )
          )
        } finally {
          setIsProcessingAudio(false)
          setLoading(false)
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsListening(true)
      setSpeechError(null)
    } catch (err) {
      console.error('MediaRecorder start error:', err)
      setSpeechError('Microphone recording error. Please try typing.')
      stopMediaStream()
    }
  }

  // Request camera/mic permission explicitly & toggle recording
  const toggleListening = async () => {
    setSpeechError(null)

    // Stop current listening/recording if active
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
      setIsListening(false)
      stopMediaStream()
      return
    }

    // 1. Try Web Speech Recognition if supported
    if (recognitionRef.current) {
      try {
        const langMap = { hi: 'hi-IN', mr: 'mr-IN', en: 'en-IN' }
        recognitionRef.current.lang = langMap[i18n.language] || 'hi-IN'
        recognitionRef.current.start()
        setIsListening(true)
        return
      } catch (e) {
        console.warn('Web Speech Recognition start failed, falling back to MediaRecorder:', e)
      }
    }

    // 2. Acquire mic stream explicitly for MediaRecorder
    let stream = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      mediaStreamRef.current = stream
      setMicPermissionDenied(false)
    } catch (err) {
      console.warn('getUserMedia error:', err)
      setMicPermissionDenied(true)
      setIsListening(false)

      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setSpeechError(
          i18n.language === 'mr'
            ? 'मायक्रोफोन डिव्हाइस सापडले नाही. कृपया मायक्रोफोन किंवा हेडसेट कनेक्ट करा.'
            : i18n.language === 'hi'
            ? 'माइक्रोफ़ोन डिवाइस नहीं मिला। कृपया माइक्रोफ़ोन या हेडसेट कनेक्ट करें।'
            : 'No microphone device found. Please connect a microphone or headset.'
        )
      } else {
        setSpeechError(
          i18n.language === 'mr'
            ? 'मायक्रोफोन ब्लॉक केला आहे. कृपया Windows Settings -> Privacy -> Microphone मध्ये App Access चालू करा.'
            : i18n.language === 'hi'
            ? 'माइक्रोफ़ोन ब्लॉक है। कृपया Windows Settings -> Privacy & Security -> Microphone में "Allow apps to access your microphone" चालू करें।'
            : 'Microphone blocked. If browser site permission is Allow, check Windows Settings → Privacy & Security → Microphone → Turn ON "Allow apps to access microphone".'
        )
      }
      return
    }

    // 3. We have a working microphone stream! Start recording directly
    startMediaRecorder(stream)
  }

  const handleSend = async (customText = null) => {
    const textToSend = (customText || input).trim()
    if (!textToSend || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: textToSend }])
    setLoading(true)
    setSpeechError(null)

    try {
      const lang = i18n.language === 'mr' ? 'mr' : i18n.language === 'hi' ? 'hi' : 'en'
      const res = await sendChatMessage({
        message: textToSend,
        language: i18n.language || 'hi',
        plot_id: plotId || '00000000-0000-0000-0000-000000000000',
      })
      const responseText = res.data.response
      setMessages(prev => [...prev, { role: 'advisor', text: responseText }])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'advisor',
          text:
            i18n.language === 'mr'
              ? 'क्षमस्व, आत्ता सल्ला मिळवण्यात अडचण येत आहे. कृपया पुन्हा प्रयत्न करा.'
              : i18n.language === 'hi'
              ? 'क्षमा करें, इस समय सलाह उपलब्ध कराने में समस्या आ रही है। कृपया पुनः प्रयास करें।'
              : 'Sorry, I could not process your request right now. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Text-To-Speech: Speak out AI response
  const speakMessage = (text, index) => {
    if (!('speechSynthesis' in window)) return

    if (speakingIdx === index) {
      window.speechSynthesis.cancel()
      setSpeakingIdx(null)
      return
    }

    window.speechSynthesis.cancel()
    const cleanText = text.replace(/[*#•-]/g, '').trim()
    const utterance = new SpeechSynthesisUtterance(cleanText)
    const langMap = { hi: 'hi-IN', mr: 'mr-IN', en: 'en-IN' }
    utterance.lang = langMap[i18n.language] || 'hi-IN'
    utterance.rate = 0.95

    utterance.onend = () => setSpeakingIdx(null)
    utterance.onerror = () => setSpeakingIdx(null)

    setSpeakingIdx(index)
    window.speechSynthesis.speak(utterance)
  }

  const handleDemoVoiceQuery = () => {
    setSpeechError(null)
    const demoQueries = {
      hi: 'गेहूं की फसल में कौन सा खाद और कितनी मात्रा में डालें?',
      mr: 'गव्हाच्या पिकासाठी कोणते खत आणि किती प्रमाणात द्यावे?',
      en: 'How much nitrogen and fertilizer should I apply for wheat crop?'
    }
    const sampleText = demoQueries[i18n.language] || demoQueries.en
    handleSend(`🎙️ ${sampleText}`)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-50 border border-inverse-primary/30"
        title="Open AgriSetu AI Assistant"
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
            <h4 className="text-sm font-bold font-display">{t('chat_title') || 'AgriSetu AI Advisor'}</h4>
            <span className="text-[10px] font-mono opacity-80 block">
              {i18n.language === 'mr' ? 'व्हॉइस व एआय शेती सल्लागार' : i18n.language === 'hi' ? 'वॉइस व एआई कृषि सलाहकार' : 'Multilingual AI Voice Advisor'}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            window.speechSynthesis?.cancel()
            stopMediaStream()
            setIsOpen(false)
          }}
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-colors"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-low">
        {messages.length === 0 && (
          <div className="text-center py-8 px-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-2xl">mic</span>
            </div>
            <p className="text-sm font-semibold text-primary mb-1">
              {i18n.language === 'mr' ? 'मायक्रोफोनवर बोला किंवा टाईप करा' : i18n.language === 'hi' ? 'माइक पर बोलें या टाइप करें' : 'Speak into mic or type your question'}
            </p>
            <p className="text-xs text-on-surface-variant font-mono">
              {i18n.language === 'mr'
                ? '"गव्हाला कोणते खत द्यावे?" किंवा "मातीतील ओलावा कसा वाढवावा?"'
                : i18n.language === 'hi'
                ? '"गेहूं के लिए कौन सा खाद डालें?" या "फसल सुरक्षा कैसे करें?"'
                : '"How much nitrogen to apply for wheat?"'}
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[88%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-on-primary rounded-br-none shadow-sm'
                  : 'bg-surface-container-lowest text-on-surface border border-outline-variant/30 rounded-bl-none shadow-sm'
              }`}
            >
              <FormattedMessage text={msg.text} isUser={msg.role === 'user'} />
            </div>

            {/* Read Aloud Voice Button for Advisor Replies */}
            {msg.role === 'advisor' && (
              <button
                onClick={() => speakMessage(msg.text, i)}
                className={`mt-1 flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                  speakingIdx === i
                    ? 'bg-primary text-on-primary font-bold'
                    : 'text-primary hover:bg-primary/10'
                }`}
              >
                <span className="material-symbols-outlined text-xs">
                  {speakingIdx === i ? 'volume_up' : 'volume_mute'}
                </span>
                <span>
                  {speakingIdx === i
                    ? (i18n.language === 'mr' ? 'थांबवा' : i18n.language === 'hi' ? 'रोकें' : 'Stop')
                    : (i18n.language === 'mr' ? 'ऐका' : i18n.language === 'hi' ? 'सुनें' : 'Listen')}
                </span>
              </button>
            )}
          </div>
        ))}

        {loading && !isProcessingAudio && (
          <div className="flex justify-start">
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl px-4 py-2 text-xs text-on-surface-variant flex items-center gap-1.5 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.15s]"></div>
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.3s]"></div>
              <span className="ml-1 text-[11px] font-mono">{t('typing') || 'Analyzing farm data...'}</span>
            </div>
          </div>
        )}

        {isProcessingAudio && (
          <div className="flex justify-center">
            <div className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-pulse font-mono">
              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
              <span>
                {i18n.language === 'mr' ? 'आवाज विश्लेषित करत आहे...' : i18n.language === 'hi' ? 'आवाज़ का विश्लेषण हो रहा है...' : 'Transcribing voice audio...'}
              </span>
            </div>
          </div>
        )}

        {isListening && (
          <div className="flex justify-center">
            <div className="bg-primary-container text-on-primary px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 animate-pulse shadow">
              <span className="w-2.5 h-2.5 bg-error rounded-full animate-ping" />
              <span>
                {i18n.language === 'mr' ? 'ऐकत आहे... बोला 🎙️ (थांबवण्यासाठी मायक्रोफोन दाबा)' : i18n.language === 'hi' ? 'सुन रहा हूँ... बोलिए 🎙️ (रोकने के लिए माइक दबाएं)' : 'Listening... speak now 🎙️ (tap mic to stop & send)'}
              </span>
            </div>
          </div>
        )}

        {speechError && (
          <div className={`p-3 rounded-2xl text-[11px] font-mono leading-relaxed border ${
            micPermissionDenied
              ? 'bg-warning-container/40 text-on-warning-container border-warning/40'
              : 'bg-error-container text-on-error-container border-error/30'
          }`}>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base shrink-0">
                {micPermissionDenied ? 'mic_off' : 'warning'}
              </span>
              <div className="flex-1">
                <p>{speechError}</p>
                <div className="mt-2.5 pt-2 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-sans opacity-90">
                    💡 {i18n.language === 'mr' ? 'मायक्रोफोन नाही? व्हॉइस टेस्ट करा:' : i18n.language === 'hi' ? 'माइक्रोफ़ोन नहीं है? वॉइस टेस्ट करें:' : 'No hardware mic? Run instant voice test:'}
                  </span>
                  <button
                    type="button"
                    onClick={handleDemoVoiceQuery}
                    className="px-2.5 py-1 rounded-lg bg-primary text-on-primary text-[11px] font-sans font-medium hover:bg-primary-container transition-colors shadow-sm flex items-center gap-1 shrink-0"
                  >
                    <span className="material-symbols-outlined text-xs">volume_up</span>
                    <span>{i18n.language === 'mr' ? 'व्हॉइस टेस्ट प्रश्न' : i18n.language === 'hi' ? 'वॉइस टेस्ट प्रश्न' : 'Test Voice Query'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input controls */}
      <div className="p-3 border-t border-outline-variant/30 bg-surface flex items-center gap-2">
        <button
          type="button"
          onClick={toggleListening}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            isListening
              ? 'bg-error text-on-error shadow-md animate-pulse ring-2 ring-error/50'
              : 'bg-tertiary-fixed text-on-tertiary-fixed hover:bg-tertiary-fixed-dim shadow-sm'
          }`}
          title={isListening ? 'Stop & Send Recording' : 'Start Voice Input'}
        >
          <span className="material-symbols-outlined text-lg">{isListening ? 'mic_off' : 'mic'}</span>
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setSpeechError(null)
            autoDetectAndSwitchLanguage(e.target.value)
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t('chat_input') || 'Ask any question or tap mic...'}
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary"
        />

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-xl bg-primary text-on-primary disabled:opacity-40 flex items-center justify-center hover:bg-primary-container transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">send</span>
        </button>
      </div>
    </div>
  )
}

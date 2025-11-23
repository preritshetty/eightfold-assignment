"use client"

import { useRef, useState, useCallback } from "react"

export function useVoice() {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState("")
  const recognitionRef = useRef<any>(null)
  const synthesisRef = useRef<SpeechSynthesis | null>(null)

  const initialize = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition && !recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
    }
    if (!synthesisRef.current) {
      synthesisRef.current = window.speechSynthesis
    }
  }, [])

  const startListening = useCallback(() => {
    initialize()
    if (recognitionRef.current) {
      setTranscript("")
      setIsListening(true)
      recognitionRef.current.start()
    }
  }, [initialize])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [])

  const speak = useCallback(
    (text: string) => {
      initialize()
      if (synthesisRef.current) {
        synthesisRef.current.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        synthesisRef.current.speak(utterance)
        setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
      }
    },
    [initialize],
  )

  return {
    isListening,
    isSpeaking,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    speak,
  }
}

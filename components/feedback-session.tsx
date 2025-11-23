"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, Send, Loader } from "lucide-react"
import { generateInterviewSummary, generateFeedbackResponse } from "@/lib/interview-engine"

interface FeedbackSessionProps {
  state: any
  onComplete: () => void
}

export function FeedbackSession({ state, onComplete }: FeedbackSessionProps) {
  const [overallScore, setOverallScore] = useState(0)
  const [summary, setSummary] = useState({
    strengths: [],
    gaps: [],
    recommendations: [],
  })
  const [conversationMessages, setConversationMessages] = useState<Array<{ role: string; content: string }>>([])
  const [userInput, setUserInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const recognitionRef = useRef<any>(null)
  const synthesisRef = useRef<SpeechSynthesis | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadInterviewSummary()
  }, [])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversationMessages])

  // Initialize speech APIs
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true
      recognitionRef.current.language = "en-US"

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptSegment = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            setUserInput((prev) => prev + transcriptSegment + " ")
          } else {
            interimTranscript += transcriptSegment
          }
        }
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    synthesisRef.current = window.speechSynthesis
  }, [])

  const loadInterviewSummary = async () => {
    try {
      const context = {
        role: state.role || "Software Engineer",
        level: state.level || "Mid",
        cvSummary: state.uploads?.cv?.content,
        jdSummary: state.uploads?.jd?.content,
        previousResponses: state.responses || [],
        scores: state.recentScores || [],
      }

      const result = await generateInterviewSummary(context)
      setOverallScore(result.overallScore)
      setSummary({
        strengths: result.strengths,
        gaps: result.gaps,
        recommendations: result.recommendations,
      })

      // Add initial feedback message
      const initialMessage = `Great job on your interview! You scored ${result.overallScore.toFixed(1)}/10. I noticed some strong points and areas for growth. Feel free to ask me about any of the feedback or anything else about your interview performance.`

      setConversationMessages([
        {
          role: "assistant",
          content: initialMessage,
        },
      ])

      // Speak the initial message
      speakMessage(initialMessage)
    } catch (error) {
      console.error("[v0] Error loading summary:", error)
      setOverallScore(7.5)
      setSummary({
        strengths: ["Good communication"],
        gaps: ["Continue practicing"],
        recommendations: ["Review fundamentals"],
      })
    } finally {
      setIsLoadingSummary(false)
    }
  }

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const speakMessage = (message: string) => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel()
      const utterance = new SpeechSynthesisUtterance(message)
      utterance.rate = 1
      synthesisRef.current.speak(utterance)
      setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
    }
  }

  const handleSendMessage = async () => {
    if (!userInput.trim()) return

    stopListening()
    if (synthesisRef.current) synthesisRef.current.cancel()

    // Add user message
    const newMessages = [...conversationMessages, { role: "user", content: userInput }]
    setConversationMessages(newMessages)
    setUserInput("")
    setIsLoading(true)

    try {
      const context = {
        role: state.role || "Software Engineer",
        level: state.level || "Mid",
        cvSummary: state.uploads?.cv?.content,
        jdSummary: state.uploads?.jd?.content,
        previousResponses: state.responses || [],
        scores: state.recentScores || [],
      }

      // Generate AI feedback response
      const aiResponse = await generateFeedbackResponse(userInput, context)

      const updatedMessages = [...newMessages, { role: "assistant", content: aiResponse }]
      setConversationMessages(updatedMessages)

      // Speak the response
      speakMessage(aiResponse)
    } catch (error) {
      console.error("[v0] Error generating response:", error)
      const fallbackResponse = "That's a great question. Keep practicing and you'll improve!"
      setConversationMessages([...newMessages, { role: "assistant", content: fallbackResponse }])
      speakMessage(fallbackResponse)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur p-8">
          <div className="flex items-center gap-3">
            <Loader className="w-5 h-5 animate-spin text-blue-400" />
            <p className="text-slate-300">Generating feedback...</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col px-4 py-8">
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
        {/* Header with Score */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Interview Feedback</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur p-6 text-center">
              <p className="text-slate-400 text-sm mb-2">Overall Score</p>
              <p className="text-5xl font-bold text-white">{overallScore.toFixed(1)}</p>
              <p className="text-slate-500 text-xs mt-2">/10</p>
            </Card>
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur p-6">
              <p className="text-slate-400 text-sm mb-3 font-semibold">Top Strengths</p>
              <ul className="space-y-1">
                {summary.strengths.slice(0, 2).map((strength, idx) => (
                  <li key={idx} className="text-sm text-green-400">
                    ✓ {strength}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur p-6">
              <p className="text-slate-400 text-sm mb-3 font-semibold">Areas to Grow</p>
              <ul className="space-y-1">
                {summary.gaps.slice(0, 2).map((gap, idx) => (
                  <li key={idx} className="text-sm text-yellow-400">
                    • {gap}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* Conversation Area */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur flex-1 flex flex-col mb-4 max-h-96">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {conversationMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {isSpeaking && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-200 px-4 py-3 rounded-lg">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* Input Area */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur p-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={isListening ? "Listening..." : "Ask about your feedback..."}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
                disabled={isLoading || isSpeaking}
              />
              <Button
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading || isSpeaking}
                variant="outline"
                size="icon"
                className="border-slate-700 text-slate-400 hover:bg-slate-800 bg-transparent"
              >
                <Mic className={`w-4 h-4 ${isListening ? "text-red-400" : ""}`} />
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!userInput.trim() || isLoading || isSpeaking}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {["Tell me more about my gaps", "How do I improve quickly?", "What should I study first?"].map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setUserInput(suggestion)
                    }}
                    className="text-xs px-3 py-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600"
                  >
                    {suggestion}
                  </button>
                ),
              )}
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            onClick={() => onComplete()}
            size="lg"
            className="flex-1 bg-white text-black hover:bg-slate-100 font-semibold"
          >
            View Detailed Report
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="lg"
            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Start New Interview
          </Button>
        </div>
      </div>
    </div>
  )
}

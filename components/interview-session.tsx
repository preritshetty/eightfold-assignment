"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, Volume2, Loader, PhoneOff } from "lucide-react"
import { useRealtimeInterview } from "@/hooks/use-realtime-interview"
import type { InterviewResult } from "@/lib/interview-engine"

interface InterviewSessionProps {
  state: any
  onComplete: (scores: number[], result: InterviewResult | null) => void
}

export function InterviewSession({ state, onComplete }: InterviewSessionProps) {
  const [isActive, setIsActive] = useState(false)
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [scores, setScores] = useState<number[]>([])
  const audioOutputRef = useRef<HTMLAudioElement>(null)

  const {
    isConnected,
    isListening,
    isSpeaking,
    transcript,
    aiMessage,
    error,
    startInterview,
    stopInterview,
    setOnScoreUpdate,
    finalizeInterview,
  } = useRealtimeInterview(state)

  // Track score updates from the AI agent
  useEffect(() => {
    setOnScoreUpdate((score: number, question: number) => {
      setScores((prev) => [...prev, score])
      setQuestionsAsked(question)

      // End interview after 15 questions
      if (question >= 15) {
        handleEndInterview([...scores, score])
      }
    })
  }, [scores, setOnScoreUpdate])

  const handleStartInterview = async () => {
    setIsActive(true)
    await startInterview()
  }

  const handleEndInterview = async (finalScores: number[]) => {
    setIsActive(false)
    stopInterview()
    
    // Finalize interview and compute comprehensive scores
    const result = await finalizeInterview()
    onComplete(finalScores, result)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8">
      <Card className="w-full max-w-2xl border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">{isActive ? "Live Interview" : "Interview Session"}</h2>
            <div className="flex items-center justify-between">
              <p className="text-slate-400">{isActive ? `Question ${questionsAsked + 1} of 8` : "Ready to start?"}</p>
              {isActive && (
                <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${((questionsAsked + 1) / 8) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Connection Status */}
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* AI Agent Message */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
            <p className="text-slate-400 text-sm font-semibold mb-2 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <span className="flex items-center gap-2">
                AI Interviewer
                {isSpeaking && <span className="animate-pulse text-blue-400 text-xs">Speaking...</span>}
              </span>
            </p>
            <p className="text-white text-lg leading-relaxed min-h-16">
              {aiMessage || (isActive ? "Connecting to interview agent..." : "Click 'Start Interview' to begin")}
            </p>
          </div>

          {/* User Transcript - Real-time Display */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8 min-h-24">
            <p className="text-slate-400 text-sm font-semibold mb-2 flex items-center gap-2">
              <Mic className="w-4 h-4" />
              <span className="flex items-center gap-2">
                {isListening ? "Listening..." : "Your Response"}
                {isListening && <span className="animate-pulse text-blue-400 text-xs">Recording...</span>}
              </span>
            </p>
            <p className="text-slate-300 min-h-12 flex items-center">
              {transcript || (isActive && isListening ? "Speak now..." : "Your speech will appear here")}
            </p>
          </div>

          {/* Recent Scores */}
          {scores.length > 0 && (
            <div className="mb-6 p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
              <p className="text-xs font-semibold text-slate-400 mb-2">Recent Scores</p>
              <div className="flex gap-2">
                {scores.slice(-3).map((score, idx) => (
                  <div
                    key={idx}
                    className="flex-1 text-center py-2 rounded bg-slate-700/50 text-sm font-semibold text-white"
                  >
                    {score}/10
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3 flex-col sm:flex-row">
            {!isActive ? (
              <Button
                onClick={handleStartInterview}
                disabled={isConnected === false}
                size="lg"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Mic className="w-4 h-4 mr-2" />
                Start Interview
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => handleEndInterview(scores)}
                  size="lg"
                  variant="outline"
                  className="flex-1 border-red-700 text-red-400 hover:bg-red-900/20"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  End Interview
                </Button>
                <div className="flex-1 flex items-center justify-center gap-2 text-sm text-slate-400">
                  {isListening && <Loader className="w-4 h-4 animate-spin text-blue-400" />}
                  {isSpeaking && <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
                  {isConnected && <div className="w-2 h-2 rounded-full bg-green-400" />}
                </div>
              </>
            )}
          </div>

          {/* Status Text */}
          <p className="text-xs text-slate-500 text-center mt-4">
            {isActive
              ? "Real-time conversation with AI interviewer • Your responses are analyzed instantly"
              : "Your responses will be evaluated in real-time"}
          </p>

          {/* Hidden audio element for AI speech output */}
          <audio ref={audioOutputRef} className="hidden" />
        </div>
      </Card>
    </div>
  )
}

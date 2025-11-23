"use client"

import { useState } from "react"
import { LandingScreen } from "@/components/landing-screen"
import { RoleSelection } from "@/components/role-selection"
import { InterviewSession } from "@/components/interview-session"
import { FeedbackSession } from "@/components/feedback-session"
import { Dashboard } from "@/components/dashboard"
import type { InterviewResult } from "@/lib/interview-engine"

export default function Home() {
  const [phase, setPhase] = useState<"setup" | "role" | "interviewing" | "feedback" | "dashboard">("setup")
  const [state, setState] = useState<any>({
    uploads: {
      cv: null,
      jd: null,
      matchAnalysis: null,
    },
    role: null,
    level: null,
    messages: [],
    questionsAsked: 0,
    recentScores: [],
  })
  const [interviewResult, setInterviewResult] = useState<InterviewResult | null>(null)

  const handleContinue = (cvData, jdData) => {
    setState((prev) => ({
      ...prev,
      uploads: {
        cv: cvData,
        jd: jdData,
        matchAnalysis: cvData && jdData ? analyzeMatch(cvData, jdData) : null,
      },
    }))
    setPhase("role")
  }

  const handleRoleSelect = (role, level) => {
    setState((prev) => ({
      ...prev,
      role,
      level,
    }))
    setPhase("interviewing")
  }

  const handleInterviewComplete = (finalScores: number[], result: InterviewResult | null) => {
    setState((prev) => ({
      ...prev,
      recentScores: finalScores,
    }))
    setInterviewResult(result)
    setPhase("feedback")
  }

  const handleFeedbackComplete = () => {
    setPhase("dashboard")
  }

  const analyzeMatch = (cv, jd) => {
    return {
      matchPercentage: 75,
      gaps: ["Kafka knowledge", "Large scale experience"],
      strengths: ["System design", "Python expertise"],
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {phase === "setup" && <LandingScreen onContinue={handleContinue} />}
      {phase === "role" && <RoleSelection onSelect={handleRoleSelect} />}
      {phase === "interviewing" && <InterviewSession state={state} onComplete={handleInterviewComplete} />}
      {phase === "feedback" && <FeedbackSession state={state} interviewResult={interviewResult} onComplete={handleFeedbackComplete} />}
      {phase === "dashboard" && <Dashboard state={state} interviewResult={interviewResult} />}
    </div>
  )
}

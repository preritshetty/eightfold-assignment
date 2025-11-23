"use client"

import { useState, useCallback, useRef, useEffect } from "react"

interface RealTimeInterviewState {
  isConnected: boolean
  isListening: boolean
  isSpeaking: boolean
  transcript: string
  aiMessage: string
  error: string | null
}

export function useRealtimeInterview(state: any) {
  const [interviewState, setInterviewState] = useState<RealTimeInterviewState>({
    isConnected: true,
    isListening: false,
    isSpeaking: false,
    transcript: "",
    aiMessage: "",
    error: null,
  })

  const recognitionRef = useRef<any>(null)
  const synthesisRef = useRef<SpeechSynthesis | null>(null)
  const conversationRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([])
  const questionsAskedRef = useRef(0)
  const scoresRef = useRef<number[]>([])
  const scoreCallbackRef = useRef<((score: number, question: number) => void) | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isProcessingRef = useRef(false)
  const currentTranscriptRef = useRef<string>("")
  const shouldBeListeningRef = useRef(false)
  const isRecognitionActiveRef = useRef(false)

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.language = "en-US"
    }
    synthesisRef.current = window.speechSynthesis

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }
  }, [])

  const callInterviewAPI = useCallback(async (systemPrompt: string, prompt: string, maxTokens = 400) => {
    try {
      const response = await fetch("/api/interview/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, prompt, maxTokens }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "API request failed")
      }

      const { text } = await response.json()
      return text
    } catch (error) {
      console.error("[v0] API call error:", error)
      throw error
    }
  }, [])

  const handleUserResponse = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isProcessingRef.current) return

      isProcessingRef.current = true
      setInterviewState((prev) => ({ ...prev, transcript: "", isListening: false }))

      try {
        // Add user message to conversation
        conversationRef.current.push({
          role: "user",
          content: userText,
        })

        // Generate AI response and score via API
        const systemPrompt = buildInterviewSystemPrompt(state)

        // Build conversation context for better flow
        const recentConversation = conversationRef.current.slice(-4).map(msg => 
          `${msg.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${msg.content}`
        ).join('\n\n')

        const prompt = `
CONVERSATION SO FAR:
${recentConversation}

Candidate just said: "${userText}"

As an experienced interviewer having a NATURAL CONVERSATION:
1. React authentically to what they just said (acknowledge good points, probe weak areas)
2. Score this specific response (1-10) based on depth, clarity, and relevance
3. Either:
   - Ask a relevant follow-up to dig deeper on what they mentioned
   - Move to a new topic if their answer was complete
   - Challenge them gently if answer was superficial

Be conversational, not robotic. Reference what they actually said. Make it feel like a real discussion.

Question ${questionsAskedRef.current + 1} of ~8-10 total.

Format as JSON:
{
  "score": 7,
  "feedback": "I like how you mentioned X. That shows...",
  "question": "Building on that, tell me more about...",
  "thinking": "They showed strength in X but avoided Y"
}
`

        const text = await callInterviewAPI(systemPrompt, prompt, 400)
        const parsed = JSON.parse(text)

        // Update conversation and scores
        scoresRef.current.push(parsed.score)
        questionsAskedRef.current++

        conversationRef.current.push({
          role: "assistant",
          content: parsed.question,
        })

        // Trigger callback to parent component
        if (scoreCallbackRef.current) {
          scoreCallbackRef.current(parsed.score, questionsAskedRef.current)
        }

        // Speak the next question
        if (synthesisRef.current) {
          synthesisRef.current.cancel()
          const utterance = new SpeechSynthesisUtterance(parsed.question)
          utterance.rate = 0.95
          utterance.pitch = 1
          utterance.volume = 1

          setInterviewState((prev) => ({
            ...prev,
            isSpeaking: true,
            aiMessage: parsed.question,
          }))

          synthesisRef.current.speak(utterance)
          utterance.onend = () => {
            setInterviewState((prev) => ({ ...prev, isSpeaking: false }))
            startListening()
            isProcessingRef.current = false
          }
        }
      } catch (error) {
        console.error("[v0] Error in realtime interview:", error)
        setInterviewState((prev) => ({
          ...prev,
          error: `Error: ${error instanceof Error ? error.message : "Processing response"}. Please try again.`,
        }))
        isProcessingRef.current = false
      }
    },
    [state, callInterviewAPI],
  )

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    
    shouldBeListeningRef.current = true
    
    // Only stop if it's actually running
    if (isRecognitionActiveRef.current) {
      try {
        recognitionRef.current.stop()
        isRecognitionActiveRef.current = false
      } catch (e) {
        // Ignore if not running
      }
      
      // Wait a bit before starting again
      setTimeout(() => {
        if (shouldBeListeningRef.current) {
          startListeningInternal()
        }
      }, 100)
    } else {
      startListeningInternal()
    }
  }, [])
  
  const startListeningInternal = () => {
    if (!recognitionRef.current || !shouldBeListeningRef.current) return
    
    // Reset transcript ref
    currentTranscriptRef.current = ""
    setInterviewState((prev) => ({ ...prev, transcript: "", isListening: true }))

    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcriptSegment + " "
        } else {
          interimTranscript += transcriptSegment
        }
      }

      if (finalTranscript) {
        // Accumulate in ref to avoid repetition
        currentTranscriptRef.current += finalTranscript
        
        setInterviewState((prev) => ({
          ...prev,
          transcript: currentTranscriptRef.current,
        }))

        // Clear previous timer and set new one
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = setTimeout(() => {
          // Auto-submit after 4 seconds of silence (increased to prevent interruption)
          const fullText = currentTranscriptRef.current.trim()
          if (fullText) {
            shouldBeListeningRef.current = false // Stop listening before processing
            handleUserResponse(fullText)
            currentTranscriptRef.current = "" // Reset for next response
          }
        }, 4000) // Increased from 2000 to 4000ms
      } else if (interimTranscript) {
        // Show interim results
        setInterviewState((prev) => ({
          ...prev,
          transcript: currentTranscriptRef.current + interimTranscript,
        }))
      }
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error("[v0] Speech recognition error:", event.error)
      isRecognitionActiveRef.current = false
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setInterviewState((prev) => ({
          ...prev,
          error: `Speech recognition error: ${event.error}`,
          isListening: false,
        }))
      }
    }

    recognitionRef.current.onstart = () => {
      isRecognitionActiveRef.current = true
    }

    recognitionRef.current.onend = () => {
      isRecognitionActiveRef.current = false
      // Only restart if we should still be listening and not processing
      if (shouldBeListeningRef.current && !isProcessingRef.current) {
        setTimeout(() => {
          if (shouldBeListeningRef.current && !isProcessingRef.current) {
            startListeningInternal()
          }
        }, 100)
      } else {
        setInterviewState((prev) => ({ ...prev, isListening: false }))
      }
    }

    try {
      recognitionRef.current.start()
    } catch (error) {
      console.error("[v0] Failed to start recognition:", error)
      isRecognitionActiveRef.current = false
    }
  }

  const stopListening = useCallback(() => {
    shouldBeListeningRef.current = false
    if (recognitionRef.current && isRecognitionActiveRef.current) {
      try {
        recognitionRef.current.stop()
        isRecognitionActiveRef.current = false
      } catch (e) {
        // Ignore if already stopped
      }
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }
    setInterviewState((prev) => ({ ...prev, isListening: false }))
  }, [])

  const startInterview = useCallback(async () => {
    questionsAskedRef.current = 0
    scoresRef.current = []
    conversationRef.current = []
    isProcessingRef.current = false

    // Ask first question via API
    const systemPrompt = buildInterviewSystemPrompt(state)
    const hasResume = state.uploads?.cv?.content && state.uploads.cv.content.trim().length > 50
    const hasJD = state.uploads?.jd?.content && state.uploads.jd.content.trim().length > 50
    
    const exampleWithResume = 'Hi! I noticed on your resume you worked on [actual specific project from resume] - that sounds interesting. What was the biggest challenge there?'
    const exampleWithoutResume = 'Hi! Thanks for taking the time to chat today. To start, I would love to hear about a recent project you are proud of - what did you build and what technologies did you use?'
    
    const firstPrompt = `
You're beginning a CONVERSATIONAL interview for a ${state.level}-level ${state.role} position.

${hasResume ? `The candidate has provided their resume with background in: ${state.uploads.cv.content.substring(0, 200)}...` : 'NO RESUME PROVIDED - Do NOT reference specific companies, projects, or details.'}
${hasJD ? `Target role requires: ${state.uploads.jd.content.substring(0, 200)}...` : ''}

Start with a warm, engaging opening question that:
- Puts them at ease
- Gets them talking about their experience naturally
- Sets up for deeper technical questions later
${hasResume ? '- References something specific from their actual resume' : '- Asks open-ended questions about their general experience (DO NOT invent resume details)'}

Be conversational, like a real person. Avoid generic "Tell me about yourself".

${hasResume ? `Example: "${exampleWithResume}"` : `Example: "${exampleWithoutResume}"`}

Format as JSON:
{
  "question": "Your opening question here",
  "thinking": "Brief explanation of your approach"
}
`

    try {
      const text = await callInterviewAPI(systemPrompt, firstPrompt, 300)
      const parsed = JSON.parse(text)
      questionsAskedRef.current = 1

      setInterviewState((prev) => ({
        ...prev,
        aiMessage: parsed.question,
        isSpeaking: true,
      }))

      // Speak the first question
      if (synthesisRef.current) {
        synthesisRef.current.cancel()
        const utterance = new SpeechSynthesisUtterance(parsed.question)
        utterance.rate = 0.95
        utterance.pitch = 1
        utterance.volume = 1

        synthesisRef.current.speak(utterance)
        utterance.onend = () => {
          setInterviewState((prev) => ({ ...prev, isSpeaking: false }))
          startListening()
        }
      }

      conversationRef.current.push({
        role: "assistant",
        content: parsed.question,
      })
    } catch (error) {
      console.error("[v0] Error starting interview:", error)
      setInterviewState((prev) => ({
        ...prev,
        error: `Failed to start interview: ${error instanceof Error ? error.message : "Unknown error"}. Please refresh and try again.`,
      }))
    }
  }, [state, callInterviewAPI, startListening])

  const stopInterview = useCallback(() => {
    stopListening()
    if (synthesisRef.current) {
      synthesisRef.current.cancel()
    }
  }, [stopListening])

  const setOnScoreUpdate = useCallback((callback: (score: number, question: number) => void) => {
    scoreCallbackRef.current = callback
  }, [])

  const finalizeInterview = useCallback(async () => {
    try {
      // Import computeScore dynamically to avoid circular dependencies
      const { computeScore } = await import("@/lib/interview-engine")
      
      // Build transcript from conversation
      const transcript = conversationRef.current
        .map(msg => `${msg.role === 'user' ? 'Candidate' : 'Interviewer'}: ${msg.content}`)
        .join('\n\n')

      const result = await computeScore({
        conversationTranscript: transcript,
        resumeText: state.uploads?.cv?.content,
        questionMeta: [], // TODO: Track question metadata
        role: state.role || "Software Engineer",
        experienceLevel: state.level || "Mid",
      })

      return result
    } catch (error) {
      console.error("Failed to finalize interview:", error)
      return null
    }
  }, [state])

  return {
    isConnected: interviewState.isConnected,
    isListening: interviewState.isListening,
    isSpeaking: interviewState.isSpeaking,
    transcript: interviewState.transcript,
    aiMessage: interviewState.aiMessage,
    error: interviewState.error,
    startInterview,
    stopInterview,
    setOnScoreUpdate,
    finalizeInterview,
  }
}

function buildInterviewSystemPrompt(state: any): string {
  const hasResume = state.uploads?.cv?.content && state.uploads.cv.content.trim().length > 50
  const hasJD = state.uploads?.jd?.content && state.uploads.jd.content.trim().length > 50

  const prompt = `You are a REAL senior engineer/hiring manager conducting a NATURAL, CONVERSATIONAL interview for a ${state.level}-level ${state.role} position. This is NOT a scripted Q&A - it's a flowing discussion.

YOUR PERSONALITY:
- You're experienced, friendly, and genuinely curious
- You listen carefully and react to what they say
- You probe deeper on interesting points
- You challenge gently when answers are vague
- You make connections between different topics
- You think out loud sometimes ("Interesting, that reminds me of...")

CONVERSATIONAL STYLE:
✅ "That's interesting - so when you ran into that scaling issue, how did your team react?"
✅ "Hmm, I'm curious about the tradeoffs you considered there..."
✅ "Right, that makes sense. Let me push back on that a bit though..."
❌ "Tell me about a time when..." (too scripted)
❌ "Question 3: Describe your experience with..." (robotic)

ADAPTIVE INTERVIEWING:
- If they give shallow answers → dig deeper, ask for specifics
- If they mention something interesting → explore it further
- If they struggle → provide hints, ask simpler questions
- If they excel → increase difficulty, challenge assumptions
- Build on previous answers naturally

${
  hasResume
    ? `\nCANDIDATE BACKGROUND:\n${state.uploads.cv.content.substring(0, 500)}\n\n✅ REFERENCE THIS NATURALLY - mention their specific projects, companies, or skills when relevant.\n❌ DO NOT invent or hallucinate details not in this resume.`
    : `\n⚠️ NO RESUME PROVIDED\n❌ DO NOT reference specific companies, projects, or volunteer work\n❌ DO NOT say things like "I saw on your resume..." or "I noticed you worked at..."\n✅ Instead, ask open-ended questions like "Tell me about your experience with [skill]" or "Walk me through a recent project you worked on"`
}

${
  hasJD
    ? `\nTARGET ROLE:\n${state.uploads.jd.content.substring(0, 500)}\n\nPROBE FOR THESE SKILLS but do it conversationally, not as a checklist.`
    : ""
}

INTERVIEW FLOW:
~8-10 questions total, but LET THE CONVERSATION BREATHE
- Start warm, build rapport
- Progress naturally through topics
- Circle back if they mention something worth exploring
- Don't rigidly move through a script - follow interesting threads

Remember: You're having a CONVERSATION, not interrogating. Be human.`

  return prompt
}

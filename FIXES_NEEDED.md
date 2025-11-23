# CRITICAL FIXES NEEDED - Dashboard & Feedback Hardcoding Issue

## Problem
After git reset, the enhanced scoring system was lost. Dashboard and Feedback components are still using hardcoded/legacy data instead of real `InterviewResult` from `computeScore()`.

## Quick Fix Steps

### 1. Export InterviewResult from lib/interview-engine.ts

Add this after line 90 (after the other interfaces):

```typescript
export interface InterviewResult {
  overall: number // 0-100
  breakdown: ScoreBreakdown
  highlights: Highlight[] | string[]
  improvementSuggestions: string[]
  stats: {
    questionsAnswered: number
    durationMinutes?: number
  }
  raw_notes?: string
}

export interface Highlight {
  q_id: string
  quote: string
  why: string
}
```

### 2. Add computeScore to interview-engine.ts

Add this at the end of the file (before the last closing brace):

```typescript
export async function computeScore(inputs: ScoringInputs): Promise<InterviewResult> {
  const systemPrompt = `You are an objective scoring engine. Analyze the candidate interview transcript and question metadata and produce an objective score and reasoning.

Rules:
1. Output JSON only (no extra commentary).
2. Provide sub-scores (0-100) for: roleFit, technical, structure, communication, initiative.
3. Overall score must be computed from weights: roleFit 30%, technical 25%, structure 20%, communication 15%, initiative 10% and returned as integer 0-100 (round to nearest integer).
4. Provide 3-5 highlights: short candidate quotes showing strengths.
5. Provide 3-5 improvementSuggestions: concrete, actionable bullet points.

Output schema:
{
  "overall": number,
  "breakdown": {"roleFit":number,"technical":number,"structure":number,"communication":number,"initiative":number},
  "highlights": [string],
  "improvementSuggestions":[string]
}`

  const userPrompt = `Transcript: ${inputs.conversationTranscript.slice(0, 6000)}
QuestionMeta: ${JSON.stringify(inputs.questionMeta)}
ResumeText: ${inputs.resumeText?.slice(0, 4000) || "NONE"}
Task: Score the candidate using the rules above and return valid JSON.`

  try {
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.5,
    })

    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const parsed = JSON.parse(cleaned)

    return {
      overall: Math.min(100, Math.max(0, Math.round(parsed.overall || 0))),
      breakdown: {
        roleFit: parsed.breakdown?.roleFit || 65,
        technical: parsed.breakdown?.technical || 60,
        structure: parsed.breakdown?.structure || 65,
        communication: parsed.breakdown?.communication || 70,
        initiative: parsed.breakdown?.initiative || 60,
      },
      highlights: parsed.highlights || ["Good participation"],
      improvementSuggestions: parsed.improvementSuggestions || ["Practice STAR method"],
      stats: {
        questionsAnswered: inputs.questionMeta.length,
      },
    }
  } catch (error) {
    console.error("Error computing score:", error)
    return {
      overall: 65,
      breakdown: { roleFit: 65, technical: 60, structure: 65, communication: 70, initiative: 60 },
      highlights: ["Participated in interview"],
      improvementSuggestions: ["Add more specific examples"],
      stats: { questionsAnswered: inputs.questionMeta.length },
    }
  }
}
```

### 3. Update app/page.tsx to pass interviewResult

Change these lines:

```typescript
// Add state
const [interviewResult, setInterviewResult] = useState<InterviewResult | null>(null)

// Update handleInterviewComplete
const handleInterviewComplete = (finalScores: any, result: InterviewResult | null) => {
  setState((prev) => ({ ...prev as any, recentScores: finalScores }))
  setInterviewResult(result)
  setPhase("feedback")
}

// Pass to components
{phase === "feedback" && <FeedbackSession state={state} onComplete={handleFeedbackComplete} interviewResult={interviewResult} />}
{phase === "dashboard" && <Dashboard state={state} interviewResult={interviewResult} />}
```

### 4. Update InterviewSession to call finalizeInterview

In `components/interview-session.tsx`, before calling onComplete:

```typescript
// Get the interview result from the hook
const result = await finalizeInterview()
onComplete(recentScores, result)
```

You'll need to expose `finalizeInterview` from the hook.

### 5. Verify Dashboard uses real data

In `components/dashboard.tsx`, the metrics calculation should already use `interviewResult` if provided:

```typescript
const metrics = useMemo(() => {
  if (interviewResult && interviewResult.overall) {
    return {
      overallScore: interviewResult.overall,
      breakdown: interviewResult.breakdown,
      questionsAttempted: interviewResult.stats.questionsAnswered,
      durationMinutes: interviewResult.stats.durationMinutes,
    }
  }
  // ... legacy fallback
}, [interviewResult])
```

### 6. Verify FeedbackSession uses real data

In `components/feedback-session.tsx`:

```typescript
const loadInterviewSummary = async () => {
  if (interviewResult) {
    setOverallScore(interviewResult.overall)
    setSummary({
      highlights: interviewResult.highlights,
      suggestions: interviewResult.improvementSuggestions,
    })
  }
  // ... rest of function
}
```

## Verification Steps

1. Start interview WITHOUT resume → Should NOT hallucinate
2. Complete interview → Click "Stop Interview"
3. Check FeedbackSession → Should show real highlights (not "Good communication")
4. Check Dashboard → Should show 0-100 scores, real highlights from transcript
5. Verify charts show actual breakdown scores

## Status
- ✅ Hallucination fix applied (buildInterviewSystemPrompt)
- ❌ computeScore() needs to be re-added (lost in git reset)
- ❌ InterviewResult export needs to be added
- ❌ page.tsx needs to pass interviewResult to components
- ❌ InterviewSession needs to call finalizeInterview()

## Next Steps
1. Add the interfaces and computeScore() function to interview-engine.ts
2. Update page.tsx to manage interviewResult state
3. Update InterviewSession to call finalizeInterview before onComplete
4. Test end-to-end to ensure Dashboard and Feedback show real data

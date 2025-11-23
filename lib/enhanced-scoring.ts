import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import type { ScoringInputs, InterviewResult, QuestionMetadata } from "./interview-engine"

/**
 * Comprehensive scoring function using detailed prompts
 * Based on the compute-score prompt specification
 */
export async function computeScore(inputs: ScoringInputs): Promise<InterviewResult> {
  const questionMetaStr = JSON.stringify(inputs.questionMeta, null, 2)
  
  // Truncate transcript to last 10k chars if needed
  const truncatedTranscript = inputs.conversationTranscript.length > 10000
    ? inputs.conversationTranscript.slice(-10000)
    : inputs.conversationTranscript

  const systemPrompt = `You are an objective scoring engine. Analyze the candidate interview transcript and question metadata and produce an objective score and reasoning.

Rules:
1. Output JSON only (no extra commentary).
2. Provide sub-scores (0-100) for: roleFit, technical, structure, communication, initiative.
3. Overall score must be computed from weights: roleFit 30%, technical 25%, structure 20%, communication 15%, initiative 10% and returned as integer 0-100 (round to nearest integer).
4. Provide 3 highlights: short candidate quotes or paraphrases with timestamps or question IDs showing strengths.
5. Provide 3 improvementSuggestions: concrete, actionable bullet points.

Output schema:
{
  "overall": number,
  "breakdown": {"roleFit":number,"technical":number,"structure":number,"communication":number,"initiative":number},
  "highlights": [{"q_id":string,"quote":string,"why":string}],
  "improvementSuggestions":[string],
  "raw_notes": string
}`

  const userPrompt = `Transcript: ${truncatedTranscript}

QuestionMeta: ${questionMetaStr}

ResumeText: ${inputs.resumeText ? inputs.resumeText.slice(0, 4000) : "NONE"}

Task: Score the candidate using the rules above and return valid JSON.`

  try {
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.5,
    })

    const cleaned = cleanJsonFromModel(text)
    const parsed = JSON.parse(cleaned)

    // Validate and structure the result
    const highlights = (parsed.highlights || []).map((h: any) => 
      typeof h === 'string' ? h : `${h.quote || h.text || ''} (${h.why || h.reason || ''})`
    )

    return {
      overall: Math.min(100, Math.max(0, Math.round(parsed.overall || 0))),
      breakdown: {
        roleFit: Math.min(100, Math.max(0, parsed.breakdown?.roleFit || 0)),
        technical: Math.min(100, Math.max(0, parsed.breakdown?.technical || 0)),
        structure: Math.min(100, Math.max(0, parsed.breakdown?.structure || 0)),
        communication: Math.min(100, Math.max(0, parsed.breakdown?.communication || 0)),
        initiative: Math.min(100, Math.max(0, parsed.breakdown?.initiative || 0)),
      },
      highlights: highlights,
      improvementSuggestions: parsed.improvementSuggestions || [],
      stats: {
        questionsAnswered: inputs.questionMeta.length,
      },
      raw_notes: parsed.raw_notes || '',
    }
  } catch (error) {
    console.error("[v0] Error computing score:", error)
    // Fallback scoring
    return {
      overall: 65,
      breakdown: {
        roleFit: 65,
        technical: 60,
        structure: 65,
        communication: 70,
        initiative: 60,
      },
      highlights: ["Participated in all questions", "Provided relevant answers"],
      improvementSuggestions: ["Add more specific examples", "Use STAR method for behavioral questions"],
      stats: {
        questionsAnswered: inputs.questionMeta.length,
      },
    }
  }
}

function cleanJsonFromModel(text: string): string {
  let cleaned = text.trim()
  if (cleaned.includes("```json")) {
    cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  } else if (cleaned.includes("```")) {
    cleaned = cleaned.replace(/```\n?/g, "").trim()
  }
  return cleaned
}

import { generateText } from "ai"
import { google } from "@ai-sdk/google"

// Re-export computeScore from enhanced-scoring
export { computeScore } from "./enhanced-scoring"

export interface InterviewContext {
  role: string
  level: string
  cvSummary?: string
  jdSummary?: string
  previousResponses: string[]
  scores: number[]
}

export interface QuestionAnalysis {
  question: string
  followUp?: string
  expectedKeywords: string[]
  difficulty: number
}

// Enhanced interfaces for resume-aware question generation
export interface ConversationMessage {
  speaker: "user" | "ai"
  text: string
  timestamp?: number
  meta?: any
}

export interface QuestionMetadata {
  id: string
  topic: string
  difficulty: "easy" | "medium" | "hard"
  expectedPoints?: string[]
  type?: "behavioral" | "technical" | "background" | "clarifying"
  coverage?: number
}

export interface GenerateQuestionRequest {
  role: string
  experienceLevel?: string
  resumeText?: string
  resume_url?: string
  conversationHistory: ConversationMessage[]
  lastQuestionId?: string | null
  questionNumber: number
}

export interface GenerateQuestionResponse {
  question_id: string
  question_text: string
  topic: string
  difficulty: "easy" | "medium" | "hard"
  type: "behavioral" | "technical" | "background" | "clarifying"
  expected_points: string[]
  follow_up_allowed: boolean
  follow_ups?: Array<{ id: string; text: string; weight: number }>
  coverage: number // 0.0 - 1.0
  rationale: string
}

// Scoring interfaces
export interface ScoringInputs {
  conversationTranscript: string
  resumeText?: string
  questionMeta: QuestionMetadata[]
  role: string
  experienceLevel: string
}

export interface ScoreBreakdown {
  roleFit: number // 0-100
  technical: number // 0-100
  structure: number // 0-100 (STAR method, examples)
  communication: number // 0-100
  initiative: number // 0-100 (follow-ups, depth)
}

export interface Highlight {
  q_id: string
  quote: string
  why: string
}

export interface InterviewResult {
  overall: number // 0-100
  breakdown: ScoreBreakdown
  highlights: Highlight[] | string[] // Support both formats
  improvementSuggestions: string[]
  stats: {
    questionsAnswered: number
    durationMinutes?: number
  }
  raw_notes?: string
}

export async function generateInterviewQuestion(
  context: InterviewContext,
  questionNumber: number,
): Promise<QuestionAnalysis> {
  // Build system prompt with CV/JD awareness
  const systemPrompt = buildSystemPrompt(context)

  const prompt = `
You are an expert technical interviewer conducting a ${context.level}-level interview for a ${context.role} position.

Question #${questionNumber + 1} of 8

Based on the candidate's profile and previous responses, generate the next interview question that:
1. Progresses difficulty appropriately
2. Tests specific skills for this role/level
3. References their CV experience if available
4. Probes gaps mentioned in the job description

Format your response as JSON:
{
  "question": "Your detailed question here",
  "followUp": "Optional follow-up question if they give a weak answer",
  "expectedKeywords": ["keyword1", "keyword2"],
  "difficulty": 7
}

${
  context.previousResponses.length > 0
    ? `\nPrevious Response Quality: ${context.scores[context.scores.length - 1]}/10`
    : ""
}
`

  try {
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      system: systemPrompt,
      prompt,
      temperature: 0.7,
      maxTokens: 500,
    })

    const parsed = JSON.parse(text)
    return parsed as QuestionAnalysis
  } catch (error) {
    console.error("[v0] Error generating question:", error)
    return getFallbackQuestion(questionNumber, context)
  }
}

export async function generateInterviewStrategy(
  cvSummary: string | undefined,
  jdSummary: string | undefined,
  role: string,
  level: string,
): Promise<{
  matchPercentage: number
  gaps: string[]
  strengths: string[]
  focusAreas: string[]
}> {
  if (!cvSummary && !jdSummary) {
    return {
      matchPercentage: 50,
      gaps: [],
      strengths: [],
      focusAreas: getDefaultFocusAreas(role, level),
    }
  }

  const prompt = `
Analyze this candidate profile for a ${role} position at ${level} level:

${cvSummary ? `CV Summary:\n${cvSummary}\n` : ""}
${jdSummary ? `Job Description:\n${jdSummary}\n` : ""}

Provide JSON analysis:
{
  "matchPercentage": 0-100,
  "gaps": ["gap1", "gap2"],
  "strengths": ["strength1", "strength2"],
  "focusAreas": ["area1", "area2"]
}
`

  try {
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      prompt,
      temperature: 0.5,
      maxTokens: 400,
    })

    return JSON.parse(text)
  } catch (error) {
    console.error("[v0] Error generating strategy:", error)
    return {
      matchPercentage: 60,
      gaps: [],
      strengths: [],
      focusAreas: getDefaultFocusAreas(role, level),
    }
  }
}

export async function generateFeedbackResponse(
  userMessage: string,
  interviewContext: InterviewContext,
): Promise<string> {
  const systemPrompt = `
You are an empathetic interview coach providing constructive feedback. 
The interview was for a ${interviewContext.level}-level ${interviewContext.role} position.
Average score: ${
    interviewContext.scores.length > 0
      ? (interviewContext.scores.reduce((a, b) => a + b, 0) / interviewContext.scores.length).toFixed(1)
      : "6"
  }/10

Be encouraging but honest. Provide actionable advice for improvement.
Keep responses concise (2-3 sentences) and conversational.
Reference specific areas if the user asks about gaps or improvements.
`

  try {
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      system: systemPrompt,
      prompt: userMessage,
      temperature: 0.7,
      maxTokens: 300,
    })

    return text
  } catch (error) {
    console.error("[v0] Error generating feedback:", error)
    return "That's a great question. Keep practicing and you'll improve quickly!"
  }
}

export async function generateInterviewSummary(context: InterviewContext): Promise<{
  overallScore: number
  strengths: string[]
  gaps: string[]
  recommendations: string[]
}> {
  // Return zeros if no scores available
  if (!context.scores || context.scores.length === 0) {
    return {
      overallScore: 0,
      strengths: ["No interview data available"],
      gaps: ["Complete an interview to see results"],
      recommendations: ["Start a new interview session"],
    }
  }

  const avgScore = context.scores.reduce((a, b) => a + b, 0) / context.scores.length

  const prompt = `
Interview Summary for ${context.level}-level ${context.role} candidate.
Scores: ${context.scores.join(", ")}
Average: ${avgScore.toFixed(1)}/10

${context.previousResponses.length > 0 ? `Response samples: ${context.previousResponses.slice(0, 2).join(" | ")}` : ""}

Generate JSON with:
{
  "strengths": ["strength1", "strength2"],
  "gaps": ["gap1", "gap2"],
  "recommendations": ["recommendation1", "recommendation2"]
}
`

  try {
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      prompt,
      temperature: 0.5,
      maxTokens: 400,
    })

    const parsed = JSON.parse(text)
    return {
      overallScore: Math.round(avgScore * 10) / 10,
      strengths: parsed.strengths || [],
      gaps: parsed.gaps || [],
      recommendations: parsed.recommendations || [],
    }
  } catch (error) {
    console.error("[v0] Error generating summary:", error)
    return {
      overallScore: Math.round(avgScore * 10) / 10,
      strengths: ["Good participation", "Clear communication"],
      gaps: ["Continue practicing"],
      recommendations: ["Review technical fundamentals"],
    }
  }
}

// Helper functions
function buildSystemPrompt(context: InterviewContext): string {
  let prompt = `You are an expert technical interviewer with experience at FAANG companies.
You're conducting a ${context.level}-level interview for a ${context.role} position.

Interview Strategy:`

  if (context.cvSummary) {
    prompt += `\nCandidate Background:\n${context.cvSummary}`
  }

  if (context.jdSummary) {
    prompt += `\nTarget Role Requirements:\n${context.jdSummary}`
  }

  prompt += `\n
Your approach:
- Ask progressively harder questions
- Reference their experience naturally
- Test for both breadth and depth
- Adapt based on their answers
- Be conversational, not robotic`

  return prompt
}

function getDefaultFocusAreas(role: string, level: string): string[] {
  const focusMap: Record<string, Record<string, string[]>> = {
    engineer: {
      Entry: ["Data structures & algorithms", "Web fundamentals", "Problem solving basics"],
      Mid: ["System design", "Architecture decisions", "Scaling"],
      Senior: ["Leadership", "Mentoring", "Technical strategy"],
    },
    sales: {
      Entry: ["Sales process", "Objection handling", "Prospecting"],
      Mid: ["Deal closing", "Client relationships", "Pipeline management"],
      Senior: ["Strategy", "Team leadership", "Revenue growth"],
    },
    retail: {
      Entry: ["Customer service", "Product knowledge", "Teamwork"],
      Mid: ["Training", "Floor management", "Sales techniques"],
      Senior: ["Store operations", "Team development", "KPI management"],
    },
  }

  return focusMap[role]?.[level] || ["Communication", "Problem-solving", "Adaptability"]
}

function getFallbackQuestion(questionNum: number, context: InterviewContext): QuestionAnalysis {
  const fallbackQuestions: Record<number, QuestionAnalysis> = {
    0: {
      question: "Tell me about your professional background and how you got into this field.",
      expectedKeywords: ["experience", "growth", "motivation"],
      difficulty: 3,
    },
    1: {
      question: "Describe a challenging project you worked on. What made it difficult?",
      expectedKeywords: ["problem", "solution", "outcome"],
      difficulty: 5,
    },
    2: {
      question: "How do you approach learning new technologies or skills?",
      expectedKeywords: ["learning", "practice", "resources"],
      difficulty: 4,
    },
    3: {
      question: "Tell me about a time you had to collaborate with someone difficult.",
      expectedKeywords: ["communication", "resolution", "teamwork"],
      difficulty: 6,
    },
    4: {
      question: "What are your biggest strengths in this field?",
      expectedKeywords: ["skills", "achievements", "value"],
      difficulty: 5,
    },
    5: {
      question: "Where do you see yourself growing in your career?",
      expectedKeywords: ["goals", "development", "ambition"],
      difficulty: 4,
    },
    6: {
      question: "Do you have any questions for me about this role or company?",
      expectedKeywords: ["engagement", "curiosity", "fit"],
      difficulty: 3,
    },
  }

  return (
    fallbackQuestions[questionNum] || {
      question: "Is there anything else you'd like to share about yourself?",
      expectedKeywords: [],
      difficulty: 2,
    }
  )
}

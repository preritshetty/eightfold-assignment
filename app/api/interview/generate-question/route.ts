import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { systemPrompt, prompt, maxTokens = 400 } = body

    console.log("[v0] API route called with:", {
      systemPrompt: systemPrompt?.substring(0, 50),
      prompt: prompt?.substring(0, 50),
    })

    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      system: systemPrompt,
      prompt,
      temperature: 0.7,
      maxTokens,
    })

    console.log("[v0] Generated text:", text?.substring(0, 100))

    // Strip markdown code fences if present
    let cleanedText = text
    if (text.includes("```json")) {
      cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    } else if (text.includes("```")) {
      cleanedText = text.replace(/```\n?/g, "").trim()
    }

    return NextResponse.json({ text: cleanedText })
  } catch (error) {
    console.error("[v0] API route error:", error)
    return NextResponse.json({ error: "Failed to generate question", details: String(error) }, { status: 500 })
  }
}

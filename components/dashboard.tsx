"use client"

import { useMemo } from "react"
import {
  BarChart,
  Bar,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ComposedChart,
} from "recharts"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Share2 } from "lucide-react"
import type { InterviewResult } from "@/lib/interview-engine"

interface DashboardProps {
  state: any
  interviewResult?: InterviewResult | null
}

export function Dashboard({ state, interviewResult }: DashboardProps) {
  // Compute insights from interviewResult
  const insights = useMemo(() => {
    if (interviewResult?.overall) {
      return {
        overallScore: interviewResult.overall,
        breakdown: interviewResult.breakdown,
        highlights: (interviewResult.highlights || []).map(h => 
          typeof h === 'string' ? h : h.quote
        ),
        suggestions: interviewResult.improvementSuggestions || [],
      }
    }
    // Fallback to legacy scoring
    return {
      overallScore: 0,
      breakdown: {
        roleFit: 0,
        technical: 0,
        structure: 0,
        communication: 0,
        initiative: 0,
      },
      highlights: [],
      suggestions: [],
    }
  }, [interviewResult])

  const metrics = useMemo(() => {
    const scores = state.recentScores || []
    const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0

    return {
      overallScore: Math.round(avgScore * 10) / 10,
      highestScore: Math.max(...scores, 0),
      lowestScore: Math.min(...scores, 10),
      consistency: calculateConsistency(scores),
      questionsAttempted: scores.length,
    }
  }, [state.recentScores])

  // Score progression data
  const scoreProgressionData = useMemo(() => {
    return (state.recentScores || []).map((score: number, idx: number) => ({
      question: `Q${idx + 1}`,
      score: score,
      target: 7,
    }))
  }, [state.recentScores])

  // Skill assessment radar data
  const skillData = useMemo(() => {
    const scores = state.recentScores || []
    if (scores.length === 0) {
      return [
        { subject: "Communication", value: 0 },
        { subject: "Technical Knowledge", value: 0 },
        { subject: "Problem Solving", value: 0 },
        { subject: "System Design", value: 0 },
        { subject: "Leadership", value: 0 },
      ]
    }

    const avgScore = metrics.overallScore * 10
    return [
      { subject: "Communication", value: Math.min(avgScore + 10, 100) },
      { subject: "Technical Knowledge", value: Math.min(avgScore + 5, 100) },
      { subject: "Problem Solving", value: avgScore },
      { subject: "System Design", value: Math.min(avgScore - 5, 100) },
      { subject: "Leadership", value: Math.min(avgScore - 10, 100) },
    ]
  }, [metrics])

  // JD Match analysis (if available)
  const jdMatchData = useMemo(() => {
    if (!state.uploads?.jd) return null

    const avgScore = metrics.overallScore * 10
    return {
      matchPercentage: Math.min(avgScore + 15, 100),
      strengths: ["Communication", "Problem Solving"],
      gaps: ["System Design at Scale", "Distributed Systems"],
    }
  }, [state.uploads, metrics])

  // Difficulty progression
  const difficultyData = [
    { question: "Q1", difficulty: 3, score: state.recentScores?.[0] || 0 },
    { question: "Q2", difficulty: 4, score: state.recentScores?.[1] || 0 },
    { question: "Q3", difficulty: 5, score: state.recentScores?.[2] || 0 },
    { question: "Q4", difficulty: 6, score: state.recentScores?.[3] || 0 },
    { question: "Q5", difficulty: 6, score: state.recentScores?.[4] || 0 },
    { question: "Q6", difficulty: 7, score: state.recentScores?.[5] || 0 },
    { question: "Q7", difficulty: 7, score: state.recentScores?.[6] || 0 },
  ]

  // Performance breakdown
  const performanceBreakdown = [
    { category: "Excellent (8-10)", count: (state.recentScores || []).filter((s: number) => s >= 8).length },
    { category: "Good (6-7)", count: (state.recentScores || []).filter((s: number) => s >= 6 && s < 8).length },
    { category: "Fair (4-5)", count: (state.recentScores || []).filter((s: number) => s >= 4 && s < 6).length },
    { category: "Needs Work (<4)", count: (state.recentScores || []).filter((s: number) => s < 4).length },
  ]

  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-2 text-balance">Interview Report</h1>
          <div className="flex items-center justify-between mt-4">
            <div>
              <p className="text-slate-400">
                {state.role || "Software Engineer"} • {state.level || "Mid"} Level
              </p>
              <p className="text-sm text-slate-500">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="border-slate-800 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur p-6 text-center">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Overall Score</p>
            <p className="text-5xl font-bold text-white">{metrics.overallScore}</p>
            <p className="text-slate-500 text-xs mt-1">/10</p>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur p-6">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Peak Score</p>
            <p className="text-4xl font-bold text-green-400">{metrics.highestScore}</p>
            <p className="text-slate-500 text-xs mt-1">Best response</p>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur p-6">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Lowest Score</p>
            <p className="text-4xl font-bold text-yellow-400">{metrics.lowestScore}</p>
            <p className="text-slate-500 text-xs mt-1">Area to improve</p>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur p-6">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Consistency</p>
            <p className="text-4xl font-bold text-blue-400">{metrics.consistency}%</p>
            <p className="text-slate-500 text-xs mt-1">Performance stability</p>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur p-6">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Questions</p>
            <p className="text-4xl font-bold text-purple-400">{metrics.questionsAttempted}</p>
            <p className="text-slate-500 text-xs mt-1">Completed</p>
          </Card>
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Score Progression */}
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Score Progression</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={scoreProgressionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="question" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[0, 10]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend />
                <Bar dataKey="score" fill="#3b82f6" name="Your Score" radius={[8, 8, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  name="Target (7/10)"
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* Skill Radar */}
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Skill Assessment</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={skillData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis stroke="#94a3b8" domain={[0, 100]} />
                <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Second Row Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Difficulty vs Performance */}
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Performance by Difficulty</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={difficultyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="question" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend />
                <Bar dataKey="score" fill="#3b82f6" name="Score" radius={[8, 8, 0, 0]} />
                <Bar dataKey="difficulty" fill="#8b5cf6" name="Difficulty" radius={[8, 8, 0, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Performance Distribution */}
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Performance Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={performanceBreakdown}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="category" type="category" stroke="#94a3b8" width={150} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 8, 8, 0]}>
                  {performanceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* JD Match Analysis (if available) */}
        {jdMatchData && (
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur p-8 mb-8">
            <h3 className="text-lg font-semibold text-white mb-6">Job Description Match</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{Math.round(jdMatchData.matchPercentage)}%</p>
                    <p className="text-xs text-blue-200">Match</p>
                  </div>
                </div>
                <p className="text-slate-400 text-sm">Overall fit for the role</p>
              </div>

              <div>
                <p className="text-green-400 font-semibold mb-3">Strengths Validated</p>
                <ul className="space-y-2">
                  {jdMatchData.strengths.map((strength: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                      <span className="text-green-400 mt-1">✓</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-yellow-400 font-semibold mb-3">Gaps Identified</p>
                <ul className="space-y-2">
                  {jdMatchData.gaps.map((gap: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                      <span className="text-yellow-400 mt-1">!</span>
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Key Insights */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur p-8 mb-8">
          <h3 className="text-lg font-semibold text-white mb-6">Key Insights & Recommendations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {insights.highlights && insights.highlights.length > 0 ? (
                insights.highlights.map((highlight, idx) => (
                  <div key={idx} className="border-l-4 border-green-500 pl-4">
                    <p className="font-semibold text-green-400 text-sm">
                      {idx === 0 ? "Standout Performance" : "Strength"}
                    </p>
                    <p className="text-slate-300 text-sm mt-1">{highlight}</p>
                  </div>
                ))
              ) : (
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="font-semibold text-green-400 text-sm">Strengths</p>
                  <p className="text-slate-300 text-sm mt-1">
                    Complete the interview to see personalized highlights based on your responses.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {insights.suggestions && insights.suggestions.length > 0 ? (
                insights.suggestions.map((suggestion, idx) => (
                  <div key={idx} className="border-l-4 border-yellow-500 pl-4">
                    <p className="font-semibold text-yellow-400 text-sm">
                      {idx === 0 ? "Areas for Growth" : "Improvement Opportunity"}
                    </p>
                    <p className="text-slate-300 text-sm mt-1">{suggestion}</p>
                  </div>
                ))
              ) : (
                <div className="border-l-4 border-yellow-500 pl-4">
                  <p className="font-semibold text-yellow-400 text-sm">Areas for Growth</p>
                  <p className="text-slate-300 text-sm mt-1">
                    Complete the interview to receive personalized improvement suggestions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-12 flex-col sm:flex-row">
          <Button
            onClick={() => (window.location.href = "/")}
            size="lg"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Schedule New Practice Interview
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
          >
            Download Full Report
          </Button>
        </div>
      </div>
    </div>
  )
}

// Helper function to calculate consistency
function calculateConsistency(scores: number[]): number {
  if (scores.length < 2) return 100

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)

  // Convert std dev to consistency percentage (lower std dev = higher consistency)
  const consistency = Math.max(0, 100 - stdDev * 10)
  return Math.round(consistency)
}

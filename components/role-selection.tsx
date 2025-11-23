"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface RoleSelectionProps {
  onSelect: (role: string, level: string) => void
}

export function RoleSelection({ onSelect }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState("")
  const [selectedLevel, setSelectedLevel] = useState("")

  const roles = [
    { id: "engineer", label: "Software Engineer", icon: "💻" },
    { id: "sales", label: "Sales Professional", icon: "💼" },
    { id: "retail", label: "Retail Associate", icon: "🛍️" },
  ]

  const levels = ["Entry", "Mid", "Senior"]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8">
      <Card className="w-full max-w-2xl border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Select Interview Role</h1>
          <p className="text-slate-400 mb-8">Choose the position and level you want to practice for</p>

          <div className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-200">Position</label>
              <div className="grid grid-cols-1 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`flex items-center gap-3 p-4 border rounded-lg transition-all text-left group ${
                      selectedRole === role.id
                        ? "border-blue-600 bg-blue-600/10"
                        : "border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-2xl">{role.icon}</span>
                    <span
                      className={`font-medium ${selectedRole === role.id ? "text-blue-400" : "text-slate-300 group-hover:text-white"}`}
                    >
                      {role.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Level Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-200">Experience Level</label>
              <div className="flex gap-3">
                {levels.map((level) => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    className={`flex-1 p-3 border rounded-lg transition-all font-medium ${
                      selectedLevel === level
                        ? "border-blue-600 bg-blue-600/10 text-blue-400"
                        : "border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Continue Button */}
            <Button
              onClick={() => onSelect(selectedRole || "engineer", selectedLevel || "Mid")}
              disabled={!selectedRole || !selectedLevel}
              size="lg"
              className="w-full bg-white text-black hover:bg-slate-100 font-semibold disabled:opacity-50 mt-8"
            >
              Start Interview
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

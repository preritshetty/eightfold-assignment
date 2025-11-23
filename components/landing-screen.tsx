"use client"

import { useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface LandingScreenProps {
  onContinue: (cvData: any, jdData: any) => void
}

export function LandingScreen({ onContinue }: LandingScreenProps) {
  const [cvFile, setCvFile] = useState(null)
  const [jdFile, setJdFile] = useState(null)

  const handleFileUpload = (e, setter) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setter({
          name: file.name,
          content: event.target?.result,
        })
      }
      reader.readAsText(file)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <Card className="w-full max-w-2xl border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="p-8 md:p-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 text-balance">Interview Practice Partner</h1>
            <p className="text-lg text-slate-400 text-balance">
              Personalize your practice session with AI-powered feedback
            </p>
          </div>

          <div className="space-y-8">
            {/* CV Upload */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-200">Upload Your CV (Optional)</label>
              <label className="flex items-center justify-center border-2 border-dashed border-slate-700 rounded-lg p-6 cursor-pointer hover:border-slate-500 transition-colors bg-slate-800/20">
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={(e) => handleFileUpload(e, setCvFile)}
                  className="hidden"
                />
                <div className="text-center">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-300">{cvFile ? cvFile.name : "Drag & drop or click to upload"}</p>
                </div>
              </label>
            </div>

            {/* JD Upload */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-200">Upload Job Description (Optional)</label>
              <label className="flex items-center justify-center border-2 border-dashed border-slate-700 rounded-lg p-6 cursor-pointer hover:border-slate-500 transition-colors bg-slate-800/20">
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={(e) => handleFileUpload(e, setJdFile)}
                  className="hidden"
                />
                <div className="text-center">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-300">{jdFile ? jdFile.name : "Drag & drop or click to upload"}</p>
                </div>
              </label>
            </div>

            {/* Analysis Preview */}
            {cvFile && jdFile && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-sm text-slate-300">
                <p className="font-semibold text-slate-200 mb-2">Quick Analysis:</p>
                <ul className="space-y-1 text-xs">
                  <li>✓ CV loaded: {cvFile.name}</li>
                  <li>✓ JD loaded: {jdFile.name}</li>
                  <li>✓ Match analysis ready</li>
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={() => onContinue(cvFile, jdFile)}
                size="lg"
                className="flex-1 bg-white text-black hover:bg-slate-100 font-semibold"
              >
                Continue
              </Button>
              <Button
                onClick={() => onContinue(null, null)}
                variant="outline"
                size="lg"
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Skip - General Mode
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

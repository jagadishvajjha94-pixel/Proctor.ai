"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  Brain,
  Code2,
  Eye,
  BarChart3,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  MonitorPlay,
  Users,
  Gauge,
} from "lucide-react"

export default function LandingPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    registrationId: "",
    college: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.isNewStudent) {
          setIsLogin(false)
          setError("Please fill in all fields to register.")
        } else {
          setError(data.error || "Authentication failed")
        }
        return
      }
      router.push(data.redirect)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDemoLogin(role: "student" | "admin") {
    setLoading(true)
    setError("")
    try {
      const credentials =
        role === "admin"
          ? { email: "admin@proctorai.com", password: "admin123" }
          : { email: "arjun.sharma@university.edu", password: "demo", name: "Arjun Sharma", registrationId: "REG2026001", college: "IIT Delhi" }
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(data.redirect)
      } else {
        setError(data.error || "Demo login failed")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      icon: Brain,
      title: "AI-Generated Questions",
      description: "Unique questions for every student. No repetition across 1500+ candidates.",
    },
    {
      icon: Eye,
      title: "Real-Time Proctoring",
      description: "Camera, mic, and browser monitoring with AI-powered violation detection.",
    },
    {
      icon: Code2,
      title: "Secure Code Execution",
      description: "Sandboxed code evaluation with multi-language support and plagiarism detection.",
    },
    {
      icon: Shield,
      title: "Anti-Cheat System",
      description: "Encrypted APIs, keystroke dynamics, browser integrity checks, and more.",
    },
    {
      icon: BarChart3,
      title: "AI Eligibility Engine",
      description: "Transparent, auditable decisions based on multi-factor scoring.",
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "One session per device, server-side validation, zero client-side secrets.",
    },
  ]

  return (
    <div className="min-h-screen bg-background bg-mesh">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">ProctorAI</span>
          </div>
          <Badge variant="outline" className="border-primary/40 bg-primary/5 px-3 py-1 text-primary">
            Management Demo
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        {/* Demo Quick Access - Top Priority */}
        <Card className="card-glow mb-12 overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-accent/5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                <MonitorPlay className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="font-display text-xl text-foreground">Quick Demo Access</CardTitle>
                <CardDescription className="mt-1">Jump directly into any view — no login required for demo</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleDemoLogin("admin")}
                disabled={loading}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-card/80 p-5 text-left backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-card hover:shadow-xl hover:shadow-primary/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20 group-hover:scale-105">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Admin Dashboard</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    30 students, live stats, eligibility decisions, violation tracking
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-primary">
                  Open Dashboard <ArrowRight className="h-3 w-3" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin("student")}
                disabled={loading}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-card/80 p-5 text-left backdrop-blur-sm transition-all hover:border-accent/50 hover:bg-card hover:shadow-xl hover:shadow-accent/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent/20 group-hover:scale-105">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Student Dashboard</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Assessment progress, integrity scores, phase tracking, results
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-primary">
                  Open Dashboard <ArrowRight className="h-3 w-3" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin("student")}
                disabled={loading}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-card/80 p-5 text-left backdrop-blur-sm transition-all hover:border-warning/50 hover:bg-card hover:shadow-xl hover:shadow-warning/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10 transition-colors group-hover:bg-warning/20 group-hover:scale-105">
                  <Gauge className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Live Assessment</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Code editor, AI questions, proctoring camera, real-time interview
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-primary">
                  Start Assessment <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            </div>
            {loading && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Preparing demo environment...</span>
              </div>
            )}
            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid items-start gap-16 lg:grid-cols-2">
          {/* Left - Info */}
          <div className="flex flex-col gap-8">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm">
                <Shield className="h-3.5 w-3.5" />
                AI-Powered Assessment Platform
              </div>
              <h1 className="font-display text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground lg:text-5xl xl:text-6xl">
                Secure Campus Placement Assessments
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
                Conduct AI-driven technical interviews and coding assessments with real-time proctoring. 
                Every question is unique. Every session is monitored. Every decision is explainable.
              </p>
            </div>

            {/* Assessment Structure */}
            <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base text-foreground">Assessment Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Phase 1 - Screening</p>
                    <p className="text-xs text-muted-foreground">Fundamentals, logic, and problem solving</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Phase 2 - Advanced</p>
                    <p className="text-xs text-muted-foreground">Real-world problems, optimization, AI follow-ups</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-xs font-bold text-accent">
                    x2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Repeated Twice</p>
                    <p className="text-xs text-muted-foreground">Consistency and improvement analysis across attempts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature.title} className="group flex items-start gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card/80 hover:shadow-lg">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">{feature.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Auth Form */}
          <div className="sticky top-24">
            <Card className="card-glow overflow-hidden border-border/60 bg-card/90 shadow-xl backdrop-blur-xl">
              <CardHeader className="border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent pb-6">
                <CardTitle className="font-display text-xl text-foreground">Authenticate</CardTitle>
                <CardDescription className="mt-1">Sign in to your account or register as a new student.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={isLogin ? "login" : "register"} onValueChange={(v) => setIsLogin(v === "login")}>
                  <TabsList className="mb-6 grid w-full grid-cols-2">
                    <TabsTrigger value="login">Sign In</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <TabsContent value="register" className="mt-0 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          placeholder="Your full name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required={!isLogin}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="regId">Registration ID</Label>
                        <Input
                          id="regId"
                          placeholder="e.g., REG2026001"
                          value={formData.registrationId}
                          onChange={(e) => setFormData({ ...formData, registrationId: e.target.value })}
                          required={!isLogin}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="college">College / University</Label>
                        <Input
                          id="college"
                          placeholder="Your institution name"
                          value={formData.college}
                          onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                          required={!isLogin}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="login" className="mt-0" />

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@university.edu"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Your password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                    </div>

                    {error && !loading && (
                      <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {error}
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Authenticating..." : isLogin ? "Sign In" : "Register & Sign In"}
                      {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>

                    <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                      <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                        Admin Access
                      </div>
                      admin@proctorai.com / admin123
                    </div>
                  </form>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

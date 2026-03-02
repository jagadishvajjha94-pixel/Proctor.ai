import React, { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Shield, Brain, Code2, Eye, BarChart3, Lock, ArrowRight, CheckCircle2, AlertTriangle, KeyRound } from "lucide-react"
import { features } from "@/lib/features"

export default function LandingPage() {
  const navigate = useNavigate()
  const [authTab, setAuthTab] = useState<"login" | "register">("login")
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
          setAuthTab("register")
          setError("Please fill in all fields to register.")
        } else {
          setError(data.error || "Authentication failed")
        }
        return
      }
      navigate(data.redirect || "/dashboard")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const featureList = [
    { icon: Brain, title: "AI-Generated Questions", description: "Unique questions per student. No repetition within 1500 candidates; problem-focused and language-specific." },
    { icon: Code2, title: "Code Practice & Execution", description: "Write and run code in-browser. Multi-language support with instant test feedback and code snippets." },
    { icon: Shield, title: "Secure Assessment", description: "Encrypted APIs, server-side validation, one session per student." },
    { icon: BarChart3, title: "AI Eligibility Engine", description: "Transparent, auditable decisions based on multi-factor scoring." },
    { icon: Lock, title: "Enterprise Security", description: "Server-side validation, zero client-side secrets." },
    ...(features.enableProctoring
      ? [{ icon: Eye, title: "Real-Time Proctoring", description: "Camera and browser monitoring with violation detection." } as const]
      : []),
    ...(features.enableInterview
      ? [{ icon: Brain, title: "AI Mock Interview", description: "Technical + HR mock interview (optional, for future use)." } as const]
      : []),
  ]

  return (
    <div className="min-h-screen bg-background bg-mesh">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">ProctorAI</span>
          </div>
          <Link
            to="/admin-login"
            className="rounded p-1.5 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
            title="Staff"
            aria-label="Staff"
          >
            <KeyRound className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid items-start gap-16 lg:grid-cols-2">
          <div className="flex flex-col gap-8">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm">
                <Shield className="h-3.5 w-3.5" /> AI-Powered Assessment Platform
              </div>
              <h1 className="font-display text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground lg:text-5xl xl:text-6xl">
                Secure Campus Placement Assessments
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
                Practice with unique coding questions and run code in your browser. Every question is unique. Every decision is explainable.
              </p>
            </div>
            <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base text-foreground">Assessment Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">1</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Phase 1 - Screening</p>
                    <p className="text-xs text-muted-foreground">Fundamentals, logic, and problem solving</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">2</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Phase 2 - Advanced</p>
                    <p className="text-xs text-muted-foreground">Real-world problems, optimization, AI follow-ups</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-xs font-bold text-accent">x2</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Repeated Twice</p>
                    <p className="text-xs text-muted-foreground">Consistency and improvement analysis across attempts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2">
              {featureList.map((feature) => (
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
          <div className="sticky top-24">
            <Card className="card-glow overflow-hidden border-border/60 bg-card/90 shadow-xl backdrop-blur-xl">
              <CardHeader className="border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent pb-6">
                <CardTitle className="font-display text-xl text-foreground">Authenticate</CardTitle>
                <CardDescription className="mt-1">Sign in to your account or register as a new student.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as "login" | "register")}>
                  <TabsList className="mb-6 grid w-full grid-cols-2">
                    <TabsTrigger value="login">Sign In</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <TabsContent value="register" className="mt-0 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" placeholder="Your full name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required={authTab === "register"} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="regId">Registration ID</Label>
                        <Input id="regId" placeholder="e.g., REG2026001" value={formData.registrationId} onChange={(e) => setFormData({ ...formData, registrationId: e.target.value })} required={authTab === "register"} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="college">College / University</Label>
                        <Input id="college" placeholder="Your institution name" value={formData.college} onChange={(e) => setFormData({ ...formData, college: e.target.value })} required={authTab === "register"} />
                      </div>
                    </TabsContent>
                    <TabsContent value="login" className="mt-0" />
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="you@university.edu" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" placeholder="Your password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                    </div>
                    {error && !loading && (
                      <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        <AlertTriangle className="h-4 w-4 shrink-0" />{error}
                      </div>
                    )}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Authenticating..." : authTab === "register" ? "Register & Sign In" : "Sign In"}
                      {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
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

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield, Users, Activity, CheckCircle2, XCircle, AlertTriangle, LogOut, Search, Download, RefreshCw, BarChart3, Eye, Brain, Trophy, ArrowLeft } from "lucide-react"
import type { Student } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { data, error, isLoading, mutate } = useSWR("/api/session", fetcher, { refreshInterval: 5000 })
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null)

  const stats = data?.stats
  const students: Student[] = data?.students ?? []

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    navigate("/")
  }

  async function handleEvaluate(studentId: string) {
    setEvaluatingId(studentId)
    try {
      await fetch("/api/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      })
      mutate()
    } catch (err) {
      console.error("Evaluation failed:", err)
    } finally {
      setEvaluatingId(null)
    }
  }

  async function handleExportSheets() {
    try {
      const res = await fetch("/api/sheets/export", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        alert("Data exported to Google Sheets successfully!")
      } else {
        alert("Export failed. Please check your Google Sheets configuration.")
      }
    } catch {
      alert("Export failed. Please try again.")
    }
  }

  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()) || s.registrationId.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statusColors: Record<string, string> = {
    not_started: "bg-muted text-muted-foreground",
    in_progress: "bg-primary/10 text-primary",
    completed: "bg-accent/10 text-accent",
    locked: "bg-destructive/10 text-destructive",
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background bg-mesh">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background bg-mesh">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-foreground">ProctorAI</span>
              <Badge variant="secondary" className="ml-3 text-xs">Admin</Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportSheets}>
              <Download className="mr-2 h-4 w-4" /> Export to Sheets
            </Button>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
              <div><p className="text-2xl font-bold text-foreground">{stats?.totalStudents ?? 0}</p><p className="text-xs text-muted-foreground">Total Students</p></div>
            </CardContent>
          </Card>
          <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10"><Activity className="h-6 w-6 text-yellow-500" /></div>
              <div><p className="text-2xl font-bold text-foreground">{stats?.activeTests ?? 0}</p><p className="text-xs text-muted-foreground">Active Tests</p></div>
            </CardContent>
          </Card>
          <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10"><Trophy className="h-6 w-6 text-accent" /></div>
              <div><p className="text-2xl font-bold text-foreground">{stats?.eligible ?? 0}</p><p className="text-xs text-muted-foreground">Eligible</p></div>
            </CardContent>
          </Card>
          <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10"><AlertTriangle className="h-6 w-6 text-destructive" /></div>
              <div><p className="text-2xl font-bold text-foreground">{stats?.totalViolations ?? 0}</p><p className="text-xs text-muted-foreground">Total Violations</p></div>
            </CardContent>
          </Card>
        </div>

        {(stats?.eligible || stats?.borderline || stats?.notEligible) ? (
          <Card className="card-glow mb-8 border-border/60 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Eligibility Overview</CardTitle>
              <CardDescription>AI-evaluated campus drive eligibility decisions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-accent" /><span className="text-sm font-medium text-foreground">Eligible</span></div>
                  <p className="mt-2 text-3xl font-bold text-accent">{stats?.eligible ?? 0}</p>
                  <Progress value={stats?.totalStudents ? ((stats.eligible ?? 0) / stats.totalStudents) * 100 : 0} className="mt-2 h-1.5" />
                </div>
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
                  <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" /><span className="text-sm font-medium text-foreground">Borderline</span></div>
                  <p className="mt-2 text-3xl font-bold text-yellow-500">{stats?.borderline ?? 0}</p>
                  <Progress value={stats?.totalStudents ? ((stats.borderline ?? 0) / stats.totalStudents) * 100 : 0} className="mt-2 h-1.5" />
                </div>
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <div className="flex items-center gap-2"><XCircle className="h-5 w-5 text-destructive" /><span className="text-sm font-medium text-foreground">Not Eligible</span></div>
                  <p className="mt-2 text-3xl font-bold text-destructive">{stats?.notEligible ?? 0}</p>
                  <Progress value={stats?.totalStudents ? ((stats.notEligible ?? 0) / stats.totalStudents) * 100 : 0} className="mt-2 h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="card-glow border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div><CardTitle className="text-foreground">Students</CardTitle><CardDescription>{filteredStudents.length} students registered</CardDescription></div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Filter status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">No students found</p>
                <p className="text-xs">Students will appear here after they register and log in.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Registration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Attempt</TableHead>
                      <TableHead className="text-center">Violations</TableHead>
                      <TableHead className="text-center">Integrity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div><p className="text-sm font-medium text-foreground">{student.name}</p><p className="text-xs text-muted-foreground">{student.email}</p></div>
                        </TableCell>
                        <TableCell>
                          <div><p className="text-sm text-foreground">{student.registrationId}</p><p className="text-xs text-muted-foreground">{student.college}</p></div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[student.status] || ""}>{student.status.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-center"><span className="text-sm text-foreground">{student.currentAttempt}/2</span></TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-medium ${student.violations >= 6 ? "text-destructive" : student.violations >= 3 ? "text-yellow-500" : "text-foreground"}`}>{student.violations}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={student.integrityScore} className="h-1.5 w-16" />
                            <span className="text-xs text-muted-foreground">{student.integrityScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {student.status === "completed" && (
                              <Button variant="outline" size="sm" onClick={() => handleEvaluate(student.id)} disabled={evaluatingId === student.id}>
                                {evaluatingId === student.id ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <Brain className="mr-1 h-3 w-3" />}
                                Evaluate
                              </Button>
                            )}
                            <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /><span className="sr-only">View details</span></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FileCheck2,
  FileText,
  FolderUp,
  Gauge,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Menu,
  PenLine,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  X,
  Download,
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

type User = { id: number; full_name: string; email: string }
type FactSheet = {
  identity: { full_name: string; email: string }
  academics: { gpa: number | null; education: string[] }
  experience: { repos: { name: string; language?: string | null }[] }
  skills: { normalized: string[] }
  awards: { detected: string[] }
  narrative_hooks: { entries: Record<string, string> }
  provenance: { resume_docs: number; supplemental_docs: number; github_source?: string | null }
}
type Grant = {
  id: string
  name: string
  provider: string
  description: string
  tags: string[]
  amount: string
  deadline: string | null
  url: string | null
  eligibility: string[]
  match_score?: number
  matched_terms?: string[]
  match_explanation?: string
}
type Application = {
  id: number
  user_id: number
  grant_id: string
  status: 'planned' | 'in_progress' | 'submitted' | 'awarded' | 'not_awarded'
  notes: string
}
type Audit = {
  status: 'needs_review' | 'checklist_clear'
  is_ai_review: boolean
  notice: string
  concerns: { severity: string; message: string }[]
}
type Page = 'overview' | 'profile' | 'story' | 'funding' | 'tracker' | 'drafts'
type ArtifactType = 'essay' | 'cover_letter' | 'resume_summary' | 'resume' | 'cv'

const questions = [
  { key: 'motivation', label: 'What motivates your education goals?', hint: 'Share what you hope to learn and why it matters to you.' },
  { key: 'challenge', label: 'What is a challenge you have worked through?', hint: 'Focus on what you did, learned, or changed.' },
  { key: 'impact', label: 'How would you like to contribute to your community?', hint: 'Include a specific interest, experience, or goal.' },
  { key: 'financial_context', label: 'What context would you like a scholarship committee to understand?', hint: 'Only share details you feel comfortable storing locally.' },
]

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'profile', label: 'My profile', icon: UserRound },
  { id: 'story', label: 'My story', icon: HeartHandshake },
  { id: 'funding', label: 'Find funding', icon: Search },
  { id: 'tracker', label: 'Application tracker', icon: ClipboardList },
  { id: 'drafts', label: 'Writing studio', icon: PenLine },
]

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, init)
  if (response.status === 204) return undefined as T
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') message = body.detail
    } catch {
      // Keep a useful HTTP status message when the server does not return JSON.
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

function IconMark({ className = '' }: { className?: string }) {
  return (
    <span className={`grid h-10 w-10 place-items-center rounded-2xl bg-brand-600 text-white ${className}`} aria-hidden="true">
      <CompassIcon />
    </span>
  )
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m15.7 8.3-2.2 5.2-5.2 2.2 2.2-5.2 5.2-2.2Z" fill="currentColor" />
    </svg>
  )
}

export function App() {
  const [page, setPage] = useState<Page>('overview')
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [factSheet, setFactSheet] = useState<FactSheet | null>(null)
  const [documentKind, setDocumentKind] = useState<'resume' | 'supplemental'>('resume')
  const [grants, setGrants] = useState<Grant[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [backstory, setBackstory] = useState<Record<string, string>>({})
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [artifactType, setArtifactType] = useState<ArtifactType>('essay')
  const [opportunity, setOpportunity] = useState('')
  const [wordTarget, setWordTarget] = useState(350)
  const [artifact, setArtifact] = useState('')
  const [audit, setAudit] = useState<Audit | null>(null)
  const [busy, setBusy] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const currentQuestion = questions[questionIndex]

  const completedSteps = useMemo(() => [
    Boolean(user),
    Boolean(factSheet && factSheet.provenance.resume_docs),
    Object.keys(backstory).length > 0,
    grants.length > 0,
  ], [user, factSheet, backstory, grants])

  async function perform<T>(label: string, callback: () => Promise<T>): Promise<T | undefined> {
    setBusy(true)
    setBusyAction(label)
    setError('')
    setNotice('')
    try {
      return await callback()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Something went wrong. Please try again.')
      return undefined
    } finally {
      setBusy(false)
      setBusyAction('')
    }
  }

  async function refreshProfile(userId: number) {
    const sheet = await request<FactSheet & { user_id: number }>(`/ingestion/fact-sheet/${userId}`)
    setFactSheet(sheet)
    const entries = await request<{ prompt_key: string; response: string }[]>(`/narrative/backstory/${userId}`)
    setBackstory(Object.fromEntries(entries.map((entry) => [entry.prompt_key, entry.response])))
  }

  async function refreshApplications(userId: number) {
    setApplications(await request<Application[]>(`/applications/${userId}`))
  }

  async function createProfile(event: FormEvent) {
    event.preventDefault()
    const created = await perform('Creating profile', () => request<User>('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name.trim(), email: email.trim() }),
    }))
    if (created) {
      window.localStorage.setItem('grantcompass_user_id', String(created.id))
      setUser(created)
      setNotice('Your profile is saved on this computer.')
      await perform('Loading profile', () => refreshProfile(created.id))
    }
  }

  async function uploadFile(file?: File) {
    if (!user || !file) return
    const form = new FormData()
    form.append('user_id', String(user.id))
    form.append('file', file)
    if (documentKind === 'supplemental') form.append('source_type', 'supplemental')
    const result = await perform('Reading document', () => request<{ source_type: string }>('/ingestion/upload', {
      method: 'POST',
      body: form,
    }))
    if (result) {
      setNotice('Document added to your encrypted local profile.')
      await perform('Updating profile', () => refreshProfile(user.id))
    }
  }

  async function importGithub() {
    if (!user) return
    const result = await perform('Importing public repository summary', () => request('/ingestion/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, username: githubUsername }),
    }))
    if (result) {
      setNotice('Repository summary imported.')
      await perform('Updating profile', () => refreshProfile(user.id))
    }
  }

  const [githubUsername, setGithubUsername] = useState('')

  async function saveAnswer(event: FormEvent) {
    event.preventDefault()
    if (!user || !currentQuestion || !answer.trim()) return
    const result = await perform('Saving response', () => request('/narrative/backstory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, prompt_key: currentQuestion.key, response: answer.trim() }),
    }))
    if (result) {
      setBackstory((existing) => ({ ...existing, [currentQuestion.key]: answer.trim() }))
      const nextIndex = Math.min(questionIndex + 1, questions.length - 1)
      setQuestionIndex(nextIndex)
      setAnswer(backstory[questions[nextIndex].key] ?? '')
      setNotice('Your response is saved locally and encrypted.')
    }
  }

  async function loadFunding() {
    const catalog = await request<{ items: Grant[] }>('/grants')
    if (!user) {
      setGrants(catalog.items)
      setNotice('These are demonstration records, not verified or currently available scholarships.')
      return
    }
    const matches = await request<{ items: Grant[] }>('/grants/match/' + user.id)
    setGrants(matches.items)
    setNotice('Matches are keyword suggestions only. Verify eligibility and deadlines with each provider.')
  }

  async function createApplication(grant: Grant) {
    if (!user) {
      setError('Create a profile before saving an opportunity.')
      setPage('profile')
      return
    }
    const created = await perform('Adding to tracker', () => request<Application>('/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, grant_id: grant.id, notes: '' }),
    }))
    if (created) {
      await refreshApplications(user.id)
      setNotice('Opportunity added to your tracker.')
    }
  }

  async function updateStatus(application: Application, status: Application['status']) {
    const updated = await perform('Updating application', () => request<Application>(`/applications/${application.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }))
    if (updated && user) await refreshApplications(user.id)
  }

  async function deleteProfile() {
    if (!user || !window.confirm('Delete your local profile and all documents, saved answers, and tracker entries? This cannot be undone.')) return
    const deleted = await perform('Deleting local profile', async () => {
      await request<void>(`/users/${user.id}`, { method: 'DELETE' })
      return true
    })
    if (deleted) {
      window.localStorage.removeItem('grantcompass_user_id')
      setUser(null)
      setFactSheet(null)
      setApplications([])
      setBackstory({})
      setArtifact('')
      setAudit(null)
      setNotice('Your profile and associated local data have been deleted.')
      setPage('overview')
    }
  }

  async function generateDraft(event: FormEvent) {
    event.preventDefault()
    if (!user) {
      setError('Create a profile before generating a draft.')
      setPage('profile')
      return
    }
    const result = await perform('Preparing draft and audit', () => request<{ content: string; audit: Audit }>('/narrative/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        artifact_type: artifactType,
        opportunity_name: opportunity.trim(),
        word_target: wordTarget,
      }),
    }))
    if (result) {
      setArtifact(result.content)
      setAudit(result.audit)
    }
  }

  async function auditDraft() {
    if (!user || !artifact.trim()) return
    const result = await perform('Reviewing edited draft', () => request<{ audit: Audit }>('/narrative/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, artifact_type: artifactType, content: artifact }),
    }))
    if (result) setAudit(result.audit)
  }

  function changeArtifactType(value: ArtifactType) {
    setArtifactType(value)
    setAudit(null)
  }

  async function goTo(next: Page) {
    setPage(next)
    setMobileMenuOpen(false)
    setError('')
    setNotice('')
    if (next === 'funding') {
      await perform('Finding opportunities', loadFunding)
    } else if (next === 'tracker' && user) {
      await perform('Loading tracker', () => refreshApplications(user.id))
    } else if (next === 'profile' && user) {
      await perform('Loading profile', () => refreshProfile(user.id))
    }
  }

  useEffect(() => {
    const storedId = window.localStorage.getItem('grantcompass_user_id')
    if (!storedId || !/^\d+$/.test(storedId)) return
    void request<User>(`/users/${storedId}`)
      .then((restoredUser) => setUser(restoredUser))
      .catch(() => setError('Could not restore the saved local profile. Check that the backend is running.'))
  }, [])

  useEffect(() => {
    if (user) void refreshApplications(user.id).catch((reason) => {
      setError(reason instanceof Error ? reason.message : 'Could not load the application tracker.')
    })
  }, [user])

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Main navigation">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => void goTo(id)}
          aria-current={page === id ? 'page' : undefined}
          className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition ${
            page === id
              ? 'bg-brand-50 text-brand-700'
              : 'text-slate-600 hover:bg-slate-50 hover:text-ink'
          }`}
        >
          <Icon className={`h-[18px] w-[18px] ${page === id ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={1.8} />
          {label}
          {id === 'tracker' && applications.length > 0 && (
            <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{applications.length}</span>
          )}
        </button>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-4 sm:px-7 lg:px-10">
          <button onClick={() => void goTo('overview')} className="flex items-center gap-3 text-left" aria-label="GrantCompass home">
            <IconMark />
            <span>
              <span className="block text-[15px] font-bold tracking-tight text-ink">GrantCompass</span>
              <span className="block text-[11px] text-slate-500">College funding, made clearer</span>
            </span>
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-brand-100 bg-brand-50/70 px-3 py-1.5 text-xs font-medium text-brand-700 sm:flex">
            <LockKeyhole className="h-3.5 w-3.5" />
            Private on this device
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden items-center gap-3 lg:flex">
            {user ? (
              <>
                <span className="text-right">
                  <span className="block text-sm font-semibold text-ink">{user.full_name}</span>
                  <span className="block text-xs text-slate-500">Your local workspace</span>
                </span>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#e8f1f0] text-sm font-semibold text-brand-700">
                  {user.full_name.slice(0, 1).toUpperCase()}
                </div>
              </>
            ) : (
              <button onClick={() => void goTo('profile')} className="btn-primary h-10 px-4 text-sm">
                Set up your profile <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-[68px] z-20 border-b border-slate-200 bg-white p-4 shadow-card lg:hidden">
          {nav}
        </div>
      )}

      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[244px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-68px)] border-r border-slate-200/80 bg-white/45 px-5 py-7 lg:block">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Your workspace</p>
          {nav}
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef7f5] text-brand-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-ink">Your information stays local</p>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">Profile details and documents are encrypted before they are saved on this computer.</p>
            <button type="button" onClick={() => setPage('profile')} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">
              Privacy details <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-5 flex items-center gap-2 px-3 text-[11px] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Local workspace
          </div>
        </aside>

        <main className="min-w-0 px-4 pb-14 pt-6 sm:px-7 sm:pt-8 lg:px-10 lg:pt-10">
          <div className="mx-auto max-w-[1120px]">
            {error && (
              <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-800">
                <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="flex-1">{error}</span>
                <button aria-label="Dismiss error" onClick={() => setError('')}><X className="h-4 w-4" /></button>
              </div>
            )}
            {notice && (
              <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3.5 text-sm text-brand-900">
                <Check className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="flex-1">{notice}</span>
                <button aria-label="Dismiss message" onClick={() => setNotice('')}><X className="h-4 w-4" /></button>
              </div>
            )}
            {busy && (
              <div className="mb-5 flex items-center gap-2 text-sm text-slate-500" role="status">
                <LoaderCircle className="h-4 w-4 animate-spin" /> {busyAction}
              </div>
            )}
            {page === 'overview' && (
              <Overview
                user={user}
                completedSteps={completedSteps}
                applications={applications}
                onNavigate={goTo}
                onCreateProfile={() => void goTo('profile')}
              />
            )}
            {page === 'profile' && (
              <ProfilePage
                user={user}
                name={name}
                email={email}
                setName={setName}
                setEmail={setEmail}
                createProfile={createProfile}
                busy={busy}
                factSheet={factSheet}
                uploadFile={uploadFile}
                documentKind={documentKind}
                setDocumentKind={setDocumentKind}
                githubUsername={githubUsername}
                setGithubUsername={setGithubUsername}
                importGithub={importGithub}
                onDelete={deleteProfile}
              />
            )}
            {page === 'story' && (
              <StoryPage
                entries={backstory}
                questionIndex={questionIndex}
                setQuestionIndex={setQuestionIndex}
                answer={answer}
                setAnswer={setAnswer}
                onSave={saveAnswer}
                busy={busy}
                hasProfile={Boolean(user)}
              />
            )}
            {page === 'funding' && (
              <FundingPage grants={grants} applications={applications} onAdd={createApplication} busy={busy} onRefresh={() => void perform('Finding opportunities', loadFunding)} />
            )}
            {page === 'tracker' && (
              <TrackerPage grants={grants} applications={applications} onStatus={updateStatus} onFindFunding={() => void goTo('funding')} />
            )}
            {page === 'drafts' && (
              <DraftsPage
                user={user}
                artifactType={artifactType}
                setArtifactType={changeArtifactType}
                opportunity={opportunity}
                setOpportunity={setOpportunity}
                wordTarget={wordTarget}
                setWordTarget={setWordTarget}
                generateDraft={generateDraft}
                auditDraft={auditDraft}
                artifact={artifact}
                setArtifact={setArtifact}
                setAudit={setAudit}
                audit={audit}
                busy={busy}
              />
            )}
            <footer className="mt-12 flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>GrantCompass is a personal planning tool, not a financial aid provider.</span>
              <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3 w-3" /> Local-first by design</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600">{eyebrow}</p>
        <h1 className="text-[27px] font-semibold tracking-tight text-ink sm:text-[32px]">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  )
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card sm:p-6 ${className}`}>{children}</section>
}

function Label({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-slate-700">{children}</label>
}

function Overview({
  user,
  completedSteps,
  applications,
  onNavigate,
  onCreateProfile,
}: {
  user: User | null
  completedSteps: boolean[]
  applications: Application[]
  onNavigate: (page: Page) => Promise<void>
  onCreateProfile: () => void
}) {
  const stepTitles = ['Create your profile', 'Add a resume or CV', 'Tell your story', 'Explore funding']
  const steps = [
    { icon: UserRound, page: 'profile' as Page },
    { icon: FileText, page: 'profile' as Page },
    { icon: HeartHandshake, page: 'story' as Page },
    { icon: Search, page: 'funding' as Page },
  ]
  return (
    <>
      <div className="relative mb-7 overflow-hidden rounded-[26px] bg-[#173b3a] px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="absolute -right-10 -top-32 h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute -right-1 top-4 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative max-w-[650px]">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a2d4c9]">{user ? `Welcome back, ${user.full_name.split(' ')[0]}` : 'Your next step starts here'}</p>
          <h1 className="max-w-[570px] text-[30px] font-semibold leading-tight tracking-tight sm:text-[38px]">Make finding college funding feel more manageable.</h1>
          <p className="mt-3 max-w-[510px] text-sm leading-6 text-[#c5d8d5]">Keep your information organized, discover funding options, and prepare application materials at your own pace.</p>
          {!user && <button onClick={onCreateProfile} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#173b3a] hover:bg-[#eff7f5]">Set up your profile <ArrowRight className="h-4 w-4" /></button>}
        </div>
        <div className="relative mt-8 grid max-w-[640px] grid-cols-3 gap-3 border-t border-white/15 pt-5">
          <div><p className="text-xl font-semibold">{completedSteps.filter(Boolean).length}<span className="text-sm font-normal text-[#a9c5c0]"> / 4</span></p><p className="mt-1 text-xs text-[#b8ceca]">Getting started</p></div>
          <div><p className="text-xl font-semibold">{applications.length}</p><p className="mt-1 text-xs text-[#b8ceca]">Saved opportunities</p></div>
          <div><p className="text-xl font-semibold">Private</p><p className="mt-1 text-xs text-[#b8ceca]">Local workspace</p></div>
        </div>
      </div>

      <PageHeading eyebrow="A clear path forward" title="Your next steps" description="Build a complete picture one small step at a time. You can come back and update your information whenever you need." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map(({ icon: Icon, page }, index) => {
          const done = completedSteps[index]
          return (
            <button key={stepTitles[index]} onClick={() => void onNavigate(page)} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg">
              <div className="mb-5 flex items-center justify-between">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${done ? 'bg-brand-50 text-brand-700' : 'bg-slate-50 text-slate-500'}`}>
                  {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </span>
                <span className={`text-xs font-semibold ${done ? 'text-brand-700' : 'text-slate-400'}`}>{done ? 'Complete' : `Step ${index + 1}`}</span>
              </div>
              <h3 className="text-sm font-semibold text-ink">{stepTitles[index]}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {['Add basic details to get started.', 'Bring in information you already have.', 'Capture the details that make your story yours.', 'Browse sample opportunities and keep track.'][index]}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 group-hover:gap-2">
                {done ? 'Review' : 'Get started'} <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f0f3fa] text-[#52658b]"><BookOpenCheck className="h-5 w-5" /></span>
          <div>
            <h2 className="font-semibold text-ink">A workspace for your real life</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">GrantCompass helps organize information and draft materials. It does not submit applications or determine whether you qualify. Always confirm details with the official funding provider.</p>
          </div>
        </Card>
        <Card className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eef7f5] text-brand-700"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <h2 className="font-semibold text-ink">Designed around your privacy</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">Profile data is encrypted locally. External GitHub access is off unless you opt in through local settings.</p>
          </div>
        </Card>
      </div>
    </>
  )
}

function ProfilePage({
  user, name, email, setName, setEmail, createProfile, busy, factSheet, uploadFile, documentKind, setDocumentKind, githubUsername, setGithubUsername, importGithub, onDelete,
}: {
  user: User | null
  name: string
  email: string
  setName: (value: string) => void
  setEmail: (value: string) => void
  createProfile: (event: FormEvent) => void
  busy: boolean
  factSheet: FactSheet | null
  uploadFile: (file?: File) => void
  documentKind: 'resume' | 'supplemental'
  setDocumentKind: (value: 'resume' | 'supplemental') => void
  githubUsername: string
  setGithubUsername: (value: string) => void
  importGithub: () => void
  onDelete: () => void
}) {
  return (
    <>
      <PageHeading eyebrow="Your information" title="My profile" description="Add a few details and gather the information you may want to use in applications." />
      {!user ? (
        <Card className="max-w-2xl">
          <div className="mb-5 flex items-start gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700"><UserRound className="h-5 w-5" /></span>
            <div><h2 className="font-semibold text-ink">Create your local profile</h2><p className="mt-1 text-sm text-slate-500">This information stays on this computer and is encrypted before it is saved.</p></div>
          </div>
          <form onSubmit={createProfile} className="space-y-4">
            <div><Label htmlFor="full-name">Your name</Label><input id="full-name" className="field" autoComplete="name" required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} placeholder="How should we address you?" /></div>
            <div><Label htmlFor="email">Email address</Label><input id="email" className="field" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
            <button className="btn-primary" type="submit" disabled={busy || !name.trim() || !email.trim()}>Create profile <ArrowRight className="h-4 w-4" /></button>
          </form>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <Card>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700"><BadgeCheck className="h-5 w-5" /></div>
                <div><h2 className="font-semibold text-ink">Profile details</h2><p className="text-sm text-slate-500">Your details are encrypted on this device.</p></div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Name</p><p className="mt-1 text-sm font-medium text-ink">{user.full_name}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Email</p><p className="mt-1 break-all text-sm font-medium text-ink">{user.email}</p></div>
              </div>
            </Card>
            <Card>
              <div className="mb-4 flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f0f3fa] text-[#52658b]"><FolderUp className="h-5 w-5" /></div>
                <div><h2 className="font-semibold text-ink">Add documents</h2><p className="mt-1 text-sm text-slate-500">Resume, CV, LinkedIn JSON export, or supporting material. Maximum 8 MB each.</p></div>
              </div>
              <div className="mb-4 max-w-sm">
                <Label htmlFor="document-category">Document category</Label>
                <select id="document-category" className="field" value={documentKind} onChange={(event) => setDocumentKind(event.target.value as 'resume' | 'supplemental')}>
                  <option value="resume">Resume, CV, or profile export</option>
                  <option value="supplemental">Transcript, essay, award, or other support</option>
                </select>
              </div>
              <label htmlFor="document-upload" className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-6 text-center transition hover:border-brand-400 hover:bg-brand-50/50">
                <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-700 shadow-sm"><ArrowDownToLine className="h-5 w-5" /></span>
                <span className="text-sm font-semibold text-ink">Choose a file to add</span>
                <span className="mt-1 text-xs text-slate-500">PDF, DOCX, Markdown, TXT, or JSON</span>
                <input id="document-upload" className="sr-only" type="file" accept=".pdf,.docx,.md,.txt,.json" disabled={busy} onChange={(event) => { void uploadFile(event.target.files?.[0]); event.currentTarget.value = '' }} />
              </label>
              {factSheet && (
                <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-brand-900">
                  {factSheet.provenance.resume_docs} profile document{factSheet.provenance.resume_docs === 1 ? '' : 's'} added
                  {factSheet.academics.gpa !== null && <span> · GPA found: {factSheet.academics.gpa}</span>}
                </div>
              )}
            </Card>
            <Card>
              <h2 className="font-semibold text-ink">Public GitHub projects</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Optional. This imports public repository summaries only. Live access requires enabling it in your local backend settings; otherwise the offline mock provider returns an empty profile.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input className="field" aria-label="GitHub username" placeholder="GitHub username" value={githubUsername} onChange={(event) => setGithubUsername(event.target.value)} maxLength={39} />
                <button type="button" className="btn-secondary shrink-0" disabled={busy || !githubUsername.trim()} onClick={importGithub}>Import public data <ArrowRight className="h-4 w-4" /></button>
              </div>
            </Card>
          </div>
          <div className="space-y-5">
            <Card>
              <div className="flex items-center gap-2"><Gauge className="h-5 w-5 text-brand-700" /><h2 className="font-semibold text-ink">Your fact sheet</h2></div>
              <p className="mt-1 text-sm text-slate-500">A quick view of details found in your documents. Check each item for accuracy.</p>
              {!factSheet ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Add a document to start building your fact sheet.</p> : (
                <div className="mt-5 space-y-5">
                  <FactList title="Education" items={factSheet.academics.education} empty="No education details detected yet." />
                  <FactList title="Awards and recognition" items={factSheet.awards.detected} empty="No awards detected yet." />
                  <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Skills mentioned</p>{factSheet.skills.normalized.length ? <div className="flex flex-wrap gap-2">{factSheet.skills.normalized.map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{skill}</span>)}</div> : <p className="text-sm text-slate-500">No skills detected yet.</p>}</div>
                  <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">Automatic extraction can miss or misread details. Confirm all facts against your original documents.</p>
                </div>
              )}
            </Card>
            <Card className="bg-[#f9fbfc]">
              <div className="flex gap-3"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" /><p className="text-xs leading-5 text-slate-500">Documents are extracted locally and encrypted at rest. No cloud synchronization or telemetry is configured.</p></div>
            </Card>
            <Card className="border-rose-100">
              <h2 className="text-sm font-semibold text-rose-800">Delete local profile</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Permanently remove your profile, imported documents, saved answers, and application tracker from this computer.</p>
              <button type="button" className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50" onClick={onDelete}>Delete profile and data</button>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}

function FactList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
      {items.length ? <ul className="space-y-2">{items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-5 text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{item}</li>)}</ul> : <p className="text-sm text-slate-500">{empty}</p>}
    </div>
  )
}

function StoryPage({
  entries, questionIndex, setQuestionIndex, answer, setAnswer, onSave, busy, hasProfile,
}: {
  entries: Record<string, string>
  questionIndex: number
  setQuestionIndex: (index: number) => void
  answer: string
  setAnswer: (value: string) => void
  onSave: (event: FormEvent) => void
  busy: boolean
  hasProfile: boolean
}) {
  const question = questions[questionIndex]
  function selectQuestion(index: number) {
    setQuestionIndex(index)
    setAnswer(entries[questions[index].key] ?? '')
  }
  return (
    <>
      <PageHeading eyebrow="The details only you can share" title="My story" description="Capture experiences, goals, and context in your own words. These optional notes stay encrypted on this computer." />
      {!hasProfile && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Create a profile before saving your answers.</div>}
      <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
        <Card>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Reflection prompts</p>
          <ol className="space-y-1">
            {questions.map((item, index) => {
              const complete = Boolean(entries[item.key])
              return (
                <li key={item.key}>
                  <button type="button" onClick={() => selectQuestion(index)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${index === questionIndex ? 'bg-brand-50 text-brand-900' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${complete ? 'bg-brand-600 text-white' : index === questionIndex ? 'bg-white text-brand-700' : 'bg-slate-100 text-slate-500'}`}>{complete ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="mt-5 rounded-xl bg-slate-50 p-3.5">
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-600"><LockKeyhole className="h-3.5 w-3.5 text-brand-700" /> Personal context stays yours</p>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">Share only what you are comfortable storing. You can revise answers or delete your profile and all its data at any time.</p>
          </div>
        </Card>
        <Card>
          {question ? (
            <form onSubmit={onSave}>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Prompt {questionIndex + 1} of {questions.length}</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">{question.label}</h2>
              <p className="mt-2 text-sm text-slate-500">{question.hint}</p>
              <textarea
                className="field mt-5 min-h-52 resize-y leading-6"
                maxLength={20000}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Write a few notes or a longer reflection. There is no need to make it sound formal."
                aria-label={question.label}
                disabled={!hasProfile || busy}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400"><span>Only include details you want in your private profile.</span><span>{answer.length} / 20,000</span></div>
              <div className="mt-5 flex flex-col-reverse justify-between gap-3 sm:flex-row">
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary" disabled={questionIndex === 0} onClick={() => selectQuestion(Math.max(0, questionIndex - 1))}>Previous</button>
                  <button type="button" className="btn-secondary" disabled={questionIndex === questions.length - 1} onClick={() => selectQuestion(Math.min(questions.length - 1, questionIndex + 1))}>Next prompt <ChevronRight className="h-4 w-4" /></button>
                </div>
                <button type="submit" className="btn-primary" disabled={!hasProfile || busy || !answer.trim()}><Check className="h-4 w-4" /> Save response</button>
              </div>
            </form>
          ) : <p className="text-sm text-slate-500">Select a prompt to begin.</p>}
        </Card>
      </div>
      {Object.keys(entries).length > 0 && (
        <Card className="mt-5">
          <h2 className="font-semibold text-ink">Your saved reflections</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {questions.filter((item) => entries[item.key]).map((item) => (
              <button key={item.key} type="button" onClick={() => selectQuestion(questions.indexOf(item))} className="rounded-xl border border-slate-200 p-4 text-left hover:border-brand-200 hover:bg-brand-50/30">
                <span className="text-xs font-semibold text-brand-700">{item.label}</span>
                <span className="mt-2 block line-clamp-3 whitespace-pre-wrap text-sm leading-5 text-slate-600">{entries[item.key]}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">Edit response <ChevronRight className="h-3 w-3" /></span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}

function FundingPage({ grants, applications, onAdd, busy, onRefresh }: { grants: Grant[]; applications: Application[]; onAdd: (grant: Grant) => void; busy: boolean; onRefresh: () => void }) {
  return (
    <>
      <PageHeading eyebrow="Explore opportunities" title="Find funding" description="Browse demonstration opportunities and see which ones overlap with your profile. This is a starting point for your own research." action={<button onClick={onRefresh} className="btn-secondary" disabled={busy}><Search className="h-4 w-4" /> Refresh matches</button>} />
      <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-5 text-amber-900">
        <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Sample data only.</strong> These examples are not real offers. Amounts, deadlines, eligibility, and links must be verified with official providers.</p>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        <span className="chip"><Search className="h-3.5 w-3.5" /> Keyword suggestions</span>
        <span className="chip"><Target className="h-3.5 w-3.5" /> Not an eligibility decision</span>
      </div>
      {grants.length === 0 ? <Card className="py-12 text-center"><Search className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-ink">No opportunities loaded</p><p className="mt-1 text-sm text-slate-500">Use refresh matches to load the local demonstration catalog.</p><button className="btn-primary mx-auto mt-4" onClick={onRefresh}>Load examples</button></Card> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {grants.map((grant) => {
            const tracked = applications.some((application) => application.grant_id === grant.id)
            return (
              <Card key={grant.id} className="flex flex-col">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eef7f5] text-brand-700"><GraduationCap className="h-5 w-5" /></span>
                  <span className="rounded-full bg-[#f2f5fa] px-3 py-1 text-xs font-semibold text-slate-600">{grant.match_score ?? 0}% keyword overlap</span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{grant.provider}</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">{grant.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{grant.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">{grant.tags.map((tag) => <span key={tag} className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500">{tag}</span>)}</div>
                {grant.matched_terms && grant.matched_terms.length > 0 && <p className="mt-3 text-xs text-brand-700">Profile terms: {grant.matched_terms.join(', ')}</p>}
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4 mt-5">
                  <div><p className="text-xs text-slate-400">Example amount</p><p className="mt-0.5 text-sm font-semibold text-ink">{grant.amount}</p></div>
                  <button className={tracked ? 'btn-secondary' : 'btn-primary'} disabled={tracked || busy} onClick={() => onAdd(grant)}>
                    {tracked ? <><Check className="h-4 w-4" /> In tracker</> : <><Plus className="h-4 w-4" /> Save opportunity</>}
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <p className="mt-5 text-xs leading-5 text-slate-400">Keyword overlap is a simple local comparison, not a prediction of award chances. Research eligibility, deadlines, required documents, and application steps yourself.</p>
    </>
  )
}

function TrackerPage({ grants, applications, onStatus, onFindFunding }: { grants: Grant[]; applications: Application[]; onStatus: (application: Application, status: Application['status']) => void; onFindFunding: () => void }) {
  const grantMap = new Map(grants.map((grant) => [grant.id, grant]))
  const allGrantMap = new Map([
    ['demo-stem-pathways', 'STEM Pathways (Demonstration)'],
    ['demo-community-impact', 'Community Impact (Demonstration)'],
    ['demo-general-education', 'General Education (Demonstration)'],
  ])
  return (
    <>
      <PageHeading eyebrow="Stay organized" title="Application tracker" description="Keep an eye on your next steps. GrantCompass will not submit applications for you." action={<button className="btn-primary" onClick={onFindFunding}><Plus className="h-4 w-4" /> Find funding</button>} />
      {applications.length === 0 ? <Card className="py-14 text-center"><ClipboardList className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-3 font-semibold text-ink">Your tracker is ready</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">Save an opportunity to keep its application status and your own notes in one place.</p><button className="btn-primary mx-auto mt-5" onClick={onFindFunding}>Explore funding <ArrowRight className="h-4 w-4" /></button></Card> : (
        <div className="space-y-3">
          {applications.map((application) => (
            <Card key={application.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef7f5] text-brand-700"><FileCheck2 className="h-5 w-5" /></span><div><h2 className="font-semibold text-ink">{grantMap.get(application.grant_id)?.name ?? allGrantMap.get(application.grant_id) ?? application.grant_id}</h2><p className="mt-1 text-xs text-slate-500">Demonstration opportunity · verify details independently</p></div></div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="sr-only" htmlFor={`status-${application.id}`}>Status for {application.grant_id}</label>
                <select id={`status-${application.id}`} className="field min-w-40 py-2 text-sm" value={application.status} onChange={(event) => onStatus(application, event.target.value as Application['status'])}>
                  <option value="planned">To do</option><option value="in_progress">In progress</option><option value="submitted">Submitted</option><option value="awarded">Awarded</option><option value="not_awarded">Not awarded</option>
                </select>
                <span className="text-xs text-slate-400">Updated locally</span>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Card className="mt-5 flex items-start gap-3 bg-[#f9fbfc]"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><p className="text-sm leading-6 text-slate-500">This tracker is a private checklist. It does not connect to scholarship portals, send applications, or verify submission status.</p></Card>
    </>
  )
}

function DraftsPage({
  user, artifactType, setArtifactType, opportunity, setOpportunity, wordTarget, setWordTarget,
  generateDraft, auditDraft, artifact, setArtifact, setAudit, audit, busy,
}: {
  user: User | null
  artifactType: ArtifactType
  setArtifactType: (value: ArtifactType) => void
  opportunity: string
  setOpportunity: (value: string) => void
  wordTarget: number
  setWordTarget: (value: number) => void
  generateDraft: (event: FormEvent) => void
  auditDraft: () => void
  artifact: string
  setArtifact: (value: string) => void
  setAudit: (value: Audit | null) => void
  audit: Audit | null
  busy: boolean
}) {
  function downloadDraft() {
    const blob = new Blob([artifact], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `grantcompass-${artifactType}.txt`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <>
      <PageHeading eyebrow="Make a first draft" title="Writing studio" description="Turn your own profile details into a starting draft. Review every claim, then make the writing sound like you." />
      {!user && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Create a profile and add your details before writing a draft.</div>}
      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <Card>
          <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Sparkles className="h-5 w-5" /></span><div><h2 className="font-semibold text-ink">Draft settings</h2><p className="text-xs text-slate-500">Generated locally from your profile</p></div></div>
          <form onSubmit={generateDraft} className="space-y-4">
            <div><Label htmlFor="artifact-type">What are you drafting?</Label><select id="artifact-type" className="field" value={artifactType} onChange={(event) => setArtifactType(event.target.value as ArtifactType)}><option value="essay">Scholarship essay</option><option value="cover_letter">Cover letter</option><option value="resume_summary">Resume summary</option><option value="resume">ATS-friendly resume</option><option value="cv">Academic CV</option></select></div>
            <div><Label htmlFor="opportunity-name">Opportunity or school name</Label><input id="opportunity-name" className="field" required minLength={2} maxLength={200} value={opportunity} onChange={(event) => setOpportunity(event.target.value)} placeholder="For example, Community Leadership Award" /></div>
            {artifactType === 'essay' && <div><Label htmlFor="word-target">Approximate word limit</Label><input id="word-target" className="field" type="number" min={50} max={1200} value={wordTarget} onChange={(event) => setWordTarget(Number(event.target.value))} /></div>}
            <button type="submit" className="btn-primary w-full" disabled={!user || busy || opportunity.trim().length < 2}><Sparkles className="h-4 w-4" /> Prepare draft and review</button>
          </form>
          <p className="mt-4 text-xs leading-5 text-slate-400">No external AI service is used. This is a simple local template, not a finished application essay.</p>
        </Card>
        <Card>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div><h2 className="font-semibold text-ink">Your draft</h2><p className="mt-1 text-sm text-slate-500">Edit the text and verify each detail before using it.</p></div>
            <div className="flex flex-wrap items-center gap-2">
              {audit && <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${audit.status === 'checklist_clear' ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-800'}`}><ShieldCheck className="h-3.5 w-3.5" /> {audit.status === 'checklist_clear' ? 'Checklist clear' : 'Review suggested'}</span>}
              {artifact.trim() && <button type="button" className="btn-secondary min-h-9 px-3 py-1.5 text-xs" onClick={downloadDraft} disabled={audit?.status !== 'checklist_clear'} title={audit?.status === 'checklist_clear' ? 'Download the reviewed draft' : 'Resolve review flags and rerun the checklist before downloading'}><Download className="h-3.5 w-3.5" /> Download .txt</button>}
            </div>
          </div>
          <textarea className="field min-h-[340px] resize-y leading-6" aria-label="Draft text, editable" value={artifact} onChange={(event) => { setArtifact(event.target.value); setAudit(null) }} placeholder="Your draft will appear here. Your own words and specific examples are the most important part." />
          {artifact.trim() && !audit && <button type="button" className="btn-secondary mt-3" onClick={auditDraft} disabled={busy}><ShieldCheck className="h-4 w-4" /> Run checklist on current text</button>}
          {audit && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Adversarial checklist</p>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">{audit.notice}</p>
              {audit.concerns.length > 0 ? <ul className="mt-3 space-y-2">{audit.concerns.map((concern, index) => <li key={`${concern.message}-${index}`} className="flex gap-2 text-sm leading-5 text-slate-700"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />{concern.message}</li>)}</ul> : <p className="mt-3 flex items-center gap-2 text-sm text-brand-700"><Check className="h-4 w-4" /> No automated checklist flags. This does not verify claims or policy compliance.</p>}
              <p className="mt-3 border-t border-slate-200 pt-3 text-xs font-medium text-slate-600">This is a deterministic checklist, not an AI reviewer. It cannot certify accuracy, originality, or compliance.</p>
            </div>
          )}
          {artifact.trim() && audit?.status === 'needs_review' && <p className="mt-3 text-xs leading-5 text-amber-800">Resolve the review flags above and rerun the checklist before downloading this draft.</p>}
        </Card>
      </div>
    </>
  )
}

export default App

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { Icons } from '@/components/ui/Icons'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface Profile {
  fullName: string; headline: string; summary: string; phone: string
  city: string; state: string; country: string
  collegeName: string; degree: string; passingYear: number; cgpa: number
  technicalSkills: string[]; softSkills: string[]
  socialLinks: { linkedin: string; github: string; portfolio: string; leetcode: string; codeforces: string }
  experience: Array<{ company: string; role: string; startDate: string; current: boolean; description: string }>
  projects: Array<{ title: string; description: string; technologies: string[] | string; githubLink: string; liveLink: string }>
  achievements: { certificates: Array<{ name: string; issuer: string; year: number }> }
  profileStrength: number
  profilePhoto: string
}

const TABS = [
  { id: 'overview',     label: 'Overview'     },
  { id: 'academic',     label: 'Academic'     },
  { id: 'experience',   label: 'Experience'   },
  { id: 'projects',     label: 'Projects'     },
  { id: 'skills',       label: 'Skills'       },
  { id: 'achievements', label: 'Awards'       },
  { id: 'social',       label: 'Social'       },
]

export default function StudentProfilePage() {
  const { user, loading } = useRequireAuth()
  const qc = useQueryClient()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Profile>>({})
  const [techSkill, setTechSkill] = useState('')
  const [softSkill, setSoftSkill] = useState('')

  // Inline form state for list sections
  const [expForm,     setExpForm]     = useState({ company: '', role: '', startDate: '', current: false, description: '' })
  const [projForm,    setProjForm]    = useState({ title: '', description: '', technologies: '', githubLink: '', liveLink: '' })
  const [achCertForm, setAchCertForm] = useState({ name: '', issuer: '', year: '' })
  const [showExpForm,  setShowExpForm]  = useState(false)
  const [showProjForm, setShowProjForm] = useState(false)
  const [showAchForm,  setShowAchForm]  = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['student-profile'],
    queryFn: async () => {
      const res = await api.get<{ data: Profile }>('/profile')
      return res.data.data
    },
    enabled: !!user,
  })

  const saveMutation = useMutation({
    mutationFn: () => api.put('/profile', form),
    onSuccess: () => {
      toast.success('Profile updated!')
      qc.invalidateQueries({ queryKey: ['student-profile'] })
      setEditing(false)
    },
    onError: () => toast.error('Failed to save'),
  })

  const uploadPhotoMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('photo', file)
      return api.post('/profile/photo', fd)
    },
    onSuccess: () => { toast.success('Photo updated!'); qc.invalidateQueries({ queryKey: ['student-profile'] }) },
    onError: () => toast.error('Photo upload failed'),
  })

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const startEdit = () => { setEditing(true); setForm(profile ?? {}) }

  if (loading || !user)
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>

  const p = profile ?? {} as Profile
  const strength = p.profileStrength ?? 0
  const sv = strength >= 70 ? 'success' : strength >= 40 ? 'warning' : 'danger'
  const missing = [
    !p.headline && 'Add a headline',
    !p.summary && 'Add a summary',
    !(p.technicalSkills?.length >= 3) && 'Add at least 3 skills',
    !(p.experience?.length >= 1) && 'Add work experience',
    !(p.projects?.length >= 1) && 'Add a project',
    !p.socialLinks?.github && 'Link your GitHub',
  ].filter(Boolean) as string[]

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Profile header card */}
        <Card className="overflow-hidden">
          <div className="h-28 bg-gradient-primary" />
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">
              <div className="relative">
                <Avatar src={p.profilePhoto || user.avatar} name={p.fullName || user.name} size="2xl" className="ring-4 ring-white shadow-lg" />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  title="Change photo"
                  className="absolute bottom-0 right-0 rounded-full bg-primary-600 p-1.5 text-white hover:bg-primary-700 transition-colors"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                  aria-label="Upload profile photo"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhotoMutation.mutate(f); e.target.value = '' }} />
              </div>
              <Button variant={editing ? 'danger' : 'outline'} size="sm" onClick={() => { if (editing) setEditing(false); else startEdit() }}>
                {editing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-6 w-48 bg-surface-secondary rounded animate-pulse" />
                <div className="h-4 w-64 bg-surface-secondary rounded animate-pulse" />
              </div>
            ) : (
              <>
                <h1 className="text-heading-lg text-text">{p.fullName || user.name}</h1>
                <p className="text-body-md text-text-muted mb-1">{p.headline || 'Add a professional headline'}</p>
                {p.city && (
                  <p className="text-body-sm text-text-subtle flex items-center gap-1">
                    <Icons.Globe className="h-3.5 w-3.5" />
                    {[p.city, p.state, p.country].filter(Boolean).join(', ')}
                  </p>
                )}
                <div className="flex gap-3 mt-3 flex-wrap">
                  {p.socialLinks?.linkedin && (
                    <a href={p.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline font-medium">
                      <Icons.ExternalLink className="h-3 w-3" /> LinkedIn
                    </a>
                  )}
                  {p.socialLinks?.github && (
                    <a href={p.socialLinks.github} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text">
                      <Icons.Code className="h-3 w-3" /> GitHub
                    </a>
                  )}
                  {p.socialLinks?.portfolio && (
                    <a href={p.socialLinks.portfolio} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text">
                      <Icons.Globe className="h-3 w-3" /> Portfolio
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Profile strength */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text">Profile Strength</h3>
            <Badge variant={sv}>{strength}% Complete</Badge>
          </div>
          <Progress value={strength} variant={sv} size="md" animated />
          {missing.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {missing.slice(0, 3).map(item => (
                <div key={item} className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="text-warning flex items-center"><Icons.Info className="h-3 w-3" /></span> {item}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Tabs */}
        <div>
          <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} variant="underline" />
          <div className="pt-4 space-y-4">

            {/* ── Overview ─────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-text mb-3">About</h3>
                {editing ? (
                  <div className="space-y-3">
                    <Input label="Headline" value={form.headline ?? p.headline ?? ''} onChange={e => set('headline', e.target.value)} placeholder="Full Stack Developer | Open to Work" />
                    <Textarea label="Summary" value={form.summary ?? p.summary ?? ''} onChange={e => set('summary', e.target.value)} rows={4} placeholder="Brief professional summary..." />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Phone"   value={form.phone   ?? p.phone   ?? ''} onChange={e => set('phone',   e.target.value)} />
                      <Input label="City"    value={form.city    ?? p.city    ?? ''} onChange={e => set('city',    e.target.value)} />
                      <Input label="State"   value={form.state   ?? p.state   ?? ''} onChange={e => set('state',   e.target.value)} />
                      <Input label="Country" value={form.country ?? p.country ?? ''} onChange={e => set('country', e.target.value)} />
                    </div>
                    <Button variant="primary" size="sm" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save</Button>
                  </div>
                ) : (
                  <p className="text-body-md text-text-secondary">{p.summary || 'No summary yet. Click Edit Profile to add one.'}</p>
                )}
              </Card>
            )}

            {/* ── Academic ─────────────────────────────────────── */}
            {activeTab === 'academic' && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-text mb-3">Education</h3>
                {editing ? (
                  <div className="space-y-3">
                    <Input label="College Name" value={form.collegeName ?? p.collegeName ?? ''} onChange={e => set('collegeName', e.target.value)} />
                    <Input label="Degree"       value={form.degree       ?? p.degree       ?? ''} onChange={e => set('degree',       e.target.value)} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Passing Year" type="number" value={String(form.passingYear ?? p.passingYear ?? '')} onChange={e => set('passingYear', parseInt(e.target.value))} />
                      <Input label="CGPA" type="number" step="0.01" value={String(form.cgpa ?? p.cgpa ?? '')} onChange={e => set('cgpa', parseFloat(e.target.value))} />
                    </div>
                    <Button variant="primary" size="sm" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save</Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {p.collegeName ? <p className="text-sm font-medium text-text">{p.collegeName}</p> : <p className="text-sm text-text-subtle">No education added yet.</p>}
                    {p.degree && <p className="text-sm text-text-muted">{p.degree}{p.passingYear ? ` · ${p.passingYear}` : ''}</p>}
                    {p.cgpa    && <p className="text-sm text-text-muted">CGPA: {p.cgpa}</p>}
                  </div>
                )}
              </Card>
            )}

            {/* ── Experience ───────────────────────────────────── */}
            {activeTab === 'experience' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text">Work Experience</h3>
                  <Button variant="ghost" size="sm" onClick={() => { startEdit(); setShowExpForm(v => !v) }}>+ Add</Button>
                </div>
                {showExpForm && (
                  <Card className="p-4 space-y-3 bg-primary-50/30 border-primary-200">
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Company"    value={expForm.company}    onChange={e => setExpForm(f => ({ ...f, company:    e.target.value }))} placeholder="Google" />
                      <Input label="Role"       value={expForm.role}       onChange={e => setExpForm(f => ({ ...f, role:       e.target.value }))} placeholder="Software Engineer" />
                      <Input label="Start Date" value={expForm.startDate}  onChange={e => setExpForm(f => ({ ...f, startDate:  e.target.value }))} placeholder="Jan 2023" />
                      <div className="flex items-center gap-2 pt-6">
                        <input type="checkbox" checked={expForm.current} onChange={e => setExpForm(f => ({ ...f, current: e.target.checked }))} className="rounded" />
                        <span className="text-sm text-text-secondary">Currently here</span>
                      </div>
                    </div>
                    <Textarea label="Description" value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Key responsibilities or achievements..." />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setShowExpForm(false)}>Cancel</Button>
                      <Button variant="primary" size="sm" disabled={!expForm.company || !expForm.role} loading={saveMutation.isPending} onClick={() => {
                        set('experience', [...(p.experience ?? []), { ...expForm }])
                        saveMutation.mutate()
                        setShowExpForm(false)
                        setExpForm({ company: '', role: '', startDate: '', current: false, description: '' })
                      }}>Add</Button>
                    </div>
                  </Card>
                )}
                {(p.experience ?? []).length === 0 && !showExpForm && (
                  <Card className="p-8 text-center"><div className="flex justify-center mb-2 text-text-subtle"><Icons.Briefcase className="h-10 w-10" /></div><p className="text-sm text-text-muted">No experience yet.</p></Card>
                )}
                {(p.experience ?? []).map((exp, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-sm font-semibold text-text">{exp.role}</p>
                        <p className="text-xs text-text-muted">{exp.company}{exp.startDate ? ` · ${exp.startDate}` : ''}{exp.current ? ' – Present' : ''}</p>
                        {exp.description && <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{exp.description}</p>}
                      </div>
                      <button onClick={() => { const l = [...(p.experience ?? [])]; l.splice(i, 1); set('experience', l); saveMutation.mutate() }} className="text-xs text-danger shrink-0">Remove</button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* ── Projects ─────────────────────────────────────── */}
            {activeTab === 'projects' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text">Projects</h3>
                  <Button variant="ghost" size="sm" onClick={() => { startEdit(); setShowProjForm(v => !v) }}>+ Add</Button>
                </div>
                {showProjForm && (
                  <Card className="p-4 space-y-3 bg-primary-50/30 border-primary-200">
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Title"              value={projForm.title}       onChange={e => setProjForm(f => ({ ...f, title:       e.target.value }))} placeholder="E-Commerce App" />
                      <Input label="Tech Stack (comma)" value={projForm.technologies} onChange={e => setProjForm(f => ({ ...f, technologies: e.target.value }))} placeholder="React, Node.js" />
                      <Input label="GitHub URL"         value={projForm.githubLink}  onChange={e => setProjForm(f => ({ ...f, githubLink:  e.target.value }))} placeholder="https://github.com/..." />
                      <Input label="Live Link"          value={projForm.liveLink}    onChange={e => setProjForm(f => ({ ...f, liveLink:    e.target.value }))} placeholder="https://..." />
                    </div>
                    <Textarea label="Description" value={projForm.description} onChange={e => setProjForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setShowProjForm(false)}>Cancel</Button>
                      <Button variant="primary" size="sm" disabled={!projForm.title} loading={saveMutation.isPending} onClick={() => {
                        const entry = { ...projForm, technologies: projForm.technologies.split(',').map(t => t.trim()).filter(Boolean) }
                        set('projects', [...(p.projects ?? []), entry])
                        saveMutation.mutate()
                        setShowProjForm(false)
                        setProjForm({ title: '', description: '', technologies: '', githubLink: '', liveLink: '' })
                      }}>Add</Button>
                    </div>
                  </Card>
                )}
                {(p.projects ?? []).length === 0 && !showProjForm && (
                  <Card className="p-8 text-center"><div className="flex justify-center mb-2 text-text-subtle"><Icons.Rocket className="h-10 w-10" /></div><p className="text-sm text-text-muted">No projects yet.</p></Card>
                )}
                {(p.projects ?? []).map((proj, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-text">{proj.title}</p>
                        {proj.technologies && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(Array.isArray(proj.technologies) ? proj.technologies : String(proj.technologies).split(',')).map(t => (
                              <span key={t} className="rounded-full bg-primary-50 border border-primary-200 px-2 py-0.5 text-[10px] text-primary-700">{t.trim()}</span>
                            ))}
                          </div>
                        )}
                        {proj.description && <p className="text-xs text-text-secondary mt-1.5">{proj.description}</p>}
                        <div className="flex gap-3 mt-1.5">
                          {proj.githubLink && <a href={proj.githubLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"><Icons.Code className="h-3 w-3" /> GitHub</a>}
                          {proj.liveLink   && <a href={proj.liveLink}   target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"><Icons.ExternalLink className="h-3 w-3" /> Live</a>}
                        </div>
                      </div>
                      <button onClick={() => { const l = [...(p.projects ?? [])]; l.splice(i, 1); set('projects', l); saveMutation.mutate() }} className="text-xs text-danger shrink-0">Remove</button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* ── Skills ───────────────────────────────────────── */}
            {activeTab === 'skills' && (
              <div className="space-y-4">
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-text">Technical Skills</h3>
                    {!editing && <Button variant="ghost" size="sm" onClick={startEdit}>Edit</Button>}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(editing ? (form.technicalSkills ?? p.technicalSkills ?? []) : (p.technicalSkills ?? [])).map((s, i) => (
                      <span key={s + i} className="flex items-center gap-1 rounded-full bg-primary-50 border border-primary-200 px-2.5 py-0.5 text-xs text-primary-700">
                        {s}
                        {editing && <button onClick={() => { const l = [...(form.technicalSkills ?? p.technicalSkills ?? [])]; l.splice(i, 1); set('technicalSkills', l) }} className="ml-0.5 text-primary-400 hover:text-danger leading-none">×</button>}
                      </span>
                    ))}
                    {(p.technicalSkills ?? []).length === 0 && !editing && <p className="text-sm text-text-subtle">No skills added yet.</p>}
                  </div>
                  {editing && (
                    <div className="flex gap-2">
                      <Input placeholder="Add skill (press Enter)..." value={techSkill} onChange={e => setTechSkill(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && techSkill.trim()) { set('technicalSkills', [...(form.technicalSkills ?? p.technicalSkills ?? []), techSkill.trim()]); setTechSkill('') }}} />
                      <Button variant="outline" size="sm" onClick={() => { if (techSkill.trim()) { set('technicalSkills', [...(form.technicalSkills ?? p.technicalSkills ?? []), techSkill.trim()]); setTechSkill('') }}}>Add</Button>
                      <Button variant="primary" size="sm" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save</Button>
                    </div>
                  )}
                </Card>
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-text mb-3">Soft Skills</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(editing ? (form.softSkills ?? p.softSkills ?? []) : (p.softSkills ?? [])).map((s, i) => (
                      <span key={s + i} className="flex items-center gap-1 rounded-full bg-surface-secondary border border-border px-2.5 py-0.5 text-xs text-text-secondary">
                        {s}
                        {editing && <button onClick={() => { const l = [...(form.softSkills ?? p.softSkills ?? [])]; l.splice(i, 1); set('softSkills', l) }} className="ml-0.5 hover:text-danger leading-none">×</button>}
                      </span>
                    ))}
                    {(p.softSkills ?? []).length === 0 && !editing && <p className="text-sm text-text-subtle">No soft skills added yet.</p>}
                  </div>
                  {editing && (
                    <div className="flex gap-2">
                      <Input placeholder="Add soft skill..." value={softSkill} onChange={e => setSoftSkill(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && softSkill.trim()) { set('softSkills', [...(form.softSkills ?? p.softSkills ?? []), softSkill.trim()]); setSoftSkill('') }}} />
                      <Button variant="outline" size="sm" onClick={() => { if (softSkill.trim()) { set('softSkills', [...(form.softSkills ?? p.softSkills ?? []), softSkill.trim()]); setSoftSkill('') }}}>Add</Button>
                      <Button variant="primary" size="sm" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save</Button>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ── Achievements ─────────────────────────────────── */}
            {activeTab === 'achievements' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text">Certificates & Awards</h3>
                  <Button variant="ghost" size="sm" onClick={() => { startEdit(); setShowAchForm(v => !v) }}>+ Add</Button>
                </div>
                {showAchForm && (
                  <Card className="p-4 space-y-3 bg-primary-50/30 border-primary-200">
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Name"   value={achCertForm.name}   onChange={e => setAchCertForm(f => ({ ...f, name:   e.target.value }))} placeholder="AWS Solutions Architect" />
                      <Input label="Issuer" value={achCertForm.issuer} onChange={e => setAchCertForm(f => ({ ...f, issuer: e.target.value }))} placeholder="Amazon Web Services" />
                      <Input label="Year"  type="number" value={achCertForm.year} onChange={e => setAchCertForm(f => ({ ...f, year: e.target.value }))} placeholder="2024" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setShowAchForm(false)}>Cancel</Button>
                      <Button variant="primary" size="sm" disabled={!achCertForm.name} loading={saveMutation.isPending} onClick={() => {
                        const certs = [...(p.achievements?.certificates ?? []), { ...achCertForm, year: parseInt(achCertForm.year) || new Date().getFullYear() }]
                        set('achievements', { ...(p.achievements ?? {}), certificates: certs })
                        saveMutation.mutate()
                        setShowAchForm(false)
                        setAchCertForm({ name: '', issuer: '', year: '' })
                      }}>Add</Button>
                    </div>
                  </Card>
                )}
                {(p.achievements?.certificates ?? []).length === 0 && !showAchForm && (
                  <Card className="p-8 text-center"><div className="flex justify-center mb-2 text-text-subtle"><Icons.Trophy className="h-10 w-10" /></div><p className="text-sm text-text-muted">No achievements yet.</p></Card>
                )}
                {(p.achievements?.certificates ?? []).map((cert, i) => (
                  <Card key={i} className="p-4 flex justify-between items-center gap-2">
                    <div>
                      <p className="text-sm font-semibold text-text">{cert.name}</p>
                      <p className="text-xs text-text-muted">{cert.issuer} · {cert.year}</p>
                    </div>
                    <button onClick={() => {
                      const certs = [...(p.achievements?.certificates ?? [])]; certs.splice(i, 1)
                      set('achievements', { ...(p.achievements ?? {}), certificates: certs }); saveMutation.mutate()
                    }} className="text-xs text-danger shrink-0">Remove</button>
                  </Card>
                ))}
              </div>
            )}

            {/* ── Social ───────────────────────────────────────── */}
            {activeTab === 'social' && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-text mb-3">Social Links</h3>
                {editing ? (
                  <div className="space-y-3">
                    {(['linkedin', 'github', 'portfolio', 'leetcode', 'codeforces'] as const).map(key => (
                      <Input key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} placeholder={`Your ${key} URL`}
                        value={(form.socialLinks as Record<string,string> ?? {})[key] ?? (p.socialLinks as Record<string,string> ?? {})[key] ?? ''}
                        onChange={e => set('socialLinks', { ...(form.socialLinks ?? p.socialLinks ?? {}), [key]: e.target.value })}
                      />
                    ))}
                    <Button variant="primary" size="sm" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(p.socialLinks ?? {}).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-xs text-text-muted capitalize w-24">{k}</span>
                        <a href={v as string} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline truncate">{v as string}</a>
                      </div>
                    ))}
                    {Object.values(p.socialLinks ?? {}).every(v => !v) && (
                      <p className="text-sm text-text-subtle">No social links added yet.</p>
                    )}
                    {!editing && <Button variant="ghost" size="sm" className="mt-2" onClick={startEdit}>Edit Links</Button>}
                  </div>
                )}
              </Card>
            )}

          </div>
        </div>

        {/* Floating save bar */}
        {editing && (
          <div className="sticky bottom-4 flex justify-center">
            <div className="flex gap-3 bg-surface border border-border rounded-xl shadow-lg px-4 py-3">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button variant="primary" size="sm" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save All Changes</Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

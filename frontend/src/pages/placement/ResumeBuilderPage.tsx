import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import api from '@/services/api'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExperienceItem { id: string; company: string; role: string; duration: string; description: string }
interface EducationItem  { id: string; institution: string; degree: string; year: string; grade: string }
interface ProjectItem    { id: string; name: string; description: string; techStack: string; link: string }

interface ResumeData {
  personal: { name: string; email: string; phone: string; location: string; linkedin: string; github: string }
  summary: string
  experience: ExperienceItem[]
  education: EducationItem[]
  projects: ProjectItem[]
  skills: string
}

export type TemplateId = 'classic' | 'modern' | 'minimal'

const BLANK: ResumeData = {
  personal: { name: '', email: '', phone: '', location: '', linkedin: '', github: '' },
  summary: '', experience: [], education: [], projects: [], skills: '',
}

function uid() { return Math.random().toString(36).slice(2) }

const TABS = [
  { id: 'personal',   label: 'Personal'   },
  { id: 'summary',    label: 'Summary'    },
  { id: 'experience', label: 'Experience' },
  { id: 'education',  label: 'Education'  },
  { id: 'projects',   label: 'Projects'   },
  { id: 'skills',     label: 'Skills'     },
]

const TEMPLATES: { id: TemplateId; label: string; color: string }[] = [
  { id: 'classic', label: 'Classic',  color: '#1e3a8a' },
  { id: 'modern',  label: 'Modern',   color: '#7c3aed' },
  { id: 'minimal', label: 'Minimal',  color: '#111827' },
]

// ─── Template styles (injected into print iframe) ─────────────────────────────
function getTemplateCSS(template: TemplateId): string {
  const accent = template === 'modern' ? '#7c3aed' : template === 'minimal' ? '#111827' : '#1e3a8a'
  const headerBg = template === 'modern' ? `background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:28px 32px;`
    : template === 'minimal' ? 'padding:28px 32px;border-bottom:1px solid #e5e7eb;'
    : 'padding:28px 32px;border-bottom:3px solid #1e3a8a;'

  return `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:10.5pt;color:#222;background:#fff;width:210mm;min-height:297mm;margin:0 auto;padding:0}
    .header{${headerBg}}
    .header h1{font-size:22pt;font-weight:700;letter-spacing:-.3px;${template==='modern'?'color:#fff':''}}
    .header .contact{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:6px;font-size:9pt;${template==='modern'?'color:#ddd6fe':'color:#555'}}
    .header .contact span{display:flex;align-items:center;gap:4px}
    .body{padding:${template==='modern'?'24px 32px':'0 32px 32px'}}
    .section{margin-bottom:18px}
    .section-title{font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${accent};
      margin-bottom:8px;padding-bottom:4px;
      ${template==='minimal'?'border-bottom:1px solid #e5e7eb':'border-bottom:2px solid '+accent}}
    .entry{margin-bottom:10px}
    .entry-header{display:flex;justify-content:space-between;align-items:baseline}
    .entry-title{font-weight:600;font-size:10.5pt}
    .entry-date{font-size:9pt;color:#888}
    .entry-sub{font-size:9.5pt;color:#666;font-style:italic;margin-top:1px}
    .entry-desc{font-size:9.5pt;color:#444;margin-top:3px;line-height:1.5}
    .skills-wrap{display:flex;flex-wrap:wrap;gap:5px}
    .skill{background:${template==='modern'?'#f5f3ff':template==='minimal'?'#f3f4f6':'#eff6ff'};
      color:${accent};border:1px solid ${template==='modern'?'#ddd6fe':template==='minimal'?'#e5e7eb':'#bfdbfe'};
      border-radius:999px;padding:2px 10px;font-size:9pt;font-weight:500}
    .summary-text{font-size:9.5pt;color:#444;line-height:1.6}
    @page{size:A4;margin:0}
    @media print{body{width:210mm;margin:0}html{height:297mm}}
  `
}

// ─── Build printable HTML ──────────────────────────────────────────────────────
function buildPrintHTML(data: ResumeData, template: TemplateId): string {
  const { personal: p, summary, experience, education, projects, skills } = data
  const skillList = skills.split(',').map(s => s.trim()).filter(Boolean)

  const contactParts = [
    p.email    && `<span>${p.email}</span>`,
    p.phone    && `<span>${p.phone}</span>`,
    p.location && `<span>${p.location}</span>`,
    p.linkedin && `<span>${p.linkedin}</span>`,
    p.github   && `<span>${p.github}</span>`,
  ].filter(Boolean).join('')

  const expHTML = experience.length > 0 ? `
    <div class="section">
      <div class="section-title">Experience</div>
      ${experience.map(e => `
        <div class="entry">
          <div class="entry-header">
            <span class="entry-title">${e.role || ''}</span>
            <span class="entry-date">${e.duration || ''}</span>
          </div>
          <div class="entry-sub">${e.company || ''}</div>
          ${e.description ? `<div class="entry-desc">${e.description}</div>` : ''}
        </div>`).join('')}
    </div>` : ''

  const eduHTML = education.length > 0 ? `
    <div class="section">
      <div class="section-title">Education</div>
      ${education.map(e => `
        <div class="entry">
          <div class="entry-header">
            <span class="entry-title">${e.degree || ''}</span>
            <span class="entry-date">${e.year || ''}</span>
          </div>
          <div class="entry-sub">${e.institution || ''}${e.grade ? ' · ' + e.grade : ''}</div>
        </div>`).join('')}
    </div>` : ''

  const projHTML = projects.length > 0 ? `
    <div class="section">
      <div class="section-title">Projects</div>
      ${projects.map(p => `
        <div class="entry">
          <div class="entry-header">
            <span class="entry-title">${p.name || ''}</span>
            ${p.link ? `<span class="entry-date">${p.link}</span>` : ''}
          </div>
          ${p.techStack ? `<div class="entry-sub">${p.techStack}</div>` : ''}
          ${p.description ? `<div class="entry-desc">${p.description}</div>` : ''}
        </div>`).join('')}
    </div>` : ''

  const skillHTML = skillList.length > 0 ? `
    <div class="section">
      <div class="section-title">Skills</div>
      <div class="skills-wrap">${skillList.map(s => `<span class="skill">${s}</span>`).join('')}</div>
    </div>` : ''

  const summaryHTML = summary ? `
    <div class="section">
      <div class="section-title">Summary</div>
      <div class="summary-text">${summary}</div>
    </div>` : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>${p.name || 'Resume'}</title>
    <style>${getTemplateCSS(template)}</style>
  </head><body>
    <div class="header">
      <h1>${p.name || 'Your Name'}</h1>
      <div class="contact">${contactParts}</div>
    </div>
    <div class="body">
      ${summaryHTML}${expHTML}${eduHTML}${projHTML}${skillHTML}
    </div>
  </body></html>`
}

// ─── Print-to-PDF ──────────────────────────────────────────────────────────────
function printResume(data: ResumeData, template: TemplateId) {
  const html = buildPrintHTML(data, template)
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document
  if (!doc) { toast.error('PDF generation failed'); return }
  doc.open(); doc.write(html); doc.close()
  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => document.body.removeChild(iframe), 2000)
  }, 400)
}

// ─── Live Preview (mirrors the print output) ──────────────────────────────────
function ResumePreview({ data, template }: { data: ResumeData; template: TemplateId }) {
  const { personal: p, summary, experience, education, projects, skills } = data
  const skillList = skills.split(',').map(s => s.trim()).filter(Boolean)
  const accent = template === 'modern' ? '#7c3aed' : template === 'minimal' ? '#111827' : '#1e3a8a'

  const headerStyle: React.CSSProperties =
    template === 'modern'
      ? { background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', padding: '22px 24px' }
      : template === 'minimal'
      ? { padding: '22px 24px', borderBottom: '1px solid #e5e7eb' }
      : { padding: '22px 24px', borderBottom: `3px solid ${accent}` }

  const SectionTitle = ({ children }: { children: string }) => (
    <h2 style={{
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2,
      color: accent, borderBottom: template === 'minimal' ? '1px solid #e5e7eb' : `2px solid ${accent}`,
      paddingBottom: 3, marginBottom: 8,
    }}>{children}</h2>
  )

  return (
    <div style={{ fontFamily: "'Segoe UI',Arial,sans-serif", fontSize: 10, lineHeight: 1.5, color: '#222', background: '#fff', minHeight: '100%' }}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: template === 'modern' ? '#fff' : '#111', marginBottom: 4 }}>
          {p.name || 'Your Name'}
        </h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 9, color: template === 'modern' ? '#ddd6fe' : '#666' }}>
          {p.email    && <span>{p.email}</span>}
          {p.phone    && <span>{p.phone}</span>}
          {p.location && <span>{p.location}</span>}
          {p.linkedin && <span>{p.linkedin}</span>}
          {p.github   && <span>{p.github}</span>}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: template === 'modern' ? '16px 24px' : '0 24px 24px' }}>
        {/* Summary */}
        {summary && (
          <div style={{ marginBottom: 14 }}>
            <SectionTitle>Summary</SectionTitle>
            <p style={{ fontSize: 9.5, color: '#444', lineHeight: 1.6 }}>{summary}</p>
          </div>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <SectionTitle>Experience</SectionTitle>
            {experience.map(e => (
              <div key={e.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 10 }}>{e.role}</span>
                  <span style={{ fontSize: 9, color: '#888' }}>{e.duration}</span>
                </div>
                <div style={{ fontSize: 9.5, color: '#666', fontStyle: 'italic' }}>{e.company}</div>
                {e.description && <p style={{ fontSize: 9.5, color: '#444', marginTop: 2 }}>{e.description}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {education.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <SectionTitle>Education</SectionTitle>
            {education.map(e => (
              <div key={e.id} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 10 }}>{e.degree}</span>
                  <span style={{ fontSize: 9, color: '#888' }}>{e.year}</span>
                </div>
                <div style={{ fontSize: 9.5, color: '#666' }}>{e.institution}{e.grade ? ` · ${e.grade}` : ''}</div>
              </div>
            ))}
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <SectionTitle>Projects</SectionTitle>
            {projects.map(proj => (
              <div key={proj.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 10 }}>{proj.name}</span>
                  {proj.link && <span style={{ fontSize: 9, color: '#888' }}>{proj.link}</span>}
                </div>
                {proj.techStack && <div style={{ fontSize: 9.5, color: '#666', fontStyle: 'italic' }}>{proj.techStack}</div>}
                {proj.description && <p style={{ fontSize: 9.5, color: '#444', marginTop: 2 }}>{proj.description}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {skillList.length > 0 && (
          <div>
            <SectionTitle>Skills</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {skillList.map(s => (
                <span key={s} style={{
                  background: template === 'modern' ? '#f5f3ff' : template === 'minimal' ? '#f3f4f6' : '#eff6ff',
                  color: accent, border: `1px solid ${template === 'modern' ? '#ddd6fe' : template === 'minimal' ? '#e5e7eb' : '#bfdbfe'}`,
                  borderRadius: 999, padding: '1px 8px', fontSize: 9, fontWeight: 500,
                }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Empty placeholder */}
        {!summary && experience.length === 0 && education.length === 0 && skillList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa', fontSize: 11 }}>
            Fill in the form to preview your resume
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ResumeBuilderPage() {
  const { user, loading } = useRequireAuth()
  const [activeTab, setActiveTab] = useState('personal')
  const [resume, setResume] = useState<ResumeData>(BLANK)
  const [template, setTemplate] = useState<TemplateId>('classic')
  const [expForm, setExpForm]   = useState({ company: '', role: '', duration: '', description: '' })
  const [eduForm, setEduForm]   = useState({ institution: '', degree: '', year: '', grade: '' })
  const [projForm, setProjForm] = useState({ name: '', description: '', techStack: '', link: '' })
  const [showExpForm,  setShowExpForm]  = useState(false)
  const [showEduForm,  setShowEduForm]  = useState(false)
  const [showProjForm, setShowProjForm] = useState(false)
  const [genLoading, setGenLoading] = useState(false)

  useQuery({
    queryKey: ['resume-builder'],
    queryFn: async () => {
      const res = await api.get<{ data: Record<string, unknown> }>('/placement/resume-builder')
      const d = res.data.data as {
        personalInfo?: { name?: string; email?: string; phone?: string; location?: string; linkedin?: string; github?: string }
        summary?: string
        experience?: Array<{ title?: string; company?: string; duration?: string; description?: string }>
        education?: Array<{ institution?: string; degree?: string; year?: string; gpa?: string }>
        projects?: Array<{ name?: string; description?: string; techStack?: string[]; link?: string }>
        skills?: string[]
      }
      if (!d || Object.keys(d).length === 0) return d
      setResume({
        personal: { name: d.personalInfo?.name ?? '', email: d.personalInfo?.email ?? '', phone: d.personalInfo?.phone ?? '', location: d.personalInfo?.location ?? '', linkedin: d.personalInfo?.linkedin ?? '', github: d.personalInfo?.github ?? '' },
        summary: d.summary ?? '',
        experience: (d.experience ?? []).map(e => ({ id: uid(), company: e.company ?? '', role: e.title ?? '', duration: e.duration ?? '', description: e.description ?? '' })),
        education:  (d.education  ?? []).map(e => ({ id: uid(), institution: e.institution ?? '', degree: e.degree ?? '', year: e.year ?? '', grade: e.gpa ?? '' })),
        projects:   (d.projects   ?? []).map(p => ({ id: uid(), name: p.name ?? '', description: p.description ?? '', techStack: (p.techStack ?? []).join(', '), link: p.link ?? '' })),
        skills: (d.skills ?? []).join(', '),
      })
      return d
    },
    enabled: !!user,
  })

  const saveMutation = useMutation({
    mutationFn: () => api.post('/placement/resume-builder', {
      personalInfo: { ...resume.personal },
      summary: resume.summary,
      experience: resume.experience.map(e => ({ title: e.role, company: e.company, duration: e.duration, description: e.description })),
      education:  resume.education.map(e => ({ institution: e.institution, degree: e.degree, year: e.year, gpa: e.grade })),
      projects:   resume.projects.map(p => ({ name: p.name, description: p.description, techStack: p.techStack.split(',').map(t => t.trim()), link: p.link })),
      skills: resume.skills.split(',').map(s => s.trim()).filter(Boolean),
    }),
    onSuccess: () => toast.success('Resume saved!'),
    onError: () => toast.error('Failed to save'),
  })

  async function handleExport() {
    await saveMutation.mutateAsync().catch(() => {})
    printResume(resume, template)
    toast.success('Print dialog opened — save as PDF')
  }

  async function handleGenerateSummary() {
    setGenLoading(true)
    try {
      const res = await api.post<{ data: { summary: string } }>('/ai/generate-summary', {
        role: resume.experience[0]?.role ?? 'Software Engineer', skills: resume.skills,
      })
      setResume(r => ({ ...r, summary: res.data.data.summary }))
      toast.success('Summary generated!')
    } catch { toast.error('Failed to generate summary') }
    finally { setGenLoading(false) }
  }

  if (loading || !user) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
    </div>
  )

  const p = resume.personal

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
          <div className="page-header mb-0">
            <h1 className="page-title">Resume Builder</h1>
            <p className="page-desc">Build, preview, and export a pixel-perfect PDF</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>Save</Button>
            <Button variant="primary" size="sm" onClick={handleExport}>⬇ Export PDF</Button>
          </div>
        </motion.div>

        {/* Template selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Template:</span>
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setTemplate(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium border transition-all ${
                template === t.id ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm' : 'border-border text-text-muted hover:bg-surface-secondary'
              }`}>
              <span className="h-3 w-3 rounded-full shrink-0" style={{ background: t.color }} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Form tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                activeTab === t.id ? 'bg-primary-600 text-white shadow-sm' : 'border border-border bg-surface text-text-muted hover:bg-surface-secondary'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* LEFT — Form */}
          <Card className="p-5 space-y-4 overflow-y-auto max-h-[calc(100vh-260px)]">

            {activeTab === 'personal' && (
              <>
                <h2 className="text-sm font-semibold text-text">Personal Information</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input label="Full Name"  value={p.name}     onChange={e => setResume(r => ({ ...r, personal: { ...r.personal, name: e.target.value } }))}     placeholder="John Doe" />
                  <Input label="Email"      value={p.email}    onChange={e => setResume(r => ({ ...r, personal: { ...r.personal, email: e.target.value } }))}    placeholder="john@example.com" />
                  <Input label="Phone"      value={p.phone}    onChange={e => setResume(r => ({ ...r, personal: { ...r.personal, phone: e.target.value } }))}    placeholder="+91 9876543210" />
                  <Input label="Location"   value={p.location} onChange={e => setResume(r => ({ ...r, personal: { ...r.personal, location: e.target.value } }))} placeholder="Mumbai, India" />
                  <Input label="LinkedIn"   value={p.linkedin} onChange={e => setResume(r => ({ ...r, personal: { ...r.personal, linkedin: e.target.value } }))} placeholder="linkedin.com/in/johndoe" />
                  <Input label="GitHub"     value={p.github}   onChange={e => setResume(r => ({ ...r, personal: { ...r.personal, github: e.target.value } }))}   placeholder="github.com/johndoe" />
                </div>
              </>
            )}

            {activeTab === 'summary' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-text">Professional Summary</h2>
                  <Button variant="ghost" size="sm" loading={genLoading} onClick={handleGenerateSummary}>✨ Generate with AI</Button>
                </div>
                <Textarea placeholder="A results-driven software engineer..." value={resume.summary} onChange={e => setResume(r => ({ ...r, summary: e.target.value }))} rows={8} />
              </>
            )}

            {activeTab === 'experience' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-text">Experience</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowExpForm(v => !v)}>+ Add</Button>
                </div>
                {showExpForm && (
                  <div className="rounded-xl border border-border p-4 space-y-3 bg-surface-secondary">
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Company"  value={expForm.company}  onChange={e => setExpForm(f => ({ ...f, company: e.target.value }))}  placeholder="TCS" />
                      <Input label="Role"     value={expForm.role}     onChange={e => setExpForm(f => ({ ...f, role: e.target.value }))}     placeholder="Software Engineer" />
                      <Input label="Duration" value={expForm.duration} onChange={e => setExpForm(f => ({ ...f, duration: e.target.value }))} placeholder="Jan 2023 – Present" />
                    </div>
                    <Textarea label="Description" value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setShowExpForm(false)}>Cancel</Button>
                      <Button variant="primary" size="sm" disabled={!expForm.company || !expForm.role} onClick={() => {
                        setResume(r => ({ ...r, experience: [...r.experience, { ...expForm, id: uid() }] }))
                        setExpForm({ company: '', role: '', duration: '', description: '' }); setShowExpForm(false)
                      }}>Add</Button>
                    </div>
                  </div>
                )}
                {resume.experience.map(exp => (
                  <div key={exp.id} className="rounded-xl border border-border p-3 flex justify-between gap-2">
                    <div><p className="text-sm font-medium text-text">{exp.role} @ {exp.company}</p><p className="text-xs text-text-muted">{exp.duration}</p></div>
                    <button onClick={() => setResume(r => ({ ...r, experience: r.experience.filter(e => e.id !== exp.id) }))} className="text-xs text-red-400 hover:text-red-600 shrink-0">✕</button>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'education' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-text">Education</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowEduForm(v => !v)}>+ Add</Button>
                </div>
                {showEduForm && (
                  <div className="rounded-xl border border-border p-4 space-y-3 bg-surface-secondary">
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Institution" value={eduForm.institution} onChange={e => setEduForm(f => ({ ...f, institution: e.target.value }))} placeholder="IIT Bombay" />
                      <Input label="Degree"      value={eduForm.degree}      onChange={e => setEduForm(f => ({ ...f, degree: e.target.value }))}      placeholder="B.E. Computer Science" />
                      <Input label="Year"        value={eduForm.year}        onChange={e => setEduForm(f => ({ ...f, year: e.target.value }))}        placeholder="2020–2024" />
                      <Input label="Grade/CGPA"  value={eduForm.grade}       onChange={e => setEduForm(f => ({ ...f, grade: e.target.value }))}       placeholder="8.5 CGPA" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setShowEduForm(false)}>Cancel</Button>
                      <Button variant="primary" size="sm" disabled={!eduForm.institution || !eduForm.degree} onClick={() => {
                        setResume(r => ({ ...r, education: [...r.education, { ...eduForm, id: uid() }] }))
                        setEduForm({ institution: '', degree: '', year: '', grade: '' }); setShowEduForm(false)
                      }}>Add</Button>
                    </div>
                  </div>
                )}
                {resume.education.map(edu => (
                  <div key={edu.id} className="rounded-xl border border-border p-3 flex justify-between gap-2">
                    <div><p className="text-sm font-medium text-text">{edu.degree}</p><p className="text-xs text-text-muted">{edu.institution} · {edu.year}</p></div>
                    <button onClick={() => setResume(r => ({ ...r, education: r.education.filter(e => e.id !== edu.id) }))} className="text-xs text-red-400 hover:text-red-600 shrink-0">✕</button>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'projects' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-text">Projects</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowProjForm(v => !v)}>+ Add</Button>
                </div>
                {showProjForm && (
                  <div className="rounded-xl border border-border p-4 space-y-3 bg-surface-secondary">
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Project Name" value={projForm.name}       onChange={e => setProjForm(f => ({ ...f, name: e.target.value }))}       placeholder="E-Commerce App" />
                      <Input label="Tech Stack"   value={projForm.techStack}  onChange={e => setProjForm(f => ({ ...f, techStack: e.target.value }))}  placeholder="React, Node.js" />
                      <Input label="Link"         value={projForm.link}       onChange={e => setProjForm(f => ({ ...f, link: e.target.value }))}       placeholder="github.com/..." className="col-span-2" />
                    </div>
                    <Textarea label="Description" value={projForm.description} onChange={e => setProjForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setShowProjForm(false)}>Cancel</Button>
                      <Button variant="primary" size="sm" disabled={!projForm.name} onClick={() => {
                        setResume(r => ({ ...r, projects: [...r.projects, { ...projForm, id: uid() }] }))
                        setProjForm({ name: '', description: '', techStack: '', link: '' }); setShowProjForm(false)
                      }}>Add</Button>
                    </div>
                  </div>
                )}
                {resume.projects.map(proj => (
                  <div key={proj.id} className="rounded-xl border border-border p-3 flex justify-between gap-2">
                    <div><p className="text-sm font-medium text-text">{proj.name}</p><p className="text-xs text-text-muted">{proj.techStack}</p></div>
                    <button onClick={() => setResume(r => ({ ...r, projects: r.projects.filter(p => p.id !== proj.id) }))} className="text-xs text-red-400 hover:text-red-600 shrink-0">✕</button>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'skills' && (
              <>
                <h2 className="text-sm font-semibold text-text">Skills</h2>
                <Textarea label="Skills (comma-separated)" value={resume.skills} onChange={e => setResume(r => ({ ...r, skills: e.target.value }))} placeholder="React, Node.js, Python..." rows={4} />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {resume.skills.split(',').map(s => s.trim()).filter(Boolean).map(skill => (
                    <span key={skill} className="rounded-full bg-primary-50 border border-primary-200 px-2.5 py-0.5 text-xs text-primary-700">{skill}</span>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* RIGHT — Live Preview */}
          <div className="rounded-2xl border border-border overflow-hidden max-h-[calc(100vh-260px)] overflow-y-auto bg-surface-secondary">
            <div className="bg-surface-secondary px-4 py-2 text-xs font-medium text-text-muted border-b border-border flex items-center justify-between">
              <span>Live Preview — matches exported PDF</span>
              <span className="text-[10px] text-text-subtle capitalize">{template} template</span>
            </div>
            <div className="p-4">
              <div className="shadow-xl rounded-sm overflow-hidden" style={{ background: '#fff' }}>
                <ResumePreview data={resume} template={template} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

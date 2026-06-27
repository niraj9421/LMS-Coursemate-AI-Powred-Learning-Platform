import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface Certificate {
  _id: string; uniqueId: string; courseName: string; studentName: string
  instructorName: string; issuedAt: string; pdfUrl: string
}

async function downloadCertificate(pdfUrl: string, courseName: string) {
  try {
    // Fetch the PDF as a blob so the browser always downloads it (not opens raw URL)
    const response = await fetch(pdfUrl)
    if (!response.ok) throw new Error('Download failed')
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `${courseName.replace(/[^a-z0-9]/gi, '_')}_Certificate.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
  } catch {
    toast.error('Download failed — try opening the PDF URL directly')
  }
}

export default function MyCertificatesPage() {
  const { user, loading } = useRequireAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: async () => {
      const res = await api.get<{ data: Certificate[] }>('/users/me/certificates')
      return res.data.data
    },
    enabled: !!user,
  })

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center bg-surface"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        <div className="page-header">
          <h1 className="page-title">My Certificates</h1>
          <p className="page-desc">Your earned certificates</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton.Card key={i} />)}
          </div>
        ) : (data ?? []).length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-5xl mb-3">🏆</div>
            <h3 className="text-heading-sm text-text mb-2">No certificates yet</h3>
            <p className="text-body-md text-text-muted">Complete a course to earn your first certificate!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(data ?? []).map((cert, i) => (
              <motion.div key={cert._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="p-5 flex flex-col gap-4 hover:shadow-lg transition-shadow group">
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center text-3xl shadow-sm">🏆</div>
                    <Badge variant="success">✓ Verified</Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text line-clamp-2 mb-1">{cert.courseName}</h3>
                    <p className="text-xs text-text-muted">by {cert.instructorName}</p>
                    <p className="text-xs text-text-subtle mt-1">{new Date(cert.issuedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-border">
                    <Button variant="primary" size="sm" className="flex-1"
                      onClick={() => downloadCertificate(cert.pdfUrl, cert.courseName)}>
                      ⬇ Download PDF
                    </Button>
                    <a href={`/certificates/verify/${cert.uniqueId}`} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-secondary transition-colors">
                      🔗 Verify
                    </a>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

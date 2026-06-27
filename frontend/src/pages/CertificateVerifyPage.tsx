import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '@/services/api'
import { Navbar } from '@/components/layout/Navbar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function CertificateVerifyPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['verify-cert', id],
    queryFn: async () => {
      const res = await api.get<{ data: { uniqueId: string; studentName: string; courseName: string; instructorName: string; issuedAt: string } }>(`/certificates/verify/${id}`)
      return res.data.data
    },
  })

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="container-app flex items-center justify-center min-h-[80vh]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="p-8 text-center">
            {isLoading && <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent mx-auto" />}

            {isError && (
              <><div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <h2 className="text-heading-md text-text mb-2">Certificate Not Found</h2>
              <p className="text-body-md text-text-muted">This certificate ID is invalid or does not exist.</p></>
            )}

            {data && (
              <><div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🏆</span>
              </div>
              <Badge variant="success" className="mb-4">✓ Verified Certificate</Badge>
              <h2 className="text-heading-lg text-text mb-6">Certificate of Completion</h2>
              <div className="space-y-3 text-left rounded-xl border border-border bg-surface-secondary p-5">
                {[
                  { label: 'Student', value: data.studentName },
                  { label: 'Course', value: data.courseName },
                  { label: 'Instructor', value: data.instructorName },
                  { label: 'Issued On', value: new Date(data.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
                  { label: 'Certificate ID', value: data.uniqueId, mono: true },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className="text-xs text-text-muted w-24 shrink-0 mt-0.5">{item.label}</span>
                    <span className={`text-sm font-medium text-text ${item.mono ? 'font-mono text-xs' : ''}`}>{item.value}</span>
                  </div>
                ))}
              </div></>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

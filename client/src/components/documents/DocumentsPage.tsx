import { useRef, useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card, CardHeader, Button, SearchInput, Select, Modal, Badge, Table, Th, Td, EmptyState, Skeleton } from '@/components/ui'
import { fetchDocuments, createDocument, deleteDocument, downloadDocument, type DocItem } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { formatDate } from '@/lib/utils'

const TYPES = ['Contract', 'Policy', 'Payslip', 'ID', 'Other'] as const

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mime?: string) {
  if (!mime) return '📄'
  if (mime.startsWith('image/')) return '🖼️'
  if (mime === 'application/pdf') return '📕'
  if (mime.includes('word') || mime.includes('document')) return '📝'
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return '📊'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '📊'
  if (mime.startsWith('text/')) return '📃'
  return '📄'
}

export function DocumentsPage() {
  const qc = useQueryClient()
  const canWrite = can(useAuth((s) => s.user?.role), 'documents.write')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [addOpen, setAddOpen] = useState(false)
  const [target, setTarget] = useState<DocItem | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['documents'], queryFn: fetchDocuments })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['documents'] })

  const createMut = useMutation({
    mutationFn: createDocument,
    onSuccess: () => { toast.success('Document uploaded'); invalidate(); setAddOpen(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const delMut = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => { toast.success('Document deleted'); invalidate(); setTarget(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const docs = data ?? []
  const filtered = useMemo(() => docs.filter(d =>
    (typeFilter === 'All' || d.type === typeFilter) &&
    d.name.toLowerCase().includes(search.toLowerCase())
  ), [docs, search, typeFilter])

  async function handleDownload(doc: DocItem) {
    setDownloading(doc.id)
    try {
      await downloadDocument(doc.id, doc.name)
      toast.success('Download started')
    } catch {
      toast.error('Download failed — no file attached')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search documents..." className="w-64" />
        <Select
          value={typeFilter}
          onChange={setTypeFilter}
          className="w-40"
          options={[{ value: 'All', label: 'All types' }, ...TYPES.map(t => ({ value: t, label: t }))]}
        />
        {canWrite && (
          <Button variant="primary" size="sm" className="ml-auto" onClick={() => setAddOpen(true)}>
            + Upload Document
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-display font-semibold text-white text-sm">Documents ({filtered.length})</h3>
        </CardHeader>
        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="📄"
            title="No documents"
            description={canWrite ? 'Upload a document to get started.' : 'No documents available.'}
          />
        ) : (
          <Table>
            <thead>
              <tr><Th>Name</Th><Th>Type</Th><Th>Owner</Th><Th>Size</Th><Th>Updated</Th><Th /></tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-white/2 transition-colors group">
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{fileIcon(d.file_mime)}</span>
                      <span className="text-white font-medium">{d.name}</span>
                    </div>
                  </Td>
                  <Td><Badge status="open">{d.type}</Badge></Td>
                  <Td>{d.owner}</Td>
                  <Td className="font-mono text-xs">{d.size}</Td>
                  <Td>{formatDate(d.updated_at)}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs py-1 px-2"
                        loading={downloading === d.id}
                        onClick={() => handleDownload(d)}
                      >
                        ↓ Download
                      </Button>
                      {canWrite && (
                        <Button size="sm" variant="danger" className="text-xs py-1 px-2" onClick={() => setTarget(d)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {canWrite && (
        <UploadModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          saving={createMut.isPending}
          onSubmit={(payload) => createMut.mutate(payload)}
        />
      )}

      <Modal open={!!target} onClose={() => setTarget(null)} title="Delete document" size="sm">
        <p className="text-sm text-slate-300">
          Delete <span className="text-white font-medium">{target?.name}</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={delMut.isPending} onClick={() => target && delMut.mutate(target.id)}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
interface UploadPayload { name: string; type: string; file_data?: string; file_mime?: string; size?: string }

function UploadModal({
  open, onClose, saving, onSubmit,
}: {
  open: boolean
  onClose: () => void
  saving: boolean
  onSubmit: (p: UploadPayload) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<string>('Policy')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function reset() {
    setName('')
    setType('Policy')
    setFile(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleFileChange(f: File) {
    setFile(f)
    if (!name.trim()) setName(f.name)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileChange(f)
  }

  function handleSubmit() {
    if (!name.trim()) return toast.error('Enter a document name')
    if (!file) return toast.error('Please select a file to upload')

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      // dataUrl = "data:<mime>;base64,<data>"
      const base64 = dataUrl.split(',')[1]
      onSubmit({
        name: name.trim(),
        type,
        file_data: base64,
        file_mime: file.type || 'application/octet-stream',
        size: formatBytes(file.size),
      })
    }
    reader.onerror = () => toast.error('Failed to read file')
    reader.readAsDataURL(file)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Upload Document" size="md">
      <div className="flex flex-col gap-4">
        {/* Drop zone */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-brand-500 bg-brand-500/10'
              : file
              ? 'border-teal-500/50 bg-teal-500/5'
              : 'border-white/10 hover:border-white/25 bg-white/[0.02]'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">{fileIcon(file.type)}</span>
              <div className="text-left">
                <p className="text-sm font-medium text-white">{file.name}</p>
                <p className="text-xs text-slate-400">{formatBytes(file.size)} · {file.type || 'unknown type'}</p>
              </div>
              <button
                className="ml-auto text-slate-500 hover:text-red-400 transition-colors p-1"
                onClick={e => { e.stopPropagation(); setFile(null); setName('') }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ) : (
            <>
              <svg className="w-8 h-8 mx-auto mb-2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p className="text-sm text-slate-400">
                <span className="text-brand-400 font-medium">Click to browse</span> or drag & drop
              </p>
              <p className="text-xs text-slate-600 mt-1">PDF, Word, Excel, images, and more</p>
            </>
          )}
        </div>

        {/* Name input */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Document Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. NDA — Vendor X.pdf"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Type select */}
        <Select
          label="Type"
          value={type}
          onChange={setType}
          options={TYPES.map(t => ({ value: t, label: t }))}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={handleSubmit}>
            Upload
          </Button>
        </div>
      </div>
    </Modal>
  )
}

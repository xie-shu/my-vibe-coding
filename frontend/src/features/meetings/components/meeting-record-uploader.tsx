import { useState, type DragEvent } from 'react'
import { FileText, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MeetingRecordUploaderProps {
  onFileSelect: (file: File | null) => void
  selectedFile: File | null
  uploadProgress?: number
  isUploading?: boolean
}

const ACCEPTED_TYPES = '.txt,.md,.docx,.pdf'

export function MeetingRecordUploader({
  onFileSelect,
  selectedFile,
  uploadProgress,
  isUploading,
}: MeetingRecordUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)

  const selectFirstFile = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onFileSelect(file)
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    selectFirstFile(event.dataTransfer.files)
  }

  if (selectedFile) {
    return (
      <div className="rounded-md border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          {!isUploading && (
            <Button variant="ghost" size="icon" aria-label="移除会议记录" onClick={() => onFileSelect(null)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {isUploading && uploadProgress !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>正在上传会议记录</span><span>{uploadProgress}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <label
      onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
      onDragLeave={(event) => { event.preventDefault(); setIsDragging(false) }}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-5 py-10 text-center transition-colors',
        isDragging ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50 hover:bg-accent/40',
      )}
    >
      <UploadCloud className="h-9 w-9 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">上传腾讯会议文字记录</p>
      <p className="mt-1 text-xs text-muted-foreground">支持 TXT、Markdown、Word 和 PDF</p>
      <input type="file" accept={ACCEPTED_TYPES} className="hidden" onChange={(event) => selectFirstFile(event.target.files)} />
    </label>
  )
}

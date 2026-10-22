'use client'

/**
 * Custom PDF viewer (PDF.js). Replaces the browser's built-in viewer so:
 *  - the frame takes the PDF's real page shape (reported via onLoad)
 *  - there's no browser toolbar/grey chrome; it looks like the images
 *  - it works the same everywhere (incl. iPhone, where <iframe> PDFs barely work)
 *
 * One page at a time. The Carousel owns the current page and the click/keys.
 */
import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

type Props = {
  url: string
  page: number // 1-based
  onLoad: (info: { aspect: number; pages: number }) => void
}

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      // copied to /public by the `postinstall` script in package.json
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      return pdfjs
    })
  }
  return pdfjsPromise
}

export function PdfViewer({ url, page, onLoad }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState(false)
  const [width, setWidth] = useState(0)
  const onLoadRef = useRef(onLoad)
  onLoadRef.current = onLoad

  // load document, report first page's aspect ratio + page count
  useEffect(() => {
    let cancelled = false
    let task: { destroy: () => Promise<void> } | null = null
    setDoc(null)
    setError(false)
    loadPdfjs()
      .then((pdfjs) => {
        const t = pdfjs.getDocument({ url })
        task = t
        return t.promise
      })
      .then(async (d) => {
        if (cancelled) return
        const first = await d.getPage(1)
        const vp = first.getViewport({ scale: 1 })
        onLoadRef.current({ aspect: vp.width / vp.height, pages: d.numPages })
        setDoc(d)
      })
      .catch((err) => {
        console.error('[pdf]', err)
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
      task?.destroy()
    }
  }, [url])

  // track the box width so pages render sharp at any size
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // render current page
  useEffect(() => {
    if (!doc || !width || !canvasRef.current) return
    let task: { cancel: () => void; promise: Promise<void> } | null = null
    let cancelled = false
    doc.getPage(Math.min(Math.max(page, 1), doc.numPages)).then((p) => {
      if (cancelled || !canvasRef.current) return
      const base = p.getViewport({ scale: 1 })
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      const vp = p.getViewport({ scale: (width / base.width) * dpr })
      const canvas = canvasRef.current
      canvas.width = Math.floor(vp.width)
      canvas.height = Math.floor(vp.height)
      task = p.render({ canvas, viewport: vp })
      task.promise.catch(() => {}) // cancelled renders reject; ignore
    })
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [doc, page, width])

  return (
    <div ref={wrapRef} className="pdf">
      {error ? (
        <a className="pdf__fallback" href={url} target="_blank" rel="noreferrer">
          Open PDF ↗
        </a>
      ) : (
        <canvas ref={canvasRef} className="pdf__page" />
      )}
    </div>
  )
}

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { Modal } from './ui'

const FeedbackContext = createContext(null)

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const idRef = useRef(0)

  const toast = useCallback((message, type = 'success') => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setDialog({ ...options, resolve })
      }),
    [],
  )

  const close = (result) => {
    dialog?.resolve(result)
    setDialog(null)
  }

  const icons = { success: CheckCircle2, error: XCircle, info: Info }
  const tones = { success: 'text-emerald-600', error: 'text-red-600', info: 'text-sky-600' }

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.type]
          return (
            <div key={t.id} className="pointer-events-auto flex max-w-md animate-rise items-center gap-3 rounded-2xl bg-cocoa-900 px-4 py-3 text-sm text-white shadow-soft">
              <Icon className={`h-5 w-5 shrink-0 ${tones[t.type]}`} />
              {t.message}
            </div>
          )
        })}
      </div>
      <Modal
        open={Boolean(dialog)}
        onClose={() => close(false)}
        title={dialog?.title || 'Are you sure?'}
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => close(false)}>
              {dialog?.cancelLabel || 'Go back'}
            </button>
            <button className={dialog?.danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={() => close(true)}>
              {dialog?.confirmLabel || 'Yes, continue'}
            </button>
          </>
        }
      >
        <p className="text-sm text-cocoa-600">{dialog?.message}</p>
      </Modal>
    </FeedbackContext.Provider>
  )
}

export const useFeedback = () => useContext(FeedbackContext)

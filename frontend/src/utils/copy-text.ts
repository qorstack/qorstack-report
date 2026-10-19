/**
 * Copies text to the clipboard, also on plain-HTTP pages.
 *
 * `navigator.clipboard` exists only in secure contexts (https:// or localhost). Self-hosted installs opened as
 * http://<ip>:<port> (a Kubernetes NodePort, an intranet IP) get `undefined` there, so every copy button failed
 * silently. Falls back to a hidden textarea + `document.execCommand('copy')`, which still works on http.
 * The textarea goes inside the open dialog when there is one: a modal's focus trap would otherwise steal the
 * selection.
 */
export const copyText = async (text: string): Promise<boolean> => {
  if (typeof window === 'undefined') return false

  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Permission denied or document not focused: try the fallback below.
    }
  }

  return copyWithTextarea(text)
}

const copyWithTextarea = (text: string): boolean => {
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const host = active?.closest<HTMLElement>('[role="dialog"]') ?? document.body

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.setAttribute('aria-hidden', 'true')
  // Off-screen but selectable; fixed so the page does not scroll to it.
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  host.appendChild(textarea)

  try {
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    host.removeChild(textarea)
    active?.focus({ preventScroll: true })
  }
}

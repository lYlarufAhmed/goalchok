import { AlertCircle, X } from 'lucide-react'
import { useTeamsQuery, useMatchesQuery } from '../../hooks/useQueries'

export default function AdminErrorBanner() {
  const { isError: teamsErrorObj, error: teamsErrorVal } = useTeamsQuery()
  const { isError: matchesErrorObj, error: matchesErrorVal } = useMatchesQuery()

  const error = (teamsErrorObj ? teamsErrorVal?.message : null) || (matchesErrorObj ? matchesErrorVal?.message : null)
  
  if (!error) return null

  const dismiss = () => {
    // With React Query, error banners are usually transient or we don't clear the query error directly, 
    // but we can just hide it locally or let a toast handle it. For now, we'll just return null
    // since the standard pattern is either retry or rely on automatic refetching.
  }

  return (
    <div className="mb-4 flex items-start gap-3 p-3 rounded-xl bg-danger/10 border border-danger/30 text-sm">
      <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
      <p className="flex-1 text-danger">{error}</p>
      <button
        type="button"
        onClick={dismiss}
        className="text-danger/70 hover:text-danger shrink-0 hidden"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  )
}

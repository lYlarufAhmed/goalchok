import MatchFormModal from './MatchFormModal'

/**
 * KnockoutMatchFormModal — edit/create a knockout match.
 * Delegates to polymorphic MatchFormModal with initialType="knockout".
 */
export default function KnockoutMatchFormModal({ onSubmit, ...props }) {
  return (
    <MatchFormModal
      {...props}
      initialType="knockout"
      onSubmitKnockout={onSubmit}
      onSubmit={onSubmit}
    />
  )
}

import ResultFormModal from './ResultFormModal'

/**
 * KnockoutResultFormModal — result editor for knockout matches.
 * Delegates to polymorphic ResultFormModal with isKnockout=true.
 */
export default function KnockoutResultFormModal(props) {
  return <ResultFormModal {...props} isKnockout={true} />
}

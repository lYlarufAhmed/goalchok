import { useState, useEffect, useMemo } from 'react'
import { useKnockoutStore } from '../stores/useKnockoutStore'
import { mergeKnockoutMatches } from '../utils/matchMerge'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * Real-time Firestore listener for teams.
 * Returns { data, isLoading, isError } compatible with useTeamsQuery.
 */
export function useRealtimeTeamsQuery() {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'teams'),
      (snapshot) => {
        const teams = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        setData(teams)
        setIsLoading(false)
      },
      (err) => {
        console.error('[useRealtimeTeamsQuery] error:', err)
        setIsError(true)
        setIsLoading(false)
      }
    )

    return () => unsub()
  }, [])

  return { data, isLoading, isError, refetch: () => {} }
}

/**
 * Real-time Firestore listener for matches.
 * Returns { data, isLoading, isError } compatible with useMatchesQuery.
 */
export function useRealtimeMatchesQuery() {
  const [firebaseMatches, setFirebaseMatches] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const koMatches = useKnockoutStore((s) => s.knockoutMatches)

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'matches'),
      (snapshot) => {
        const matches = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          result: d.data().result || null,
          status: d.data().status || 'scheduled',
        }))
        setFirebaseMatches(matches)
        setIsLoading(false)
      },
      (err) => {
        console.error('[useRealtimeMatchesQuery] error:', err)
        setIsError(true)
        setIsLoading(false)
      }
    )

    return () => unsub()
  }, [])

  const data = useMemo(
    () => mergeKnockoutMatches(firebaseMatches, koMatches),
    [firebaseMatches, koMatches]
  )

  return { data, isLoading, isError, refetch: () => {} }
}

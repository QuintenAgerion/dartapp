/**
 * Assigns board numbers and estimated start times to matches.
 * Matches in the same round run concurrently across available boards.
 * If more matches than boards in a round, they queue behind previous board slots.
 */
export function scheduleMatches<
  T extends { round: number }
>(
  matches: T[],
  numBoards: number,
  avgDurationMinutes: number,
  startTime: Date | null
): (T & { boardNumber: number; scheduledAt: string | null })[] {
  // Group by round
  const byRound = new Map<number, T[]>()
  for (const m of matches) {
    const arr = byRound.get(m.round) ?? []
    arr.push(m)
    byRound.set(m.round, arr)
  }

  const sortedRounds = [...byRound.keys()].sort((a, b) => a - b)
  const result: (T & { boardNumber: number; scheduledAt: string | null })[] = []

  // Track when each board becomes free
  const boardFreeAt: number[] = Array.from(
    { length: numBoards },
    () => startTime?.getTime() ?? 0
  )

  for (const round of sortedRounds) {
    const roundMatches = byRound.get(round)!

    for (let i = 0; i < roundMatches.length; i++) {
      const boardIdx = i % numBoards
      const boardNumber = boardIdx + 1

      // Board becomes free after previous match on this board
      const startMs = boardFreeAt[boardIdx]
      boardFreeAt[boardIdx] = startMs + avgDurationMinutes * 60_000

      result.push({
        ...roundMatches[i],
        boardNumber,
        scheduledAt: startTime ? new Date(startMs).toISOString() : null,
      })
    }
  }

  return result
}

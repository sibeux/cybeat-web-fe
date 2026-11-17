import type { ArtistLink } from '../types'

export function parseArtistCredits<T extends ArtistLink>(text: string, artists: T[]): { name: string; artist?: T }[] {
  const knownArtists = artists.filter((artist) => artist.name.trim()).sort((a, b) => b.name.length - a.name.length)
  const credits: { name: string; artist?: T }[] = []
  let remaining = text.trim()
  const matchesAtStart = (value: string, artist: T) => {
    const name = artist.name.trim()
    return value.toLocaleLowerCase().startsWith(name.toLocaleLowerCase()) &&
      (value.length === name.length || /^\s*,/.test(value.slice(name.length)))
  }

  while (remaining) {
    const matchingArtist = knownArtists.find((artist) => matchesAtStart(remaining, artist))

    if (matchingArtist) {
      credits.push({ name: remaining.slice(0, matchingArtist.name.trim().length), artist: matchingArtist })
      remaining = remaining.slice(matchingArtist.name.trim().length).replace(/^\s*,\s*/, '').trim()
      continue
    }

    const nextKnownCredit = [...remaining.matchAll(/,\s*/g)]
      .map((match) => match.index)
      .find((index) => knownArtists.some((artist) => matchesAtStart(remaining.slice(index + 1).trimStart(), artist)))

    if (nextKnownCredit === undefined) {
      credits.push({ name: remaining })
      break
    }

    credits.push({ name: remaining.slice(0, nextKnownCredit).trim() })
    remaining = remaining.slice(nextKnownCredit + 1).trim()
  }

  return credits
}

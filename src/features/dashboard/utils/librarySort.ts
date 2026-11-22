interface LibrarySortItem {
  id: number | string
  type: string
  pin_at: string | null
  played_at: string | null
  created_at: string
}

const timestamp = (value: string | null) => value ? Date.parse(value) || 0 : 0

export const compareLibraryItems = (a: LibrarySortItem, b: LibrarySortItem) =>
  Number(Boolean(b.pin_at)) - Number(Boolean(a.pin_at))
  || (a.pin_at && b.pin_at
    ? timestamp(a.pin_at) - timestamp(b.pin_at)
    : Math.max(timestamp(b.played_at), timestamp(b.created_at))
      - Math.max(timestamp(a.played_at), timestamp(a.created_at)))
  || b.type.localeCompare(a.type)
  || Number(b.id) - Number(a.id)

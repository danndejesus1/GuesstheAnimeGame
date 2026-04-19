const compareTitles = (a: string, b: string): number => a.localeCompare(b)

export const sortTitles = (titles: string[]): string[] => {
  const copy = [...titles]
  copy.sort(compareTitles)
  return copy
}

export const mergeAndSortTitles = (baseTitles: string[], extraTitles: string[]): string[] => {
  const merged = new Set([...baseTitles, ...extraTitles])
  return sortTitles(Array.from(merged))
}

export const filterTitleSuggestions = (titles: string[], input: string): string[] => {
  const query = input.trim().toLowerCase()

  if (query.length === 0) {
    return titles.slice(0, 50)
  }

  const containsMatches = titles.filter((title) => title.toLowerCase().includes(query))

  const nonPrefixMatches = containsMatches.filter((title) => !title.toLowerCase().startsWith(query))
  const prefixMatches = containsMatches.filter((title) => title.toLowerCase().startsWith(query))

  if (nonPrefixMatches.length > 0) {
    return [...nonPrefixMatches, ...prefixMatches]
  }

  return prefixMatches
}

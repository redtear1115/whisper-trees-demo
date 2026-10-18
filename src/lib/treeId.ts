const TREE_ID = /[A-Z]{2}\d{10}(?:-\d{3})?/

/** 從樹牌 QR 內容取出樹籍編號；不是樹牌就回傳 null。 */
export function parseTreeId(raw: string): string | null {
  const text = raw.trim()
  try {
    const url = new URL(text)
    const id = url.searchParams.get('treeid')?.trim().toUpperCase()
    if (id && new RegExp(`^${TREE_ID.source}$`).test(id)) return id
  } catch {
    // 不是網址，往下找編號
  }
  return text.toUpperCase().match(TREE_ID)?.[0] ?? null
}

export function treePrefix(treeId: string): string {
  return treeId.slice(0, 2)
}

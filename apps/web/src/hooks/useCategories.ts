import { useState, useEffect } from 'react'
import { DEFAULT_CATEGORIES, type Category } from '../types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/questions/categories')
      .then(r => (r.ok ? r.json() : []))
      .then((data: string[]) => {
        if (Array.isArray(data) && data.length > 0) {
          // Merge dynamic categories with default categories
          const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...data]))
          setCategories(merged)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { categories, loading }
}

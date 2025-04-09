import { useState } from 'react'
import { usePGlite } from '@electric-sql/pglite-react'

const SortOptions = () => {
  const db = usePGlite()
  const [currentSort, setCurrentSort] = useState("default")

  const resetSortFlags = async () => {
    await db.query(`SET enable_sort = on`)
    await db.query(`SET enable_incremental_sort = on`)
    setCurrentSort("default")
  }

  const sortSettings = {
    sort_only: [`SET enable_incremental_sort = off`],
    incremental_only: [`SET enable_sort = off`],
  }

  const forceSort = async (type) => {
    await resetSortFlags()
    for (const stmt of sortSettings[type]) {
      await db.query(stmt)
    }
    setCurrentSort(type)
  }

  return (
    <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid gray", borderRadius: "8px" }}>
      <h3>Sort Strategy Options</h3>
      <p><strong>Current Sort Preference:</strong> {currentSort}</p>
      <button onClick={() => forceSort("sort_only")}>Force Plain Sort</button>
      <button onClick={() => forceSort("incremental_only")}>Force Incremental Sort</button>
      <button onClick={resetSortFlags}>Reset to Default</button>
    </div>
  )
}

export default SortOptions

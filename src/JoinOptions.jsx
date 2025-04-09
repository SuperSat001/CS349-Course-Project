import { useState } from 'react'
import { usePGlite } from '@electric-sql/pglite-react'

const JoinOptions = () => {
  const db = usePGlite()
  const [currentJoin, setCurrentJoin] = useState("default")

  const resetJoinFlags = async () => {
    await db.query(`SET enable_nestloop = on`)
    await db.query(`SET enable_mergejoin = on`)
    await db.query(`SET enable_hashjoin = on`)
    setCurrentJoin("default")
  }

  const joinSettings = {
    nestloop: [
      `SET enable_mergejoin = off`,
      `SET enable_hashjoin = off`
    ],
    mergejoin: [
      `SET enable_nestloop = off`,
      `SET enable_hashjoin = off`
    ],
    hashjoin: [
      `SET enable_nestloop = off`,
      `SET enable_mergejoin = off`
    ],
  }

  const forceJoin = async (type) => {
    await resetJoinFlags()
    for (const stmt of joinSettings[type]) {
      await db.query(stmt)
    }
    setCurrentJoin(type)
  }

  return (
    <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid gray", borderRadius: "8px" }}>
      <h3>Join Strategy QueryPlanning</h3>
      <p><strong>Current Join Preference:</strong> {currentJoin}</p>
      <button onClick={() => forceJoin("nestloop")}>Force NestLoop Join</button>
      <button onClick={() => forceJoin("mergejoin")}>Force Merge Join</button>
      <button onClick={() => forceJoin("hashjoin")}>Force Hash Join</button>
      <button onClick={resetJoinFlags}>Reset to Default</button>
    </div>
  )
}

export default JoinOptions

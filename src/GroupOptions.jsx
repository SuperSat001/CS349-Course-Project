import { useState } from 'react'
import { usePGlite } from '@electric-sql/pglite-react'

const GroupOptions = () => {
  const db = usePGlite()
  const [currentGroup, setCurrentGroup] = useState("default")

  const resetGroupFlags = async () => {
    await db.query(`SET enable_hashagg = on`)
    setCurrentGroup("default")
  }

  const forceGroup = async (type) => {
    await resetGroupFlags()
    if (type === "groupagg") {
      await db.query(`SET enable_hashagg = off`)
    }
    setCurrentGroup(type)
  }

  return (
    <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid gray", borderRadius: "8px" }}>
      <h3>Aggregation Options</h3>
      <p><strong>Current Aggregation Preference:</strong> {currentGroup}</p>
      <button onClick={() => forceGroup("hashagg")}>Prefer Hash Aggregate</button>
      <button onClick={() => forceGroup("groupagg")}>Force Group Aggregate</button>
      <button onClick={resetGroupFlags}>Reset to Default</button>
    </div>
  )
}

export default GroupOptions

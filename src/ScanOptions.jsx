import { useState } from 'react'
import { usePGlite } from '@electric-sql/pglite-react'

const ScanOptions = () => {
  const db = usePGlite()
  const [currentScan, setCurrentScan] = useState("default")

  // Resets all planner scan-related flags to ON
  const resetPlannerFlags = async () => {
    try {
      await db.query(`SET enable_seqscan = on`)
      await db.query(`SET enable_indexscan = on`)
      await db.query(`SET enable_bitmapscan = on`)
      await db.query(`SET enable_tidscan = on`)
      setCurrentScan("default")
      console.log("All scan flags reset to ON")
    } catch (err) {
      console.error("Error resetting planner flags", err)
    }
  }

  const scanSettings = {
    seqscan: [
      `SET enable_indexscan = off`,
      `SET enable_bitmapscan = off`,
      `SET enable_tidscan = off`,
    ],
    indexscan: [
      `SET enable_seqscan = off`,
      `SET enable_bitmapscan = off`,
      `SET enable_tidscan = off`,
    ],
    bitmapscan: [
      `SET enable_seqscan = off`,
      `SET enable_indexscan = off`,
      `SET enable_tidscan = off`,
    ],
    tidscan: [
      `SET enable_seqscan = off`,
      `SET enable_indexscan = off`,
      `SET enable_bitmapscan = off`,
    ],
  }

  const forceScanType = async (scanType) => {
    await resetPlannerFlags()

    try {
      for (const stmt of scanSettings[scanType]) {
        await db.query(stmt)
      }
      setCurrentScan(scanType)
      console.log(`Planner set to prefer: ${scanType}`)
    } catch (err) {
      console.error("Failed to set planner flags", err)
    }
  }

  return (
    <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid gray", borderRadius: "8px" }}>
      <h3>Scan Preference Controller</h3>
      <p><strong>Current Scan Preference:</strong> {currentScan}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <button onClick={() => forceScanType("seqscan")}>Force Seq Scan</button>
        <button onClick={() => forceScanType("indexscan")}>Force Index Scan</button>
        <button onClick={() => forceScanType("bitmapscan")}>Force Bitmap Scan</button>
        <button onClick={() => forceScanType("tidscan")}>Force TID Scan</button>
        <button onClick={resetPlannerFlags}>Reset to Default</button>
      </div>
    </div>
  )
}

export default ScanOptions

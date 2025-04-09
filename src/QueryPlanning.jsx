import { useState, useEffect } from 'react'
import { PGlite } from "@electric-sql/pglite"
import { live } from "@electric-sql/pglite/live"
import { PGliteProvider } from "@electric-sql/pglite-react"
import { usePGlite } from "@electric-sql/pglite-react"
import ScanOptions from './ScanOptions'
import JoinOptions from './JoinOptions'
import SortOptions from './SortOptions'
import GroupOptions from './GroupOptions'

const ExplainQuery = () => {
  const db = usePGlite()
  const [plan, setPlan] = useState("")
  const [selectedQuery, setSelectedQuery] = useState("")

  const queries = {
    scan: `EXPLAIN ANALYZE SELECT * FROM my_table WHERE id = '12';`,
    group: `EXPLAIN ANALYZE SELECT name, COUNT(*) FROM my_table GROUP BY name;`,
    order: `EXPLAIN ANALYZE SELECT * FROM my_table ORDER BY name;`,
    join: `EXPLAIN ANALYZE SELECT * FROM my_table m JOIN other_table o ON m.id = o.id;`
  }

  const runExplain = async (queryKey) => {
    const query = queries[queryKey]
    setSelectedQuery(query)
    try {
      const result = await db.query(query)
      const explainText = result.rows.map(row => row['QUERY PLAN']).join('\n')
      setPlan(explainText)
      console.log("Explain plan:\n", explainText)
    } catch (error) {
      console.error("Error running EXPLAIN ANALYZE:", error)
      setPlan("Error running EXPLAIN ANALYZE")
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button onClick={() => runExplain("scan")}>EXPLAIN: Scan by ID</button>
        <button onClick={() => runExplain("group")}>EXPLAIN: Group by Name</button>
        <button onClick={() => runExplain("order")}>EXPLAIN: Order by Name</button>
        <button onClick={() => runExplain("join")}>EXPLAIN: Join Tables</button>
      </div>

      <pre style={{ background: "black", color: "white", padding: "1em", marginTop: "1em", overflowX: "auto" }}>
        {plan || "Click a button to run EXPLAIN ANALYZE"}
      </pre>

      {selectedQuery && (
        <div style={{ marginTop: "1em", fontSize: "0.9em", fontFamily: "monospace" }}>
          <strong>Selected Query:</strong>
          <div style={{ whiteSpace: "pre-wrap", marginTop: "0.5em" }}>{selectedQuery}</div>
        </div>
      )}
    </div>
  )
}

const DisplayRows = () => {
  const db = usePGlite()
  const [rows, setRows] = useState([])
  const [showRows, setShowRows] = useState(false) // State to toggle visibility

  const fetchRows = async () => {
    try {
      const result = await db.query("SELECT * FROM my_table;")
      setRows(result.rows)
      console.log("Fetched rows:", result.rows)
    } catch (error) {
      console.error("Error fetching rows:", error)
    }
  }

  const toggleRowsVisibility = () => {
    fetchRows();
    setShowRows((prev) => !prev)
  }

  return (
    <div>
      <button onClick={toggleRowsVisibility} style={{ margin: "20px" }}>
        {showRows ? "Hide Rows" : "Show Rows"}
      </button>
      {showRows && (
        <ul style={{ marginTop: "20px" }}>
          {rows.map((row, index) => (
            <li key={index}>
              ID: {row.id}, Name: {row.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function QueryPlanning() {
  const [count, setCount] = useState(0)

  return (
    <>
      <DisplayRows />
      <ExplainQuery />
      <ScanOptions />
      <JoinOptions />
      <SortOptions />
      <GroupOptions />
    </>
  )
}

export default QueryPlanning;

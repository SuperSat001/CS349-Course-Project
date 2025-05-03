// Replace the current ExplainQuery component with the following:
import { useState } from 'react'
import { usePGlite } from "@electric-sql/pglite-react"

const ExplainQuery = () => {
  const db = usePGlite()
  const [plan, setPlan] = useState("")
  const [selectedQuery, setSelectedQuery] = useState("")
  const [inputQuery, setInputQuery] = useState("")

  const runExplain = async () => {
    const query = `EXPLAIN ANALYZE ${inputQuery}`
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
    <div style={{ marginTop: "1rem" }}>
      <textarea
        rows={4}
        style={{ width: "100%", fontFamily: "monospace" }}
        placeholder="Enter your query here (without EXPLAIN ANALYZE)..."
        value={inputQuery}
        onChange={(e) => setInputQuery(e.target.value)}
      />
      <button onClick={runExplain} style={{ marginTop: "0.5rem" }}>
        Run EXPLAIN ANALYZE
      </button>

      <pre style={{ background: "black", color: "white", padding: "1em", marginTop: "1em", overflowX: "auto" }}>
        {plan || "Enter a query and run EXPLAIN ANALYZE"}
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

export default ExplainQuery

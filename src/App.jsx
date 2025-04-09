import { useState, useEffect } from 'react'
import './App.css'
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

  const runExplain = async () => {
    try {

      // const result = await db.query(`EXPLAIN ANALYZE SELECT * FROM my_table WHERE id = '12';`)
      // const result = await db.query(`EXPLAIN ANALYZE SELECT name, COUNT(*) FROM my_table GROUP BY name;`)
      // const result = await db.query(`EXPLAIN ANALYZE SELECT * FROM my_table ORDER BY name;`)
      const result = await db.query(`EXPLAIN ANALYZE SELECT * FROM my_table m JOIN other_table o ON m.id = o.id;`)
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
      <button onClick={runExplain}>Run EXPLAIN ANALYZE</button>
      <pre style={{ background: "black", color: "white", padding: "1em", marginTop: "1em", overflowX: "auto" }}>
        {plan}
      </pre>
    </div>
  )
}

const MyComponent = () => {
  const db = usePGlite()
  const [id, setId] = useState("")
  const [name, setName] = useState("")

  const insertItem = async () => {
    try {
      if (!id || !name) {
        alert("Please enter both ID and Name")
        return
      }
      await db.query(`INSERT INTO my_table (id, name) VALUES (${id}, '${name}');`)
      console.log("Item inserted successfully")
      setId("") // Clear the input fields
      setName("")
    } catch (error) {
      console.error("Error inserting item:", error)
    }
  }

  return (
    <div>
      <input
        type="number"
        placeholder="Enter ID"
        value={id}
        onChange={(e) => setId(e.target.value)}
        style={{ marginRight: "10px" }}
      />
      <input
        type="text"
        placeholder="Enter Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ marginRight: "10px" }}
      />
      <button onClick={insertItem}>Insert Item</button>
    </div>
  )
}

const DisplayRows = () => {
  const db = usePGlite()
  const [rows, setRows] = useState([])

  const fetchRows = async () => {
    try {
      const result = await db.query("SELECT * FROM my_table;")
      setRows(result.rows)
      console.log("Fetched rows:", result.rows)
    } catch (error) {
      console.error("Error fetching rows:", error)
    }
  }

  return (
    <div>
      <button onClick={fetchRows}>Display Rows</button>
      <ul>
        {rows.map((row, index) => (
          <li key={index}>
            ID: {row.id}, Name: {row.name}, Number: {row.number}
          </li>
        ))}
      </ul>
    </div>
  )
}

function App() {
  const [count, setCount] = useState(0)
  const [db, setDb] = useState(null)

  useEffect(() => {
    async function initializeDb() {
      const database = await PGlite.create({
        extensions: { live }
      })

      // Create the table if it doesn't exist
      await database.query(`
        CREATE TABLE IF NOT EXISTS my_table (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL
        );
      `)

      await database.query(`
        CREATE TABLE IF NOT EXISTS other_table (
          id INTEGER PRIMARY KEY,
          tag TEXT NOT NULL
        );
      `)

      await database.query(`CREATE INDEX IF NOT EXISTS idx_my_table_id ON my_table(id);`)
      await database.query(`CREATE INDEX IF NOT EXISTS idx_othertable_id ON other_table(id);`)

      const response = await fetch('/sample_data_2.sql')
      const sqlText = await response.text()
      console.log("SQL Text:", sqlText)
      await database.query(sqlText)

      await database.query(`INSERT INTO other_table (id, tag) VALUES (1, 'tag1');`)
      await database.query(`INSERT INTO other_table (id, tag) VALUES (2, 'tag2');`)

      setDb(database)
      console.log("Database initialized and table created:", database)
    }
    initializeDb()
  }, [])

  if (!db) {
    return <p>Loading database...</p>
  }

  return (
    <PGliteProvider db={db}>
      <DisplayRows />
      <ExplainQuery />
      <ScanOptions />
      <JoinOptions />
      <SortOptions />
      <GroupOptions />
    </PGliteProvider>
  )
}

export default App

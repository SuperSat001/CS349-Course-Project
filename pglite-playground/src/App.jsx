import { useState, useEffect } from 'react'
import './App.css'
import { PGlite } from "@electric-sql/pglite"
import { live } from "@electric-sql/pglite/live"
import { PGliteProvider } from "@electric-sql/pglite-react"
import { usePGlite } from "@electric-sql/pglite-react"

const MyComponent = () => {
  const db = usePGlite()

  const insertItem = async () => {
    try {
      await db.query("INSERT INTO my_table (id, name, number) VALUES (1, 'Arthur', 42);")
      console.log("Item inserted successfully")
    } catch (error) {
      console.error("Error inserting item:", error)
    }
  }

  return (
    <>
      <button onClick={insertItem}>Insert Item</button>
    </>
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
          name TEXT NOT NULL,
          number INTEGER NOT NULL
        );
      `)

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
      <MyComponent />
      <DisplayRows />
    </PGliteProvider>
  )
}

export default App

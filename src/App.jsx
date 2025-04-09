import { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import './App.css'
import { PGlite } from "@electric-sql/pglite"
import { live } from "@electric-sql/pglite/live"
import { PGliteProvider } from "@electric-sql/pglite-react"
import { usePGlite } from "@electric-sql/pglite-react"

import Dummy1 from './Dummy1.jsx'
import Dummy2 from './Dummy2.jsx'

const Navbar = () => (
  <nav>
    <Link to="/">Home</Link>
    <Link to="/dummy1">Dummy1</Link>
    <Link to="/dummy2">Dummy2</Link>
  </nav>
)

const MyComponent = () => {
  const db = usePGlite()
  const [id, setId] = useState("")
  const [name, setName] = useState("")
  const [number, setNumber] = useState("")

  const insertItem = async () => {
    try {
      if (!id || !name || !number) {
        alert("Please fill in all fields before inserting.")
        return
      }

      const query = `INSERT INTO my_table (id, name, number) VALUES (${id}, '${name}', ${number});`
      await db.query(query)
      console.log("Item inserted successfully")
      setId("")
      setName("")
      setNumber("")
    } catch (error) {
      console.error("Error inserting item:", error)
    }
  }

  return (
    <div className="container">
      <h2>Insert Item</h2>
      <input
        type="number"
        placeholder="Enter ID"
        value={id}
        onChange={(e) => setId(e.target.value)}
      />
      <input
        type="text"
        placeholder="Enter Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="number"
        placeholder="Enter Number"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
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
    <div className="container">
      <h2>Display Rows</h2>
      <button onClick={fetchRows}>Display Rows</button>
      <table style={{ marginTop: '20px', borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Name</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Number</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{row.id}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{row.name}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{row.number}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const DeleteRow = () => {
  const db = usePGlite()
  const [idToDelete, setIdToDelete] = useState("")

  const deleteRow = async () => {
    try {
      if (!idToDelete) {
        alert("Please enter an ID to delete.")
        return
      }

      const query = `DELETE FROM my_table WHERE id = ${idToDelete};`
      await db.query(query)
      console.log(`Row with ID ${idToDelete} deleted successfully`)
      setIdToDelete("")
    } catch (error) {
      console.error("Error deleting row:", error)
    }
  }

  return (
    <div className="container">
      <h2>Delete Row</h2>
      <input
        type="number"
        placeholder="Enter ID to delete"
        value={idToDelete}
        onChange={(e) => setIdToDelete(e.target.value)}
      />
      <button onClick={deleteRow}>Delete Row</button>
    </div>
  )
}

function App() {
  const [db, setDb] = useState(null)

  useEffect(() => {
    async function initializeDb() {
      const database = await PGlite.create({
        extensions: { live }
      })

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
    <div>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            <PGliteProvider db={db}>
              <MyComponent />
              <DisplayRows />
              <DeleteRow />
            </PGliteProvider>
          }
        />
        <Route path="/dummy1" element={<Dummy1 />} />
        <Route path="/dummy2" element={<Dummy2 />} />
      </Routes>
    </div>
  )
}

export default App
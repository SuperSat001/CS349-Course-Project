import { useState, useEffect } from 'react'
import './App.css'
import { PGlite } from "@electric-sql/pglite"
import { live } from "@electric-sql/pglite/live"
import { PGliteProvider } from "@electric-sql/pglite-react"
import { usePGlite } from "@electric-sql/pglite-react"
import { parse } from 'pgsql-ast-parser'
import { extractSubqueries, analyzeSubqueries } from './QueryLogic';

const QueryInput = () => {
  const db = usePGlite();
  const [query, setQuery] = useState("");
  const [subqueries, setSubqueries] = useState([]);
  const [explainResults, setExplainResults] = useState([]);
  const [ast, setAst] = useState([]);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    setError(null);
    if (!query.trim()) {
      setError("Please enter a query");
      return;
    }

    try {
      const { ast: parsedAst, subqueries: extractedSubqueries, results } = await analyzeSubqueries(db, query);
      setAst(parsedAst);
      setSubqueries(extractedSubqueries);
      setExplainResults(results);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">
      <div className="mb-4">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={5}
          className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white font-mono"
          placeholder="Enter SQL query..."
        />
      </div>
      <button
        onClick={handleAnalyze}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
      >
        Analyze Subqueries
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}

      <h3 className="text-xl font-bold mt-8 mb-4">Subquery Analysis</h3>

      {explainResults.map((result, index) => (
        <div
          key={index}
          className="bg-gray-800 text-gray-100 p-4 rounded-lg shadow-md mb-6"
        >
          <h4 className="text-yellow-300 font-bold text-lg mb-2">{result.name}</h4>
          <code className="block text-blue-300 mb-4">{result.sql}</code>

          {result.error ? (
            <p className="text-red-400">Error: {result.error}</p>
          ) : (
            <div className="space-y-1 text-sm font-mono">
              {result.explain.map((row, i) => {
                const line = Object.values(row)[0];

                // Extract key parts from EXPLAIN ANALYZE lines
                const filterMatch = line.match(/Filter:\s*(.*)/i);
                const planningMatch = line.match(/Planning Time:\s*(.*)/i);
                const executionMatch = line.match(/Execution Time:\s*(.*)/i);
                const scanMatch = line.match(/(Seq Scan|Index Scan|Bitmap Scan|Nested Loop|Hash Join|Merge Join|CTE|Sort).*/i);

                return (
                  <div key={i} className="text-gray-200">
                    {scanMatch && (
                      <div>
                        <span className="text-purple-400 font-semibold">Scan Type:</span>{" "}
                        {scanMatch[0]}
                      </div>
                    )}
                    {filterMatch && (
                      <div>
                        <span className="text-green-400 font-semibold">Filter:</span>{" "}
                        {filterMatch[1]}
                      </div>
                    )}
                    {planningMatch && (
                      <div>
                        <span className="text-pink-400 font-semibold">Planning Time:</span>{" "}
                        {planningMatch[1]}
                      </div>
                    )}
                    {executionMatch && (
                      <div>
                        <span className="text-cyan-400 font-semibold">Execution Time:</span>{" "}
                        {executionMatch[1]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};


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
      <QueryInput />
    </PGliteProvider>
  )
}

export default App

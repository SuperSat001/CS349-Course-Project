import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { PGlite } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";
import { PGliteProvider } from "@electric-sql/pglite-react";

import QueryPlanning from './QueryPlanning.jsx';
import QueryProfiler from './QueryProfiler.jsx';
import Minimal from './Minimal.jsx';
import './App.css';

const Navbar = () => (
  <nav>
    <Link to="/">PGLite Demo</Link>
    <Link to="/QueryPlanning">Query Planning</Link>
    <Link to="/QueryProfiler">Query Profiler</Link>
  </nav>
);

function App() {
  const [db, setDb] = useState(null);

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

  if (!db) return <p className="p-4">Loading database...</p>;

  return (
    <PGliteProvider db={db}>
      <Navbar />
      <Routes>
        <Route path="/" element={<Minimal />} />
        <Route path="/QueryPlanning" element={<QueryPlanning />} />
        <Route path="/QueryProfiler" element={<QueryProfiler />} />
      </Routes>
    </PGliteProvider>
  );
}

export default App;

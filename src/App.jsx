import { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { PGliteProvider } from "@electric-sql/pglite-react";
import QueryPlanning from './QueryPlanning.jsx';
import QueryProfiler from './QueryProfiler.jsx';
import Minimal from './Minimal.jsx';
import DatabaseLoader from './DatabaseLoader.jsx';
import './App.css';

const Navbar = ({ dbReady }) => (
  <nav>
    <Link to="/">PGLite Demo</Link>
    <Link to="/DatabaseLoader">Load Database</Link>
    <Link to="/QueryPlanning" className={!dbReady ? "disabled-link" : ""}>Query Planning</Link>
    <Link to="/QueryProfiler" className={!dbReady ? "disabled-link" : ""}>Query Profiler</Link>
  </nav>
);

function App() {
  const [db, setDb] = useState(null);

  const handleDbReady = (customDb) => {
    setDb(customDb);
  };

  return (
    <>
      <Navbar dbReady={!!db} />
      {db ? (
        <PGliteProvider db={db}>
          <Routes>
            <Route path="/" element={<Minimal />} />
            <Route path="/QueryPlanning" element={<QueryPlanning />} />
            <Route path="/QueryProfiler" element={<QueryProfiler />} />
            <Route path="/DatabaseLoader" element={<DatabaseLoader onReady={handleDbReady} />} />
          </Routes>
        </PGliteProvider>
      ) : (
        <Routes>
          <Route path="/" element={<div className="p-6 text-white bg-gray-900 min-h-screen">Please load a database first.</div>} />
          <Route path="/DatabaseLoader" element={<DatabaseLoader onReady={handleDbReady} />} />
          <Route path="*" element={<div className="p-6 text-white bg-gray-900 min-h-screen">Please load a database first.</div>} />
        </Routes>
      )}
    </>
  );
}

export default App;

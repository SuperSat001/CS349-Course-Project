import { useState,useEffect } from 'react';
import { Routes, Route, Link, BrowserRouter } from 'react-router-dom';
import { PGliteProvider,usePGlite } from "@electric-sql/pglite-react";
import { PGlite } from '@electric-sql/pglite';
import QueryPlanning from './QueryPlanning.jsx';
import Minimal from './Minimal.jsx';
import DatabaseLoader from './DatabaseLoader.jsx';
import CourseList from './CourseList.jsx';
import './App.css';


function App() {
  const [db, setDb] = useState(null); // State for the PGLite instance
  const [dbReady, setDbReady] = useState(false); // State to track if DB is loaded

  // Callback function passed to DatabaseLoader to receive the DB instance
  const handleDbReady = (loadedDb) => {
    setDb(loadedDb);
    setDbReady(true);
    console.log("Database is ready in App component.");
  };

  // Navigation Bar component
  const Navbar = ({ isDbReady }) => (
     <nav className="nav">
      <div className="nav-links-container">
        <Link to="/" className={`navLink ${!isDbReady ? 'disabledLink' : ''}`}>Courses</Link>
        <Link to="/load-database" className="navLink">Load Database</Link>
        <Link to="/query-planning" className={`navLink ${!isDbReady ? 'disabledLink' : ''}`}>Query Planning</Link>
        <Link to="/browse" className={`navLink ${!isDbReady ? 'disabledLink' : ''}`}>Browse Tables</Link>
      </div>
    </nav>
  );

  // Component shown when the database hasn't been loaded yet
  const DBLoadingMessage = () => (
     <div className="container"> 
        <h2 className="heading">Database Not Loaded</h2> 
        <p>Please go to the <Link to="/load-database" className="text-blue-400 hover:underline">Load Database</Link> page first.</p>
     </div>
  );
  console.log('App Render - dbReady:', dbReady, 'db:', db);
  return (
    <BrowserRouter>
      <Navbar isDbReady={dbReady} />

      {dbReady && db && PGliteProvider ? (
        <PGliteProvider db={db}>
          <Routes>
            <Route path="/" element={<CourseList />} />
            <Route path="/query-planning" element={<QueryPlanning />} />
            <Route path="/browse" element={<Minimal />} />
            <Route path="/load-database" element={<DatabaseLoader onReady={handleDbReady} />} />
            {/* fallback route */}
             <Route path="*" element={<CourseList />} /> {/* Or a 404 component */}
          </Routes>
        </PGliteProvider>
      ) : (
        <Routes>
          <Route path="/load-database" element={<DatabaseLoader onReady={handleDbReady} />} />
          <Route path="*" element={<DBLoadingMessage />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;

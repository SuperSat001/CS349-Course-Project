import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, BrowserRouter, useNavigate } from 'react-router-dom';
import { PGliteProvider } from "@electric-sql/pglite-react";
import { PGlite } from '@electric-sql/pglite';

// --- Import the SQL content (Adjust path if needed) ---
// Ensure your build tool supports this (e.g., Vite's ?raw)
// If not, place in public/ and use fetch() in useEffect
import xdataSql from './xdata_data.sql?raw';

// --- Import your page components ---
import QueryPlanning from './QueryPlanning.jsx';
import Minimal from './Minimal.jsx';
import DatabaseLoader from './DatabaseLoader.jsx'; // Keep the import
import CourseList from './CourseList.jsx';
import AssignmentListPage from './AssignmentListPage.jsx'; // <-- New
import AddAssignmentPage from './AddAssignmentPage.jsx';   // <-- New
import AssignmentAttemptPage from './AssignmentAttemptPage.jsx'; // <-- New
import SchemaManager from './SchemaManager.jsx';
import './App.css';

function App() {
  const [db, setDb] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState('');
  const [availableStudentSchemas, setAvailableStudentSchemas] = useState([]); // List of names
  const [activeStudentSchema, setActiveStudentSchema] = useState(null); // Currently selected name
  const [studentDbMessage, setStudentDbMessage] = useState('');
  const dbInstanceRef = useRef(null);

  // --- Initialize Main DB on mount with PERSISTENCE ---
  useEffect(() => {
    let isMounted = true;
    const initializeDb = async () => {
      const dataDir = 'idb://xdata-data';
      if (dbInstanceRef.current) {
        console.log("PGlite instance already exists in ref.");
        // Ensure state is synced if component remounted
        if (isMounted && !db) { setDb(dbInstanceRef.current); setDbReady(true); }
        return;
      }
      console.log(`Attempting PGlite initialization with dataDir: ${dataDir}`);
      setDbError('');
      try {
        const instance = new PGlite({ dataDir });
        dbInstanceRef.current = instance;
        console.log("PGlite instance created.");

        let needsInitialization = false;
        try {
          const checkResult = await instance.query(`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'xdata_course' LIMIT 1;`);
          needsInitialization = (checkResult.rows.length === 0);
          console.log(`Needs initialization: ${needsInitialization}`);
        } catch (e) {
           console.warn("Could not check for existing table:", e);
           needsInitialization = true;
        }

        if (needsInitialization) {
          console.log("Executing xdata_data.sql...");
          await instance.exec(xdataSql);
          console.log("Database initialized.");
        } else {
          console.log("Skipping initial SQL execution.");
        }

        // Set DB state only after potential initialization
        if (isMounted) {
          setDb(instance);
          setDbReady(true);
          // We will fetch schemas in a separate effect that depends on 'db'
        }
      } catch (error) {
        console.error("Error during PGlite initialization/SQL:", error);
        dbInstanceRef.current = null;
        if (isMounted) {
           setDbError(`Init Error: ${error.message}`);
           setDbReady(false);
        }
      }
    };
    initializeDb();
    return () => { isMounted = false; };
  }, []); // Runs once on mount

  // *** NEW Effect: Fetch existing student schemas once the DB is ready ***
  useEffect(() => {
      const fetchExistingStudentSchemas = async () => {
          if (!db) return; // Don't run if db is not ready
          console.log("DB ready, fetching existing student schemas...");
          try {
              const res = await db.query(
                  `SELECT schema_name FROM information_schema.schemata
                   WHERE schema_name LIKE 'student_schema_%' ORDER BY schema_name;`
              );
              const existingNames = res.rows.map(r => r.schema_name);
              console.log("Found existing student schemas:", existingNames);
              setAvailableStudentSchemas(existingNames);
              // Optionally set active schema if one exists and none is selected
               if (!activeStudentSchema && existingNames.length > 0) {
                   // setActiveStudentSchema(existingNames[0]); // Auto-select first? Or leave null?
                   console.log("Leaving active schema null initially.");
               }
          } catch (err) {
              console.error("Error fetching existing student schemas:", err);
              setStudentDbMessage(`Error fetching schema list: ${err.message}`);
              setAvailableStudentSchemas([]);
          }
      };
      fetchExistingStudentSchemas();
  }, [db]); // Run this effect whenever 'db' changes (specifically, when it becomes available)


  // Callback for DatabaseLoader
  const handleStudentDbLoad = ({ success, schemaName, message }) => {
    setStudentDbMessage(message);
    if (success && schemaName) {
      // Immediately update available schemas
      setAvailableStudentSchemas(prev => {
         const updated = [...new Set([...prev, schemaName])].sort();
         console.log("Updated available schemas:", updated);
         return updated;
      });
      setActiveStudentSchema(schemaName); // Make the newly loaded schema active
    }
  };

  // Function to set the active student schema
  const selectActiveStudentSchema = (schemaName) => {
    if (schemaName === activeStudentSchema) return;
    setActiveStudentSchema(schemaName);
    setStudentDbMessage(schemaName ? `Active student schema set to: ${schemaName}` : 'No active student schema.');
  };

  // Function to delete a student schema
  const deleteStudentSchema = async (schemaName) => {
    // ** REMOVE db.quoteIdent **
    if (!db || !schemaName || !schemaName.startsWith('student_schema_')) return;
    if (!window.confirm(`DELETE SCHEMA "${schemaName}"?\n\nThis action cannot be undone!`)) {
      return;
    }
    console.log(`Attempting to delete schema: ${schemaName}`);
    setStudentDbMessage(`Deleting schema ${schemaName}...`);
    try {
        // ** CHANGE HERE: Remove quoteIdent **
        await db.query(`DROP SCHEMA "${schemaName}" CASCADE;`); // Use standard SQL double quotes for safety
        console.log(`Schema ${schemaName} deleted.`);
        setStudentDbMessage(`Schema ${schemaName} deleted successfully.`);
        // Update state
        const remainingSchemas = availableStudentSchemas.filter(s => s !== schemaName);
        setAvailableStudentSchemas(remainingSchemas);
        if (activeStudentSchema === schemaName) {
            const nextActive = remainingSchemas.length > 0 ? remainingSchemas[0] : null;
            setActiveStudentSchema(nextActive);
            setStudentDbMessage(prev => prev + (nextActive ? `\nSwitched active schema to ${nextActive}.` : '\nNo active student schema.'));
        }
    } catch (err) {
        console.error(`Error deleting schema ${schemaName}:`, err);
        setStudentDbMessage(`Error deleting schema ${schemaName}: ${err.message}`);
    }
  };


  // --- Navigation Bar (adjust links as needed) ---
  const Navbar = ({ isDbReady }) => (
    <nav className="nav">
      <div className="nav-links-container">
        {/* Link to Courses - uses main DB */}
        <Link to="/" className={`navLink ${!isDbReady ? 'disabledLink' : ''}`}>Courses</Link>

        {/* Link to load STUDENT database */}
        <Link to="/load-database" className={`navLink ${!isDbReady ? 'disabledLink' : ''}`}>Load Student DB</Link>

        {/* Link to query planning - uses student DB */}
        <Link to="/query-planning" className={`navLink ${!isDbReady ? 'disabledLink' : ''}`}>Query Planning</Link>

        {/* Link to browse tables - currently targets public, might need modification if student schema Browse is desired */}
        <Link to="/browse" className={`navLink ${!isDbReady ? 'disabledLink' : ''}`}>Browse Tables</Link>

        <Link to="/assignments" className={`navLink ${!isDbReady ? 'disabledLink' : ''}`}>Assignments</Link>

        {/* Add other relevant links */}
      </div>
    </nav>
  );

  // --- Loading / Error Display for Main DB Init ---
  if (dbError) {
    return (
      <div className="container">
        <h2 className="heading error">Main Database Initialization Failed</h2>
        <p className="error">{dbError}</p>
        <p>The application cannot start. Please check the browser console for details and ensure 'xdata_data.sql' is correctly formatted and accessible.</p>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="container">
        <h2 className="heading">Initializing Main Database...</h2>
        <p>Loading application data. Please wait.</p>
        {/* Optional: Add a loading spinner */}
      </div>
    );
  }

  // --- Render Application when Main DB is Ready ---
  return (
    <BrowserRouter>
      <Navbar isDbReady={dbReady} />
      {dbReady && db ? ( // Render Provider only when db is ready
        <PGliteProvider db={db}>
           {/* Add Schema Manager Component */}
           <SchemaManager
                availableSchemas={availableStudentSchemas}
                activeSchema={activeStudentSchema}
                onSelectSchema={selectActiveStudentSchema}
                onDeleteSchema={deleteStudentSchema}
           />
          {/* Optional: Display student DB load message */}
          {studentDbMessage}
          <Routes>
            {/* Pass activeStudentSchema to components that need it */}
            <Route path="/" element={<CourseList />} />
            <Route path="/assignments" element={<AssignmentListPage />} />
            <Route path="/assignments/new" element={<AddAssignmentPage />} />
            <Route
               path="/assignments/:assignmentId"
               element={<AssignmentAttemptPage studentSchema={activeStudentSchema} />} // Use active
            />
            <Route path="/browse" element={<Minimal studentSchema={activeStudentSchema} />} /> {/* Use active */}
            <Route
              path="/load-database"
              element={<DatabaseLoader onReady={handleStudentDbLoad} />}
            />
            <Route
              path="/query-planning"
              element={<QueryPlanning studentSchema={activeStudentSchema} />} // Use active
            />
            <Route path="*" element={<CourseList />} />
          </Routes>
        </PGliteProvider>
      ) : (
          // Minimal render if DB is not ready yet (handles loading/error internally)
          <div></div>
      )}
    </BrowserRouter>
  );
}

export default App;
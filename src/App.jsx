// src/App.jsx
import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, BrowserRouter, useNavigate } from 'react-router-dom';
import { PGliteProvider } from "@electric-sql/pglite-react";
import { PGlite } from '@electric-sql/pglite';

// --- Import the SQL content ---
import xdataSql from './xdata_data.sql?raw';

// --- Import page components ---
import QueryPlanning from './QueryPlanning.jsx';
import Minimal from './Minimal.jsx';
import DatabaseLoader from './DatabaseLoader.jsx';
import CourseList from './CourseList.jsx';
import AssignmentListPage from './AssignmentListPage.jsx';
import AddAssignmentPage from './AddAssignmentPage.jsx';
import AssignmentAttemptPage from './AssignmentAttemptPage.jsx';
import SchemaManager from './SchemaManager.jsx';
import AssignmentEditPage from './AssignmentEditPage.jsx';
import QueryPlaygroundPage from './QueryPlaygroundPage.jsx';
import './App.css';

function App() {
  const [db, setDb] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState('');
  const [availableStudentSchemas, setAvailableStudentSchemas] = useState([]); // List of names like "schema_1"
  const [activeStudentSchema, setActiveStudentSchema] = useState(null); // Currently selected name
  const [studentDbMessage, setStudentDbMessage] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(null); // Track selected course
  const dbInstanceRef = useRef(null);

  // Derived state (optional, for clarity or specific UI logic)
  // const hasSchemaForSelectedCourse = availableStudentSchemas.length > 0;

  // --- Initialize Main DB on mount ---
  useEffect(() => {
    let isMounted = true;
    const initializeDb = async () => {
      const dataDir = 'idb://xdata-data'; // Persistence enabled
      if (dbInstanceRef.current) {
        console.log("PGlite instance already exists in ref.");
        if (isMounted && !db) { setDb(dbInstanceRef.current); setDbReady(true); }
        return;
      }
      console.log(`Attempting PGlite initialization with dataDir: ${dataDir}`);
      setDbError('');
      try {
        const instance = new PGlite({ dataDir });
        dbInstanceRef.current = instance;
        console.log("PGlite instance created.");

        // Check if core table exists to determine if initialization is needed
        let needsInitialization = false;
        try {
          const checkResult = await instance.query(`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'xdata_course' LIMIT 1;`);
          needsInitialization = (checkResult.rows.length === 0);
          console.log(`Needs initialization: ${needsInitialization}`);
        } catch (e) {
          console.warn("Could not check for existing table (may happen on first run):", e);
          needsInitialization = true; // Assume initialization needed if check fails
        }

        if (needsInitialization) {
          console.log("Executing xdata_data.sql...");
          await instance.exec(xdataSql); // Execute initial schema/data
          console.log("Database initialized.");
        } else {
          console.log("Skipping initial SQL execution (core table found).");
        }

        if (isMounted) {
          setDb(instance);
          setDbReady(true);
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
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Effect to fetch schemas for the SELECTED course ---
  useEffect(() => {
    const fetchCourseSchemas = async () => {
      if (!db || !selectedCourseId) { // Only run if DB is ready and a course is selected
        setAvailableStudentSchemas([]); // Clear list if no course selected
        setActiveStudentSchema(null);   // Clear active schema too
        console.log("No course selected or DB not ready, clearing schemas.");
        return;
      }

      console.log(`Workspaceing schemas for selected course: ${selectedCourseId}`);
      setStudentDbMessage('Fetching schemas...');
      try {
        // Query metadata table for schemas matching the selected course
        const res = await db.query(
          `SELECT schema_name -- Fetch the name (e.g., "schema_1")
           FROM public.xdata_schemainfo
           WHERE course_id = $1
           ORDER BY schema_id;`, // Order by ID for consistency
          [selectedCourseId] // Use the selected course ID
        );
        const courseSchemaNames = res.rows.map(r => r.schema_name);
        console.log(`Found schemas for course ${selectedCourseId}:`, courseSchemaNames);
        setAvailableStudentSchemas(courseSchemaNames);
        setStudentDbMessage(courseSchemaNames.length > 0 ? '' : 'No schemas found for this course.');

        // Reset active schema if it's not in the list for the new course
        if (!courseSchemaNames.includes(activeStudentSchema)) {
          setActiveStudentSchema(null);
          console.log("Resetting active schema (not found for this course).");
        }

      } catch (err) {
        console.error("Error fetching course schemas:", err);
        setStudentDbMessage(`Error fetching schema list: ${err.message}`);
        setAvailableStudentSchemas([]); // Clear on error
        setActiveStudentSchema(null);   // Clear active on error
      }
    };

    if (dbReady) { // Ensure DB is ready before fetching
        fetchCourseSchemas();
    }
    // Re-run this effect when the db instance changes or the selected course changes
  }, [db, dbReady, selectedCourseId, activeStudentSchema]); // Include activeStudentSchema to re-validate it

  // --- Callback for DatabaseLoader ---
  const handleStudentDbLoad = ({ success, schemaName, message }) => {
    setStudentDbMessage(message);
    if (success && schemaName) {
      // Add the new schema name to the list and make it active
      setAvailableStudentSchemas(prev => [...new Set([...prev, schemaName])].sort((a, b) => {
          const idA = parseInt(a.split('_')[1] || 0);
          const idB = parseInt(b.split('_')[1] || 0);
          return idA - idB;
      })); // Add and sort by extracted ID
      setActiveStudentSchema(schemaName); // Select the newly loaded schema
    }
    // No explicit fetch needed here IF the schema list is for the currently selected course
    // and the loader correctly used that course ID. The list state is updated directly.
  };

  // --- Function to set the active student schema (called by SchemaManager) ---
  const selectActiveStudentSchema = (schemaName) => {
    // Allow selecting null (the "-- Select / None --" option)
    setActiveStudentSchema(schemaName);
    setStudentDbMessage(schemaName ? `Active student schema set to: ${schemaName}` : 'No active student schema selected.');
  };

  // --- Function to delete a student schema ---
  const deleteStudentSchema = async (schemaNameToDelete) => {
    if (!db || !schemaNameToDelete) return;

    // Extract schema_id from the name
    const parts = schemaNameToDelete.split('_');
    const schemaId = parseInt(parts[1], 10);

    if (isNaN(schemaId)) {
        const errorMsg = `Could not parse schema ID from name: "${schemaNameToDelete}"`;
        console.error(errorMsg);
        setStudentDbMessage(`Error: ${errorMsg}`);
        return;
    }

    // Confirmation dialog
    if (!window.confirm(`Are you sure you want to permanently delete schema "${schemaNameToDelete}" (ID: ${schemaId}) and its data? This cannot be undone.`)) {
      return;
    }

    console.log(`Attempting to delete schema: ${schemaNameToDelete} (ID: ${schemaId})`);
    setStudentDbMessage(`Deleting schema ${schemaNameToDelete}...`);

    try {
      // Use transaction for atomicity
      await db.query('BEGIN');

      // 1. Delete from the metadata table USING SCHEMA ID
      console.log(`Deleting metadata entry for schema ID ${schemaId} from xdata_schemainfo...`);
      const metaDeleteResult = await db.query(
        `DELETE FROM public.xdata_schemainfo WHERE schema_id = $1;`, // Use schema_id
        [schemaId] // Pass the parsed ID
      );
      // rowCount might not be standard in pglite results, check rowsAffected or similar if needed
      console.log(`Metadata delete result count (approx): ${metaDeleteResult.rowsAffected ?? 'N/A'}`);

      // 2. Drop the actual schema USING SCHEMA NAME
      console.log(`Dropping schema "${schemaNameToDelete}"...`);
      // Use quotes around schema name for safety, though 'schema_X' is usually fine
      await db.exec(`DROP SCHEMA IF EXISTS "${schemaNameToDelete}" CASCADE;`);

      // Commit transaction
      await db.query('COMMIT');

      const successMsg = `Schema '${schemaNameToDelete}' (ID: ${schemaId}) and its metadata deleted successfully.`;
      console.log(successMsg);
      setStudentDbMessage(successMsg);

      // Update state: remove from available list and clear active if it was deleted
      setAvailableStudentSchemas(prev => prev.filter(s => s !== schemaNameToDelete));
      if (activeStudentSchema === schemaNameToDelete) {
        setActiveStudentSchema(null);
      }

    } catch (err) {
      console.error(`Error deleting schema '${schemaNameToDelete}' (ID: ${schemaId}):`, err);
      // Attempt rollback on error
      try {
           await db.query('ROLLBACK');
           console.log("Transaction rolled back after error.");
       } catch (rollbackError) {
           console.error("Rollback failed:", rollbackError);
       }
      const errorMsg = `Error deleting schema '${schemaNameToDelete}': ${err.message}`;
      setStudentDbMessage(errorMsg);
      // Consider re-fetching schemas to ensure consistency after a failed delete
      // await fetchCourseSchemas(); // Or rely on useEffect dependency trigger
    }
  };

  // --- Navigation Bar ---
  const Navbar = ({ isDbReady }) => (
    <nav className="nav">
      <div className="nav-links-container">
        <Link to="/" className={`navLink ${!isDbReady ? 'disabledLink' : ''}`}>Courses</Link>
        <Link to="/assignments" className={`navLink ${!isDbReady || !selectedCourseId ? 'disabledLink' : ''}`}>Assignments</Link>
        <Link to="/load-database" className={`navLink ${!isDbReady || !selectedCourseId ? 'disabledLink' : ''}`}>Load Student DB</Link>
        {/* Disable links requiring an active student schema if none is selected */}
        <Link to="/query-planning" className={`navLink ${!isDbReady || !activeStudentSchema ? 'disabledLink' : ''}`}>Query Planning</Link>
        <Link to="/browse" className={`navLink ${!isDbReady || !activeStudentSchema ? 'disabledLink' : ''}`}>Browse Tables</Link>
      </div>
    </nav>
  );

  // --- Loading / Error Display for Main DB Init ---
  if (dbError) {
    return (
      <div className="container">
        <h2 className="heading error">Main Database Initialization Failed</h2>
        <p className="error">{dbError}</p>
        <p>Please check console and ensure SQL file is correct.</p>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="container">
        <h2 className="heading">Initializing Main Database...</h2>
        <p>Please wait.</p>
      </div>
    );
  }

  // --- Render Application ---
  return (
    // Ensure BrowserRouter wraps everything that uses routing components (Link, Routes, etc.)
    <BrowserRouter>
      {dbReady ? (
        // Provide the db instance to all descendants via context
        <PGliteProvider db={db}>
          <Navbar isDbReady={dbReady} />

          {/* Conditionally render SchemaManager only if a course is selected */}
          {selectedCourseId && (
              <SchemaManager
                availableSchemas={availableStudentSchemas}
                activeSchema={activeStudentSchema}
                onSelectSchema={selectActiveStudentSchema}
                onDeleteSchema={deleteStudentSchema}
              />
          )}

          {/* Optional: Display student DB load message */}
          {studentDbMessage && <p className="container mx-auto my-2 p-2 text-sm message info">{studentDbMessage}</p>}

          <Routes>
            {/* Course List */}
            <Route path="/" element={<CourseList setSelectedCourseId={setSelectedCourseId} selectedCourseId={selectedCourseId} />} />

            {/* --- Instructor Assignment Management Routes --- */}
            {/* List */}
            <Route path="/assignments" element={<AssignmentListPage selectedCourseId={selectedCourseId} />} />
            {/* Add New */}
            <Route path="/assignments/new" element={<AddAssignmentPage selectedCourseId={selectedCourseId} />} />
            {/* Edit Existing - Added this route */}
            <Route path="/assignments/:assignmentId/edit" element={<AssignmentEditPage selectedCourseId={selectedCourseId} />} />

            {/* --- Student Assignment Attempt Route --- */}
            {/* Attempt specific assignment - Corrected path */}
            <Route path="/assignments/:assignmentId/attempt" element={<AssignmentAttemptPage studentSchema={activeStudentSchema} selectedCourseId={selectedCourseId} />} />
            <Route
              path="/assignments/:assignmentId/question/:questionId/playground"
              element={<QueryPlaygroundPage studentSchema={activeStudentSchema} selectedCourseId={selectedCourseId} />}
            />
            {/* --- Other Tools/Pages --- */}
            <Route path="/browse" element={<Minimal studentSchema={activeStudentSchema} />} />
            <Route path="/query-planning" element={<QueryPlanning studentSchema={activeStudentSchema} />} />
            <Route path="/load-database" element={<DatabaseLoader onReady={handleStudentDbLoad} selectedCourseId={selectedCourseId} />} />

            {/* Fallback Route */}
            <Route path="*" element={<CourseList setSelectedCourseId={setSelectedCourseId} selectedCourseId={selectedCourseId} />} />
          </Routes>
        </PGliteProvider>
      ) : (
        // This part should ideally not be reached if loading state above works
        <div>{dbError ? `Error: ${dbError}` : 'Initializing Database...'}</div>
      )}
    </BrowserRouter>
  );
}

export default App;
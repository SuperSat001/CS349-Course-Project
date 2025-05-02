import { useState } from 'react';
// Import usePGlite hook to get the existing DB instance from App.jsx's context
import { usePGlite } from '@electric-sql/pglite-react';

// Helper function to generate unique schema names (simple example)
const generateSchemaName = () => `student_schema_${Date.now()}`;

// Component now receives the onReady callback
// onReady will be called with { success: boolean, schemaName: string | null, message: string }
const DatabaseLoader = ({ onReady }) => {
  const db = usePGlite(); // Get the existing DB instance from context
  const [ddl, setDdl] = useState('');
  const [data, setData] = useState('');
  const [message, setMessage] = useState('Load student/exam database schema and data into a new, isolated schema...');
  const [isLoading, setIsLoading] = useState(false);

  const readFile = async (file, setter) => {
    if (!file) return;
    try {
      const text = await file.text();
      setter(text);
    } catch (err) {
      console.error("Error reading file:", err);
      setMessage("Error reading file: " + err.message);
    }
  };

  const handleExecute = async () => {
    // 1. Check if the main DB instance from context is available
    if (!db) {
      const errMsg = "Error: Main database connection not available. Cannot load student DB.";
      console.error(errMsg);
      setMessage(errMsg);
      onReady({ success: false, schemaName: null, message: errMsg });
      return;
    }

    // 2. Check for input SQL
    if (!ddl.trim() && !data.trim()) { // Check if at least one input has content
      const errMsg = "Please provide DDL or Data SQL for the student database.";
      setMessage(errMsg);
      onReady({ success: false, schemaName: null, message: errMsg });
      return;
    }

    setIsLoading(true);
    const schemaName = generateSchemaName(); // Generate a unique schema name for isolation
    setMessage(`Attempting to load student database into schema '${schemaName}'...`);

    // Store original search_path to restore later
    let originalSearchPath = 'public';
    try {
        const pathResult = await db.query("SHOW search_path;");
        if (pathResult.rows.length > 0) {
            originalSearchPath = pathResult.rows[0].search_path;
        }
    } catch (e) {
        console.warn("Could not get original search_path", e);
    }

    let success = false;
    let finalMessage = '';

    try {
      // 3. Create the new schema
      await db.query(`CREATE SCHEMA ${schemaName};`);
      setMessage(prev => prev + `\nSchema created.`);

      // 4. Set the search path to target the new schema primarily
      // This makes subsequent CREATE TABLE, COPY etc target the new schema
      await db.query(`SET search_path TO ${schemaName}, public;`);
      setMessage(prev => prev + `\nSearch path set to '${schemaName}'. Executing DDL/Data...`);

      // 5. Execute DDL and Data using db.exec to handle batches/COPY
      if (ddl.trim()) {
        setMessage(prev => prev + `\nExecuting DDL...`);
        await db.exec(ddl);
        setMessage(prev => prev + `\nDDL executed.`);
      }
      if (data.trim()) {
        setMessage(prev => prev + `\nExecuting Data (COPY/INSERT)...`);
        await db.exec(data);
        setMessage(prev => prev + `\nData executed.`);
      }

      // 6. Loading finished successfully
      finalMessage = `Student database loaded successfully into schema '${schemaName}'. You can now use the Query Planning tools.`;
      setMessage(finalMessage);
      success = true;
      onReady({ success: true, schemaName: schemaName, message: finalMessage });

    } catch (err) {
      console.error(`Student DB loading error into schema '${schemaName}':`, err);
      finalMessage = `Error loading student database into schema '${schemaName}': ${err.message}. Check console.`;
      setMessage(finalMessage);
      success = false;
      // Attempt to clean up the failed schema (optional, might fail)
      try {
        await db.query(`SET search_path TO public;`); // Reset path first
        await db.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`);
        setMessage(prev => prev + `\nAttempted to clean up failed schema '${schemaName}'.`);
      } catch (cleanupError) {
        console.error("Schema cleanup failed:", cleanupError);
        setMessage(prev => prev + `\nSchema cleanup failed: ${cleanupError.message}`);
      }
      onReady({ success: false, schemaName: null, message: finalMessage });

    } finally {
      setIsLoading(false);
      // 7. Always try to reset search_path
      try {
        await db.query(`SET search_path TO public;`); // Restore original path
        console.log(`Search path restored to: public`);
      } catch (e) {
        console.error("Failed to restore public search_path", e);
        // Fallback if original path is unknown or restoration fails
      }
    }
  };

  return (
    <div className="container">
      <h2 className="heading">Load Student/Exam Database</h2>
      <p className="text-sm text-gray-400 mb-4">Load a specific schema (DDL) and data (INSERT/COPY) for an assignment or exam. This will be loaded into an isolated schema within the current database instance.</p>

      {/* Inputs for DDL and Data */}
      <div className="mb-6">
        <label className="block font-semibold mb-2">Student DB DDL (Schema: CREATE TABLE, etc.)</label>
        <textarea
          rows={8}
          className="textarea"
          placeholder="Paste student DDL SQL..."
          value={ddl}
          onChange={(e) => setDdl(e.target.value)}
          disabled={isLoading}
        />
        <input
          type="file"
          accept=".sql"
          className="mt-2 text-sm file-input"
          onChange={(e) => readFile(e.target.files[0], setDdl)}
          disabled={isLoading}
        />
      </div>

      <div className="mb-6">
        <label className="block font-semibold mb-2">Student DB Data (Data: INSERT INTO, COPY, etc.)</label>
        <textarea
          rows={8}
          className="textarea"
          placeholder="Paste student Data SQL..."
          value={data}
          onChange={(e) => setData(e.target.value)}
          disabled={isLoading}
        />
        <input
          type="file"
          accept=".sql" // Ensure no trailing 's'
          className="mt-2 text-sm file-input"
          onChange={(e) => readFile(e.target.files[0], setData)}
          disabled={isLoading}
        />
      </div>

      <button
        onClick={handleExecute}
        className="button bg-green-600 hover:bg-green-700 text-white"
        disabled={isLoading || !db} // Disable if main DB isn't ready or already loading
      >
        {isLoading ? 'Loading Student DB...' : 'Load Student DB into New Schema'}
      </button>

      {/* Message Area */}
      <p className="message whitespace-pre-wrap mt-4">{message}</p>
    </div>
  );
};

export default DatabaseLoader;
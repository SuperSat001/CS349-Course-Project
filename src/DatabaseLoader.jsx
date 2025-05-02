// src/DatabaseLoader.jsx
import { useState } from 'react';
import { usePGlite } from '@electric-sql/pglite-react';


const DatabaseLoader = ({ onReady, selectedCourseId }) => { // Added selectedCourseId
  const db = usePGlite();
  const [ddl, setDdl] = useState('');
  const [data, setData] = useState('');
  const [message, setMessage] = useState('Load student/exam database schema and data into a new, isolated schema...');
  const [isLoading, setIsLoading] = useState(false);

  const readFile = async (file, setter) => {
    // ... (readFile function remains the same)
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
    // 1. Checks
    if (!db) {
      const errMsg = "Error: Main database connection not available.";
      setMessage(errMsg);
      onReady({ success: false, schemaName: null, message: errMsg });
      return;
    }
     if (!selectedCourseId) {
        const errMsg = "Error: No course selected. Cannot associate student DB.";
        setMessage(errMsg);
        onReady({ success: false, schemaName: null, message: errMsg });
        return;
     }
    if (!ddl.trim() && !data.trim()) {
      setMessage("Please provide DDL (schema) or Data SQL, or both.");
      onReady({ success: false, schemaName: null, message: "No SQL provided." });
      return;
    }

    setIsLoading(true);
    setMessage(`Preparing to load schema for course ${selectedCourseId}...`);

    let transactionStarted = false;
    let schemaName = ''; // Define schemaName outside try block for cleanup/logging
    let nextSchemaId = 0; // Define nextSchemaId outside try block

    try {
      await db.query('BEGIN');
      transactionStarted = true;

      const maxIdResult = await db.query(
        `SELECT MAX(schema_id) as max_id FROM public.xdata_schemainfo WHERE course_id = $1`,
        [selectedCourseId]
    );
    nextSchemaId = (maxIdResult.rows[0]?.max_id || 0) + 1;
    console.log(`Next schema_id for course ${selectedCourseId}: ${nextSchemaId}`);

    schemaName = `schema_${nextSchemaId}`;
    setMessage(`Creating schema '${schemaName}' (ID: ${nextSchemaId}) for course ${selectedCourseId} and loading data...`);

      // 2. Create the schema
      await db.query(`CREATE SCHEMA ${schemaName};`);
      console.log(`Schema ${schemaName} created.`);

      // 3. Set search_path LOCALLY for this transaction
      // This ensures CREATE TABLE, INSERT, etc. target the new schema
      await db.query(`SET LOCAL search_path TO ${schemaName}, public;`);
      console.log(`Search path set locally to ${schemaName}, public.`);

      // 4. Execute DDL using db.exec()
      if (ddl.trim()) {
        console.log(`Executing DDL for ${schemaName}...`);
        await db.exec(ddl); // <<< Use exec() here
        console.log(`DDL executed for ${schemaName}.`);
      }

      // 5. Execute Data using db.exec()
      if (data.trim()) {
        console.log(`Executing Data SQL for ${schemaName}...`);
        await db.exec(data); // <<< Use exec() here
        console.log(`Data SQL executed for ${schemaName}.`);
      }

      // 6. IMPORTANT: Record the schema in your metadata table
      // Associate it with the currently selected course
      console.log(`Recording schema ${schemaName} for course ${selectedCourseId} in metadata...`);
      await db.query(
        `INSERT INTO public.xdata_schemainfo
           (course_id,schema_id, schema_name)
         VALUES ($1,$2,$3);`,
         [
             selectedCourseId, // $1: course_id
             nextSchemaId,      // $2: schema_id (the generated one)
             schemaName,       // $3: schema_name (the generated one)
          ]
     );
     // Note: This still omits schema_id which is NOT NULL in your definition.
     // This query might fail if schema_id has no default value.
     // You may need to provide a value for schema_id based on your application logic.

    console.log(`Metadata recorded for ${schemaName}.`);


      // 7. Commit the transaction
      await db.query('COMMIT');
      console.log(`Transaction committed for ${schemaName}.`);
      transactionStarted = false; // Reset flag

      const successMsg = `Successfully loaded student DB into schema '${schemaName}' and associated with course ${selectedCourseId}.`;
      setMessage(successMsg);
      onReady({ success: true, schemaName: schemaName, message: successMsg });

    } catch (error) {
      console.error(`Error loading student DB into schema '${schemaName}':`, error);
      const errMsg = `Error loading student DB into schema '${schemaName}': ${error.message}`;
      setMessage(errMsg);

      // Rollback if transaction was started
      if (transactionStarted) {
         try {
             console.warn(`Error occurred, rolling back transaction for ${schemaName}...`);
             await db.query('ROLLBACK');
             console.log(`Transaction rolled back for ${schemaName}.`);
          } catch (rollbackError) {
             console.error("Rollback failed:", rollbackError);
             setMessage(errMsg + ` | Rollback failed: ${rollbackError.message}`);
          }
      }

      // Attempt to drop the potentially partially created schema ONLY if it wasn't a commit failure
      if (!error.message.toLowerCase().includes('commit')) {
          try {
              console.warn(`Attempting to clean up by dropping schema ${schemaName}...`);
              // Use exec for DROP SCHEMA IF EXISTS just in case query fails similarly
              await db.exec(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`);
              console.log(`Schema ${schemaName} dropped after error.`);
          } catch (dropError) {
              console.error(`Failed to drop schema ${schemaName} after error:`, dropError);
          }
      }

      onReady({ success: false, schemaName: null, message: errMsg });

    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="container">
          <h2 className="heading">Load Student/Exam Database</h2>

          {/* Added check for selectedCourseId */}
           {!selectedCourseId && (
              <p className="message error">Please select a course before loading a student database.</p>
           )}


          <div className="mb-4">
            <label className="block font-semibold mb-2">Student DB Schema (DDL: CREATE TABLE, etc.)</label>
            <textarea
              rows={8}
              className="textarea"
              placeholder="Paste student DDL SQL..."
              value={ddl}
              onChange={(e) => setDdl(e.target.value)}
              disabled={isLoading || !selectedCourseId} // Disable if no course selected
            />
            <input
              type="file"
              accept=".sql"
              className="mt-2 text-sm file-input"
              onChange={(e) => readFile(e.target.files[0], setDdl)}
              disabled={isLoading || !selectedCourseId} // Disable if no course selected
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
              disabled={isLoading || !selectedCourseId} // Disable if no course selected
            />
            <input
              type="file"
              accept=".sql" // Ensure no trailing 's'
              className="mt-2 text-sm file-input"
              onChange={(e) => readFile(e.target.files[0], setData)}
              disabled={isLoading || !selectedCourseId} // Disable if no course selected
            />
          </div>

          <button
            onClick={handleExecute}
            className="button bg-green-600 hover:bg-green-700 text-white"
            // Disable if loading, main DB not ready, or no course selected
            disabled={isLoading || !db || !selectedCourseId}
          >
            {isLoading ? 'Loading Student DB...' : 'Load Student DB into New Schema'}
          </button>

          {/* Message Area */}
          <p className={`message whitespace-pre-wrap mt-4 ${message.includes('Error:') ? 'error' : message.includes('Successfully') ? 'success' : 'info'}`}>
            {message}
          </p>
      </div>
  );
};

export default DatabaseLoader;
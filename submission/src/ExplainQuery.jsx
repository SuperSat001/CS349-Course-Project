import { useState } from 'react';
// Import usePGlite hook to get the existing DB instance
import { usePGlite } from "@electric-sql/pglite-react";

// Accept studentSchema prop from QueryPlanning
const ExplainQuery = ({ studentSchema, queryHistory, setQueryHistory }) => {
  const db = usePGlite(); // Get the single DB instance
  const [plan, setPlan] = useState("");
  const [selectedQuery, setSelectedQuery] = useState("");
  const [inputQuery, setInputQuery] = useState("");
  const [error, setError] = useState("");

  // Check if DB connection from context is ready
  if (!db) {
    return (
      <div className="container mt-4">
        <p className="error">Database connection not available.</p>
      </div>
    );
  }

  const runExplain = async () => {
    setError(""); // Clear previous errors
    setPlan(""); // Clear previous plan
    setSelectedQuery(""); // Clear previous executed query display

    if (!inputQuery.trim()) {
      setError("Please enter a query.");
      return;
    }

    // --- Check if a student schema has been loaded ---
    if (!studentSchema) {
      setError("No student database schema loaded. Please use 'Load Student DB' first.");
      return;
    }
    // --- End check ---

    const queryToExplain = inputQuery; // The actual query entered by the user
    const explainSql = `EXPLAIN ANALYZE ${queryToExplain}`;
    setSelectedQuery(explainSql); // Show the EXPLAIN command itself

     // Update query history
    setQueryHistory((prevHistory) => {
      const updatedHistory = [queryToExplain, ...prevHistory];
      return updatedHistory.slice(0, 10); // Keep only the last 10 queries
    });

    console.log(queryHistory);

    // Store original search_path to restore later
    let originalSearchPath = 'public';
    try {
        const pathResult = await db.query("SHOW search_path;");
        if (pathResult?.rows?.length > 0) {
            originalSearchPath = pathResult.rows[0].search_path;
        }
    } catch (e) { console.warn("Could not get original search_path", e); }


    try {
      // --- Set search_path for this transaction/query execution ---
      await db.query(`SET search_path TO ${studentSchema}, public;`); // Prioritize student schema
      console.log(`Search path set to ${studentSchema}, public for EXPLAIN`);

      const result = await db.query(explainSql); // Run EXPLAIN against the student schema

      // --- Reset search_path immediately after query ---
      await db.query(`SET search_path TO ${originalSearchPath};`);
      console.log(`Search path restored to ${originalSearchPath}`);

      // Process results
      if (result.rows.length > 0) {
        const explainAnalyzePlan = result.rows.map(row => row['QUERY PLAN']).join('\n');
        setPlan(explainAnalyzePlan);
      } else {
        setError(`Explain query ran for schema '${studentSchema}' but returned no plan data. Check query syntax.`);
      }
      console.log("Explain result:", result);

    } catch (err) {
      console.error(`Error running EXPLAIN ANALYZE on schema ${studentSchema}:`, err);
      setError(`Error running EXPLAIN ANALYZE on schema '${studentSchema}': ${err.message}.`);
      setPlan(""); // Clear plan on error

      // --- Attempt to reset search_path even on error ---
      try {
        await db.query(`SET search_path TO ${originalSearchPath};`);
        console.log(`Search path restored to ${originalSearchPath} after error.`);
      } catch (e) {
          console.error("Failed to restore search_path after error", e);
          try { await db.query(`SET search_path TO public;`); } catch (e2) {} // Fallback
      }
    }
  };

  return (
    <div className="mt-4">
      <h3 className="text-xl font-bold mb-2">Explain Query on Student Schema</h3>
      {/* Add info about which schema is active */}
      {studentSchema ? (
         <p className="text-sm text-yellow-400 mb-2">
           Currently targeting student schema: <strong>{studentSchema}</strong>
         </p>
       ) : (
         <p className="text-sm text-red-500 mb-2">
           No student schema loaded. Use 'Load Student DB'.
         </p>
       )}
      <textarea
        rows={5}
        className="textarea font-mono text-sm"
        placeholder={`Enter query to run against schema '${studentSchema || '...'}' (e.g., SELECT * FROM your_table)...`}
        value={inputQuery}
        onChange={(e) => setInputQuery(e.target.value)}
        disabled={!studentSchema || !db} // Disable if no student schema or DB issue
      />
      <button
        onClick={runExplain}
        className="button bg-blue-600 hover:bg-blue-700 text-white mt-2"
        disabled={!studentSchema || !db} // Disable if no student schema or DB issue
      >
        Run EXPLAIN ANALYZE
      </button>

      {error && <p className="error mt-2">{error}</p>}

      <h4 className="text-lg font-semibold mt-4 mb-1">Query Plan:</h4>
      <pre className="pre">{plan || `Load a student DB and enter query to see plan for schema '${studentSchema || '...'}'...`}</pre>

      {selectedQuery && (
        <div className="mt-4 text-xs font-mono text-gray-400">
          <strong>Executed Command:</strong>
          {/* Use pre-wrap to show multi-line EXPLAIN commands nicely */}
          <div style={{ whiteSpace: "pre-wrap", marginTop: "0.5em" }}>{selectedQuery}</div>
        </div>
      )}
    </div>
  );
};

export default ExplainQuery;
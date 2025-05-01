// Replace the current ExplainQuery component with the following:
import { useState } from 'react'
import { usePGlite } from "@electric-sql/pglite-react"

const ExplainQuery = () => {
  const db = usePGlite ? usePGlite() : null; // Still check if usePGlite hook exists
  const [plan, setPlan] = useState("");
  const [selectedQuery, setSelectedQuery] = useState("");
  const [inputQuery, setInputQuery] = useState("");
  const [error, setError] = useState("");

  // Render error if db hook didn't return a valid connection
   if (!db) {
     return (
       <div className="container"> 
         <p className="error">Database connection not available for Explain Query.</p> 
       </div>
     );
   }

  const runExplain = async () => {
    if (!inputQuery.trim()) {
      setError("Please enter a query.");
      return;
    }
    // Use JSON format for structured output
    const query = `EXPLAIN ANALYZE ${inputQuery}`;
    setSelectedQuery(query);
    setError(""); // Clear previous errors
    setPlan(""); // Clear previous plan
    try {
      const result = await db.query(query);
      // Extract and format the JSON plan
      if (result.rows.length > 0 ) {
        const explainAnalyze = result.rows.map(row => row['QUERY PLAN']).join('\n');
        // Pretty-print the JSON output
        setPlan(explainAnalyze);
      } else {
        setError("Explain query ran but returned no plan data. Check query syntax.");
      }
      console.log("Explain result:", result);
    } catch (err) {
      console.error("Error running EXPLAIN ANALYZE:", err);
      setError(`Error running EXPLAIN ANALYZE: ${err.message}`);
      setPlan(""); // Clear plan on error
    }
  };

  return (
    <div className="mt-4">
       <h3 className="text-xl font-bold mb-2">Explain Query (JSON Output)</h3>
      <textarea
        rows={5}
        className="textarea font-mono text-sm" 
        placeholder="Enter query (e.g., SELECT * FROM xdata_course)..."
        value={inputQuery}
        onChange={(e) => setInputQuery(e.target.value)}
      />
      <button
        onClick={runExplain}
        className="button bg-blue-600 hover:bg-blue-700 text-white mt-2" 
      >
        Run EXPLAIN ANALYZE
      </button>

      
      {error && <p className="error">{error}</p>}

      <h4 className="text-lg font-semibold mt-4 mb-1">Query Plan:</h4>
      
      <pre className="pre">{plan || "Enter query and run EXPLAIN..."}</pre> 

      
      {selectedQuery && (
        <div className="mt-4 text-xs font-mono text-gray-400">
          <strong>Executed Query:</strong>
          <div style={{ whiteSpace: "pre-wrap", marginTop: "0.5em" }}>{selectedQuery}</div>
        </div>
      )}
    </div>
  );
};

export default ExplainQuery;
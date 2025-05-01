import { useState } from 'react'
import { usePGlite } from '@electric-sql/pglite-react'

const SortOptions = () => {
  const db = usePGlite ? usePGlite() : null; 
  const [currentSort, setCurrentSort] = useState("default");
  const [message, setMessage] = useState('');

  if (!db) {
    return (
      <div className="mt-6 p-4 border border-gray-700 rounded-lg">
        <p className="error">Database connection not available for Sort Options.</p> 
      </div>
    );
  }

  // Reset sort flags to default (both ON)
  const resetSortFlags = async () => {
     setMessage(''); // Clear previous messages
    try {
      await db.query(`SET enable_sort = on;`);             
      await db.query(`SET enable_incremental_sort = on;`); 
      setCurrentSort("default");
      setMessage("Sort flags reset to default (ON).");
    } catch (err) {
       console.error("Error resetting sort flags", err);
       setMessage(`Error resetting flags: ${err.message}`);
    }
  };

  // Define settings to disable specific sort types
  const sortSettings = {
    sort_only: [`SET enable_incremental_sort = off;`], 
    incremental_only: [`SET enable_sort = off;`],
  };

  // Force a specific sort strategy
  const forceSort = async (type) => {
    // Reset flags first for a clean state
    await resetSortFlags();
    setMessage('');
    if (!sortSettings[type]) {
        console.error(`Invalid sort type: ${type}`);
        setMessage(`Error: Invalid sort type specified.`);
        return;
    }
    try {
      // Apply the specific settings for the chosen sort type
      for (const stmt of sortSettings[type]) {
        await db.query(stmt);
      }
      setCurrentSort(type); // Update state only after successful query execution
      setMessage(`Planner set to prefer: ${type}. Run EXPLAIN to see effect.`);
    } catch (err) {
      console.error("Failed to set sort flags", err);
      setMessage(`Failed to set flags for ${type}: ${err.message}`);
    }
  };

  // Render sort option buttons
  return (
    <div className="mt-6 p-4 border border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Sort Strategy Options</h3>
      <p className="text-sm mb-3">Current Sort Preference: <strong>{currentSort}</strong></p>
      <div className="flex flex-wrap gap-2">
        <button
          className="button text-sm bg-indigo-600 hover:bg-indigo-700 text-white" 
          onClick={() => forceSort("sort_only")}
        >
          Force Plain Sort
        </button>
        <button
          className="button text-sm bg-indigo-600 hover:bg-indigo-700 text-white" 
          onClick={() => forceSort("incremental_only")}
        >
          Force Incremental Sort
        </button>
        <button
          className="button text-sm bg-gray-600 hover:bg-gray-700 text-white" 
          onClick={resetSortFlags}
        >
          Reset Sorts
        </button>
      </div>
       {message && <p className={`message mt-2 text-sm ${message.includes("Error") ? 'error' : 'success'}`}>{message}</p>}
    </div>
  );
};

export default SortOptions;


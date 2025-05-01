import { useState } from 'react'
import { usePGlite } from '@electric-sql/pglite-react'

const JoinOptions = () => {
  const db = usePGlite ? usePGlite() : null; // check if usePGlite hook exists
  const [currentJoin, setCurrentJoin] = useState("default");
  const [message, setMessage] = useState('');

  // Render error if db hook didn't return a valid connection
  if (!db) {
    return (
      <div className="mt-6 p-4 border border-gray-700 rounded-lg">
        <p className="error">Database connection not available for Join Options.</p> {/* Use direct class name */}
      </div>
    );
  }

  // Reset all join flags to ON
  const resetJoinFlags = async () => {
    setMessage(''); // Clear previous messages
    try {
      await db.query(`SET enable_nestloop = on;`); 
      await db.query(`SET enable_mergejoin = on;`); 
      await db.query(`SET enable_hashjoin = on;`);  
      setCurrentJoin("default");
      setMessage("All join flags reset to ON.");
    } catch (err) {
      console.error("Error resetting join flags", err);
      setMessage(`Error resetting flags: ${err.message}`);
    }
  };

  // Define settings to disable other join types
  const joinSettings = {
    nestloop: [
      `SET enable_mergejoin = off;`, 
      `SET enable_hashjoin = off;`   
    ],
    mergejoin: [
      `SET enable_nestloop = off;`,  
      `SET enable_hashjoin = off;`   
    ],
    hashjoin: [
      `SET enable_nestloop = off;`,  
      `SET enable_mergejoin = off;` 
    ],
  };

  // Force a specific join type
  const forceJoin = async (type) => {
    // reset flags first to ensure a clean state
    await resetJoinFlags();
    setMessage(''); // Clear previous messages after reset potentially sets one
    // Check if the type is valid before proceeding
    if (!joinSettings[type]) {
        console.error(`Invalid join type: ${type}`);
        setMessage(`Error: Invalid join type specified.`);
        return;
    }
    try {
      // Apply the specific settings for the chosen join type
      for (const stmt of joinSettings[type]) {
        await db.query(stmt);
      }
      setCurrentJoin(type); // Update state only after successful query execution
      setMessage(`Planner set to prefer: ${type}. Run EXPLAIN to see effect.`);
    } catch (err) {
      console.error(`Failed to set join flags for ${type}`, err);
      setMessage(`Failed to set flags for ${type}: ${err.message}`);
    }
  };

  // Render join option buttons
  return (
    <div className="mt-6 p-4 border border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Join Strategy Options</h3>
      <p className="text-sm mb-3">Current Join Preference: <strong>{currentJoin}</strong></p>
      <div className="flex flex-wrap gap-2">
         {/* Combine base 'button' class with specific styling classes */}
        <button
          className="button text-sm bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => forceJoin("nestloop")}
        >
          Force NestLoop
        </button>
        <button
          className="button text-sm bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => forceJoin("mergejoin")}
        >
          Force Merge Join
        </button>
        <button
          className="button text-sm bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => forceJoin("hashjoin")}
        >
          Force Hash Join
        </button>
        <button
          className="button text-sm bg-gray-600 hover:bg-gray-700 text-white"
          onClick={resetJoinFlags}
        >
          Reset Joins
        </button>
      </div>
       {message && <p className={`message mt-2 text-sm ${message.includes("Error") ? 'error' : 'success'}`}>{message}</p>}
    </div>
  );
};

export default JoinOptions;
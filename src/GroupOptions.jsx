import { useState } from 'react'
import { usePGlite } from '@electric-sql/pglite-react'

const GroupOptions = () => {
  const db = usePGlite ? usePGlite() : null; 
  const [currentGroup, setCurrentGroup] = useState("default");
  const [message, setMessage] = useState('');

  if (!db) {
    return (
      <div className="mt-6 p-4 border border-gray-700 rounded-lg">
        <p className="error">Database connection not available for Group Options.</p> 
      </div>
    );
  }

  const resetGroupFlags = async () => {
     setMessage(''); // Clear previous messages
    try {
      await db.query(`SET enable_hashagg = on;`);
      setCurrentGroup("default");
      setMessage("Aggregation flags reset to default (Hash ON).");
    } catch (err) {
       console.error("Error resetting aggregation flags", err);
       setMessage(`Error resetting flags: ${err.message}`);
    }
  };

  const forceGroup = async (type) => {
    setMessage(''); // Clear previous messages
    try {
      if (type === "groupagg") {
        // Force Group Aggregate by disabling Hash Aggregate
        await db.query(`SET enable_hashagg = off;`);
        setCurrentGroup(type); // Update state after successful query
        setMessage(`Planner set to force Group Aggregate (Hash OFF).`);
      } else { // hashagg case
         // Prefer Hash Aggregate by enabling it
         await db.query(`SET enable_hashagg = on;`);
         setCurrentGroup("hashagg"); // Update state after successful query
         setMessage(`Planner set to prefer Hash Aggregate (Hash ON).`);
      }
       setMessage(prev => prev + " Run EXPLAIN to see effect.");
    } catch (err) {
      console.error("Failed to set aggregation flags", err);
       setMessage(`Failed to set flags for ${type}: ${err.message}`);

    }
  };

  // Render aggregation option buttons
  return (
    <div className="mt-6 p-4 border border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Aggregation Strategy Options</h3>
      <p className="text-sm mb-3">Current Aggregation Preference: <strong>{currentGroup}</strong></p>
      <div className="flex flex-wrap gap-2">
        
        <button
          className="button text-sm bg-pink-600 hover:bg-pink-700 text-white" 
          onClick={() => forceGroup("hashagg")}
        >
            Prefer Hash Aggregate
        </button>
        <button
          className="button text-sm bg-pink-600 hover:bg-pink-700 text-white" 
          onClick={() => forceGroup("groupagg")}
        >
            Force Group Aggregate
        </button>
        <button
          className="button text-sm bg-gray-600 hover:bg-gray-700 text-white" 
          onClick={resetGroupFlags}
        >
            Reset Aggregation
        </button>
      </div>
       
       {message && <p className={`message mt-2 text-sm ${message.includes("Error") ? 'error' : 'success'}`}>{message}</p>}
    </div>
  );
};

export default GroupOptions;



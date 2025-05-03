import { useState } from 'react'
import { usePGlite } from '@electric-sql/pglite-react'

const ScanOptions = () => {
  // Removed PGLITE_REACT_LOADED check
  const db = usePGlite ? usePGlite() : null; // Still check if usePGlite hook exists
  const [currentScan, setCurrentScan] = useState("default");
  const [message, setMessage] = useState('');

  // Render error if db hook didn't return a valid connection
  if (!db) {
    return (
      <div className="mt-6 p-4 border border-gray-700 rounded-lg">
        <p className="error">Database connection not available for Scan Options.</p> {/* Use direct class name */}
      </div>
    );
  }

  // Reset all planner scan-related flags to ON
  const resetPlannerFlags = async () => {
    setMessage(''); // Clear previous messages
    try {
      await db.query(`SET enable_seqscan = on;`);    
      await db.query(`SET enable_indexscan = on;`);  
      await db.query(`SET enable_bitmapscan = on;`); 
      await db.query(`SET enable_tidscan = on;`);    
      setCurrentScan("default");
      setMessage("All scan flags reset to ON.");
      console.log("All scan flags reset to ON");
    } catch (err) {
      console.error("Error resetting planner flags", err);
      setMessage(`Error resetting flags: ${err.message}`);
    }
  };

  // Define settings to disable other scan types
  const scanSettings = {
    seqscan: [
      `SET enable_indexscan = off;`,  
      `SET enable_bitmapscan = off;`, 
      `SET enable_tidscan = off;`,    
    ],
    indexscan: [
      `SET enable_seqscan = off;`,    
      `SET enable_bitmapscan = off;`, 
      `SET enable_tidscan = off;`,    
    ],
    bitmapscan: [
      `SET enable_seqscan = off;`,    
      `SET enable_indexscan = off;`, 
      `SET enable_tidscan = off;`,    
    ],
    tidscan: [
      `SET enable_seqscan = off;`,    
      `SET enable_indexscan = off;`, 
      `SET enable_bitmapscan = off;`, 
    ],
   };

   // Force a specific scan type
   const forceScanType = async (scanType) => {
    // Reset flags first to ensure a clean starting point
    await resetPlannerFlags();
    setMessage(''); // Clear message after reset potentially sets one
     // Check if the type is valid before proceeding
    if (!scanSettings[scanType]) {
        console.error(`Invalid scan type: ${scanType}`);
        setMessage(`Error: Invalid scan type specified.`);
        return;
    }
    try {
      // Apply the specific settings for the chosen scan type
      for (const stmt of scanSettings[scanType]) {
        await db.query(stmt);
      }
      setCurrentScan(scanType); // Update state only after successful query execution
      setMessage(`Planner set to prefer: ${scanType}. Run EXPLAIN to see effect.`);
      console.log(`Planner set to prefer: ${scanType}`);
    } catch (err) {
      console.error("Failed to set planner flags", err);
      setMessage(`Failed to set flags for ${scanType}: ${err.message}`);
    }
  };

  // Render scan option buttons
  return (
    <div className="mt-6 p-4 border border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Scan Preference Options</h3>
      <p className="text-sm mb-3">Current Scan Preference: <strong
        style={{
          fontWeight: '600',
          color: '#10b981', // emerald green
          backgroundColor: '#064e3b',
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '0.95em',
        }}
      >
        {currentScan}</strong></p>
      {/* <div className="flex flex-wrap gap-2"> */}
      <div style={{
                    display: 'flex',
                    gap: '20px',
                    flexWrap: 'wrap',
                    // width: 100%,
                  }}>
        <button
          className="button text-sm bg-teal-600 hover:bg-teal-700 text-white" 
          onClick={() => forceScanType("seqscan")}
        >
          Force Seq Scan
        </button>
        <button
          className="button text-sm bg-teal-600 hover:bg-teal-700 text-white" 
          onClick={() => forceScanType("indexscan")}
        >
          Force Index Scan
        </button>
        <button
          className="button text-sm bg-teal-600 hover:bg-teal-700 text-white" 
          onClick={() => forceScanType("bitmapscan")}
        >
          Force Bitmap Scan
        </button>
        <button
          className="button text-sm bg-teal-600 hover:bg-teal-700 text-white" 
          onClick={() => forceScanType("tidscan")}
        >
          Force TID Scan
        </button>
        <button
          className="button text-sm bg-gray-600 hover:bg-gray-700 text-white" 
          onClick={resetPlannerFlags}
        >
          Reset Scans
        </button>
      </div>
      {message && <p className={`message mt-2 text-sm ${message.includes("Error") ? 'error' : 'success'}`}>{message}</p>}
    </div>
  );
};

export default ScanOptions;



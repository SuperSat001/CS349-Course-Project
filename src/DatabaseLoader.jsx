import { useState } from 'react';
import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';

const DatabaseLoader = ({ onReady }) => {
  const [ddl, setDdl] = useState('');
  const [data, setData] = useState('');
  const [message, setMessage] = useState('Awaiting database input...');
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
    if (!PGlite) {
        setMessage("Error: PGlite library not available on window object.");
        console.error("Cannot execute: PGlite not found on window object.");
        return;
    }
    if (!ddl && !data) {
      setMessage("Please provide DDL or Data SQL to load.");
      return;
    }
    setIsLoading(true);
    setMessage("Initializing database...");
    try {
      const db = await PGlite.create();
      setMessage("Database instance created. Executing SQL...");

      const runBatch = async (sqlText, type) => {
        if (!sqlText.trim()) return;
        setMessage(prev => prev + `\nStarting ${type} execution...`);
        const statements = sqlText.split(/;\s*$/gm).map(stmt => stmt.trim()).filter(stmt => stmt.length > 0);
        let executedCount = 0;
        for (const stmt of statements) {
          try {
            if (stmt.toUpperCase().startsWith('COPY') && stmt.toUpperCase().includes('FROM STDIN')) {
              const dataBlockMatch = sqlText.substring(sqlText.indexOf(stmt) + stmt.length).match(/^\s*([\s\S]*?)\n\\\.\s*$/m);
              if (dataBlockMatch && dataBlockMatch[1]) {
                const copyData = dataBlockMatch[1];
                console.warn(`Skipping direct execution of COPY FROM STDIN. Data:\n${copyData}`);
                setMessage(prev => prev + `\nSkipped direct execution of: ${stmt.substring(0, 50)}... (Manual handling needed)`);
              } else {
                console.warn(`Could not extract data for COPY command: ${stmt}`);
                setMessage(prev => prev + `\nCould not parse data for: ${stmt.substring(0, 50)}...`);
              }
            } else {
              await db.query(stmt);
              executedCount++;
            }
          } catch (err) {
            console.error(`Error executing statement: ${stmt.substring(0, 100)}...`, err);
            setMessage(prev => prev + `\nError on: ${stmt.substring(0, 50)}... - ${err.message}`);
          }
        }
        setMessage(prev => prev + `\nFinished ${type} execution. Attempted ${executedCount} statements.`);
      };

      await runBatch(ddl, 'DDL');
      await runBatch(data, 'Data');

      setMessage("Database loading process finished. Check console/messages for details. Database is now ready.");
      onReady(db);

    } catch (err) {
      console.error("Database initialization or execution error:", err);
      setMessage("Error initializing/loading database: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container"> 
      <h2 className="heading">Database Loader</h2> 

      <div className="mb-6">
        <label className="block font-semibold mb-2">DDL Input (Schema: CREATE TABLE, etc.)</label>
        <textarea
          rows={8}
          className="textarea" 
          placeholder="Paste your DDL SQL..."
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
        <label className="block font-semibold mb-2">Data Input (Data: INSERT INTO, COPY, etc.)</label>
        <textarea
          rows={8}
          className="textarea"
          placeholder="Paste your Data SQL..."
          value={data}
          onChange={(e) => setData(e.target.value)}
          disabled={isLoading} 
        />
        <input
          type="file"
          accept=".sql"s
          className="mt-2 text-sm file-input"
          onChange={(e) => readFile(e.target.files[0], setData)}
          disabled={isLoading} 
        />
      </div>

      <button
        onClick={handleExecute}
        className="button bg-green-600 hover:bg-green-700 text-white"
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : 'Load Database'}
      </button>

      
      <p className="message">{message}</p> 
    </div>
  );
};

export default DatabaseLoader;

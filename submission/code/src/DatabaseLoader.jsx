import { useState } from 'react';
import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';

const DatabaseLoader = ({ onReady }) => {
  const [ddl, setDdl] = useState('');
  const [data, setData] = useState('');
  const [message, setMessage] = useState('Awaiting database input...');

  const readFile = async (file, setter) => {
    const text = await file.text();
    setter(text);
  };

  const handleExecute = async () => {
    setMessage("Initializing database...");
    const db = await PGlite.create({ extensions: { live } });

    try {
      const runBatch = async (sqlText) => {
        const statements = sqlText
          .split(/;\s*$/gm)
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);

        for (const stmt of statements) {
          await db.query(stmt);
        }
      };

      await runBatch(ddl);
      setMessage("DDL executed. Now inserting data...");
      await runBatch(data);
      setMessage("Database ready!");
      onReady(db);
    } catch (err) {
      console.error("Execution error:", err);
      setMessage("Error: " + err.message);
    }
  };

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Database Loader</h2>

      {/* === DDL Input === */}
      <div className="mb-6">
        <label className="block font-semibold mb-2">DDL Input (Paste or Upload)</label>
        <textarea
          rows={10}
          className="w-full p-2 text-black rounded"
          placeholder="Paste your DDL SQL here..."
          value={ddl}
          onChange={(e) => setDdl(e.target.value)}
        />
        <input
          type="file"
          accept=".sql"
          className="mt-2"
          onChange={(e) => readFile(e.target.files[0], setDdl)}
        />
      </div>

      {/* === Data Input === */}
      <div className="mb-6">
        <label className="block font-semibold mb-2">Data Input (Paste or Upload)</label>
        <textarea
          rows={10}
          className="w-full p-2 text-black rounded"
          placeholder="Paste your INSERT statements here..."
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
        <input
          type="file"
          accept=".sql"
          className="mt-2"
          onChange={(e) => readFile(e.target.files[0], setData)}
        />
      </div>

      <button
        onClick={handleExecute}
        className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
      >
        Load Database
      </button>

      <p className="mt-4 text-yellow-300 whitespace-pre-wrap">{message}</p>
    </div>
  );
};

export default DatabaseLoader;

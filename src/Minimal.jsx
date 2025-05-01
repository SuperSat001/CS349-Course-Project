import { useState, useEffect } from 'react';
import { usePGlite } from '@electric-sql/pglite-react';

const InsertComponent = ({ table, columns }) => {
  const db = usePGlite ? usePGlite() : null;
  const [values, setValues] = useState({});
  const [message, setMessage] = useState('');

  if (!db) return <p className="error">Database connection not available.</p>;

  const handleChange = (col, value) => setValues({ ...values, [col]: value });

  const insertRow = async () => {
    setMessage('');
    const filledCols = columns.filter(col => values[col] !== undefined && values[col] !== '');
    if (filledCols.length === 0) { setMessage("Please fill at least one column."); return; }

    const colNames = filledCols.join(', ');
    const colValues = filledCols.map(col => {
        const val = values[col];
        // Basic check for numeric values
        return /^-?\d+(\.\d+)?$/.test(val) ? val : `'${String(val).replace(/'/g, "''")}'`; // Escape single quotes
    }).join(', ');

    // Build the final INSERT query
    const query = `INSERT INTO public.${table} (${colNames}) VALUES (${colValues});`;
    console.log("Insert Query:", query);

    try {
      await db.query(query);
      setMessage("Row inserted!");
      setValues({}); // Clear the form on success
    } catch (err) {
      console.error("Insert error:", err);
      setMessage(`Insert failed: ${err.message}. See console.`);
    }
  };

  // Render the insert form
  return (
    <div className="mt-6"> 
      <h3 className="text-xl font-bold mb-2">Insert Row into {table}</h3>
      {columns.map((col, idx) => (
        <input
          key={idx}
          className="input my-1" 
          placeholder={`Enter ${col}`}
          value={values[col] || ''}
          onChange={e => handleChange(col, e.target.value)}
        />
      ))}
      <button
        
        className="button bg-green-600 text-white mt-2" 
        onClick={insertRow}
      >
        Insert
      </button>
      
      {message && <p className={`message mt-2 ${message.includes("failed") ? 'error' : 'success'}`}>{message}</p>}
    </div>
  );
};

// Component to delete a row based on primary key.
const DeleteComponent = ({ table, primaryKey }) => {
  const db = usePGlite ? usePGlite() : null;
  const [pkValue, setPkValue] = useState('');
  const [message, setMessage] = useState('');

  if (!db) return <p className="error">Database connection not available.</p>;

  // Handle the delete operation
  const deleteRow = async () => {
    setMessage('');
    // Validate input and primary key
    if (!pkValue) { setMessage("Enter primary key value"); return; }
    if (!primaryKey) { setMessage("Cannot delete: Primary key not identified for this table."); return; }

    // Simple quoting for string values
    const valueStr = /^-?\d+(\.\d+)?$/.test(pkValue) ? pkValue : `'${String(pkValue).replace(/'/g, "''")}'`;
    // Build the DELETE query
    const query = `DELETE FROM public.${table} WHERE ${primaryKey} = ${valueStr};`;
    console.log("Delete Query:", query);

    // Execute query and handle results/errors
    try {
      await db.query(query);
      setMessage("Row deleted (if it existed)!");
      setPkValue(''); // Clear input on success
    } catch (err) {
      console.error("Delete error:", err);
      setMessage(`Delete failed: ${err.message}. See console.`);
    }
  };

  // Render the delete form
  return (
    <div className="mt-6"> 
      <h3 className="text-xl font-bold mb-2">Delete Row from {table}</h3>
       
       {!primaryKey ? (
         <p className="error">Primary key not determined for deletion.</p> 
       ) : (
         <>
          <input
            
            className="input my-1" // Changed from styles.input
            placeholder={`Enter value for primary key: ${primaryKey}`}
            value={pkValue}
            onChange={e => setPkValue(e.target.value)}
          />
          <button
            
            className="button bg-red-600 text-white" 
            onClick={deleteRow}
          >
            Delete
          </button>
         </>
       )}
       
       {message && <p className={`message mt-2 ${message.includes("failed") || message.includes("Cannot delete") ? 'error' : 'success'}`}>{message}</p>}
    </div>
  );
};

// Component to display table rows (limited).
const DisplayComponent = ({ table }) => {
  const db = usePGlite ? usePGlite() : null;
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  if (!db) return <p className="error">Database connection not available.</p>;

  // Fetch rows from the selected table
  const fetchRows = async () => {
    setError(''); setLoading(true); setRows([]);
    try {
      // Limit rows to prevent performance issues
      const result = await db.query(`SELECT * FROM public.${table} LIMIT 100;`);
      setRows(result.rows);
      // Notify if row limit was hit
      if (result.rows.length === 100) { setError("Note: Display limited to the first 100 rows."); }
    } catch (err) {
      console.error("Fetch error:", err); setError(`Fetch failed: ${err.message}`);
    } finally { setLoading(false); }
  };

  // Fetch rows when the table selection changes or db instance changes
  useEffect(() => { if (table && db) { fetchRows(); } else { setRows([]); setError(''); } }, [table, db]);

  // Render the display table
  return (
    <div className="mt-6"> 
      <h3 className="text-xl font-bold mb-2">Displaying Rows from {table} (Max 100)</h3>
      <button
        
        className="button bg-blue-600 text-white mb-2" 
        onClick={fetchRows}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Reload Rows'}
      </button>
      
      {error && <p className="error">{error}</p>} 
      {rows.length === 0 && !loading && !error && <p>No rows found or table is empty.</p>}
      
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          
          <table className="table"> 
            <thead>
              <tr>
                {Object.keys(rows[0]).map((key, i) => (
                  
                  <th key={i} className="th">{key}</th> // Changed from styles.th
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="td text-center"> 
                      {typeof val === 'boolean' ? String(val) : (val ?? 'NULL')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const Minimal = () => {
  const db = usePGlite ? usePGlite() : null;
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState([]);
  const [primaryKey, setPrimaryKey] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
      if (!db) {
          setError("Database connection not available for Minimal browser. Please load data first.");
      } else {
          setError(''); // Clear error if db becomes available
      }
  }, [db]);

  useEffect(() => {
    const fetchTables = async () => {
      if (!db) return; // Guard against missing db
      setError(prev => prev === "Database connection not available for Minimal browser. Please load data first." ? '' : prev);
      try {
        const res = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;`);
        setTables(res.rows.map(r => r.table_name));
      } catch (err) {
        console.error("Error fetching tables:", err); setError(`Error fetching tables: ${err.message}`);
      }
    };
    if (db) fetchTables(); // Only fetch if db exists
  }, [db]);

  // Fetch columns and primary key for the selected table
  useEffect(() => {
    const fetchSchema = async () => {
      if (!selectedTable || !db) return; // Guard against missing db/table
      setError(prev => (prev && !prev.startsWith("Note:")) ? '' : prev);
      setColumns([]);
      setPrimaryKey('');

      try {
        // Get column names
        const colRes = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position;`, [selectedTable]);
        setColumns(colRes.rows.map(r => r.column_name));

        // Try to find the primary key
        const pkRes = await db.query(`
          SELECT a.attname as column_name
          FROM   pg_index i
          JOIN   pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          JOIN   pg_class t ON t.oid = i.indrelid
          JOIN   pg_namespace n ON n.oid = t.relnamespace
          WHERE  i.indisprimary
          AND    t.relname = $1
          AND    n.nspname = 'public';
        `, [selectedTable]);

        // Handle PK result
        if (pkRes.rows.length === 1) {
            setPrimaryKey(pkRes.rows[0].column_name);
        } else if (pkRes.rows.length > 1) {
            setPrimaryKey(''); // Clear PK if composite
            setError("Note: Deletion disabled for tables with composite primary keys in this view.");
        } else {
             setPrimaryKey(''); // No PK found
        }
      } catch (err) {
        console.error("Error fetching schema:", err); setError(`Error fetching schema for ${selectedTable}: ${err.message}`);
      }
    };
    if (db && selectedTable) fetchSchema(); // Only fetch if db and table selected
  }, [selectedTable, db]);

  // Render the Minimal browser UI
  return (
    
    <div className="container"> 
      <h2 className="heading">Database Browser</h2> 

      
      {error && <p className="error">{error}</p>} 

      
      {usePGlite ? (
        <>
          <label className="block mb-1 font-semibold">Select Table</label>
          <select
            
            className="input" // Changed from styles.input
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            disabled={!db} // Disable only if db connection is missing
          >
            <option value="">-- Choose a table --</option>
            {tables.map((table, idx) => (<option key={idx} value={table}>{table}</option>))}
          </select>
          
          {selectedTable && db && (
            <>
              <InsertComponent table={selectedTable} columns={columns} />
              <DeleteComponent table={selectedTable} primaryKey={primaryKey} />
              <DisplayComponent table={selectedTable} />
            </>
          )}
        </>
      ) : (
        <p className="error">PGLite React bindings (usePGlite) not found.</p>
      )}
    </div>
  );
};

export default Minimal;
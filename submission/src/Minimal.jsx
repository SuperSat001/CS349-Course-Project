import { useState, useEffect } from 'react';
import { usePGlite } from '@electric-sql/pglite-react';
import { saveAs } from 'file-saver';

// --- Insert Component ---
// Props: schema (string), table (string), columns (array of strings)
const InsertComponent = ({ schema, table, columns }) => {
  const db = usePGlite ? usePGlite() : null;
  const [values, setValues] = useState({});
  const [message, setMessage] = useState(''); // Message state for this component

  // Reset input values when table or schema changes
  useEffect(() => {
    setValues({});
    setMessage('');
  }, [schema, table]);

  if (!db) return <p className="error">Database connection not available.</p>;

  const handleChange = (col, value) => setValues({ ...values, [col]: value });

  const insertRow = async () => {
    setMessage(''); // Clear previous message before starting
    const filledCols = columns.filter(col => values[col] !== undefined && values[col] !== '');
    if (filledCols.length === 0) {
      setMessage("Please fill at least one column.");
      return;
    }
    const colNames = filledCols.join(', ');
    const colValues = filledCols.map(col => {
        const val = values[col];
        // Basic type handling: assumes numbers/booleans or strings needing quotes
        // This might need refinement based on actual column types if known
        if (val === null || val === undefined || String(val).toUpperCase() === 'NULL') {
            return 'NULL';
        }
        if (typeof val === 'boolean') {
            return String(val);
        }
        if (/^-?\d+(\.\d+)?$/.test(val)) { // Check if it looks like a number
            return val;
        }
        // Otherwise, treat as string and quote/escape it
        return `'${String(val).replace(/'/g, "''")}'`; // Escape single quotes
    }).join(', ');

    // Construct query using schema and table name (no quoteIdent)
    const query = `INSERT INTO ${schema}.${table} (${colNames}) VALUES (${colValues});`;
    console.log("Insert Query:", query);
    try {
      await db.query(query);
      setMessage("Row inserted!"); // Set success message
      setValues({}); // Clear form
    } catch (err) {
      console.error("Insert error:", err);
      setMessage(`Insert failed: ${err.message}. Check data types and constraints. See console.`); // Set error message
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-xl font-bold mb-2">Insert Row into {schema}.{table}</h3>
      {/* Render input only if columns are available */}
      {columns && columns.length > 0 ? (
         <>
           {columns.map((col, idx) => (
             <input
               key={`${schema}-${table}-${col}-${idx}`} // More specific key
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
         </>
       ) : (
         <p className="text-sm text-gray-400">Column information not available for insertion.</p>
       )}
      {/* Display the message */}
      {message && <p className={`message mt-2 ${message.includes("failed") || message.includes("Please fill") ? 'error' : 'success'}`}>{message}</p>}
    </div>
  );
};

// --- Delete Component ---
// Props: schema (string), table (string), primaryKey (string or null)
const DeleteComponent = ({ schema, table, primaryKey }) => {
  const db = usePGlite ? usePGlite() : null;
  const [pkValue, setPkValue] = useState('');
  const [message, setMessage] = useState(''); // Message state for this component

   // Reset input value when table, schema or primaryKey changes
   useEffect(() => {
     setPkValue('');
     setMessage('');
     if (primaryKey && message === "Cannot delete: Primary key not identified for this table.") {
        // Clear persistent message if PK becomes available
        setMessage('');
    }
   }, [schema, table, primaryKey]); // Add primaryKey dependency

  if (!db) return <p className="error">Database connection not available.</p>;

  const deleteRow = async () => {
    setMessage(''); // Clear previous message before starting
    if (!pkValue) {
      setMessage("Enter primary key value");
      return;
    }
    // primaryKey check happens before rendering input, but double check here
    if (!primaryKey) {
       setMessage("Cannot delete: Primary key not identified for this table.");
       return;
    }

    // Basic quoting for potential string PKs
    const valueStr = /^-?\d+(\.\d+)?$/.test(pkValue) ? pkValue : `'${String(pkValue).replace(/'/g, "''")}'`;
    // Construct query using schema and table name (no quoteIdent)
    // Assume primaryKey name itself is a simple identifier
    const query = `DELETE FROM ${schema}.${table} WHERE ${primaryKey} = ${valueStr};`;
    console.log("Delete Query:", query);
    try {
      await db.query(query);
      setMessage("Row deleted (if it existed)!"); // Set success message
      setPkValue(''); // Clear input
    } catch (err) {
      console.error("Delete error:", err);
      setMessage(`Delete failed: ${err.message}. See console.`); // Set error message
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-xl font-bold mb-2">Delete Row from {schema}.{table}</h3>
       {/* Render input only if primaryKey is known */}
       {!primaryKey ? (
         <p className="text-sm text-gray-400">Primary key not determined for this table. Deletion disabled.</p>
       ) : (
         <>
          <input
            className="input my-1"
            placeholder={`Enter value for primary key: ${primaryKey}`}
            value={pkValue}
            onChange={e => setPkValue(e.target.value)}
          />
          <button
            className="button bg-red-600 text-white"
            onClick={deleteRow}
          >
            Delete by Primary Key
          </button>
         </>
       )}
       {/* Display the operation message */}
       {message && message !== "Cannot delete: Primary key not identified for this table." && (
            <p className={`message mt-2 ${message.includes("failed") || message.includes("Enter primary") ? 'error' : 'success'}`}>{message}</p>
       )}
    </div>
  );
};


// --- Display Component ---
// Props: schema (string), table (string)
const DisplayComponent = ({ schema, table }) => {
  const db = usePGlite ? usePGlite() : null;
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(''); // Error/Note state for this component
  const [loading, setLoading] = useState(false);

  if (!db) return <p className="error">Database connection not available.</p>;

  const fetchRows = async () => {
    // Guard against running if schema/table aren't set (though parent should prevent)
    if (!schema || !table) {
        setError("Schema or table not selected.");
        return;
    }
    setError('');
    setLoading(true);
    setRows([]); // Clear previous rows
    try {
       // Construct query using schema and table name (no quoteIdent)
      const query = `SELECT * FROM ${schema}.${table} LIMIT 100;`;
      console.log("Display Query:", query);
      const result = await db.query(query);
      setRows(result.rows);

      if (result.rows.length === 0) {
        setError("No rows found or table is empty."); // Use error state for consistent display
      } else if (result.rows.length === 100) {
        setError("Note: Display limited to the first 100 rows."); // Use error state but style as warning
      }
      // If rows found and < 100, error state remains empty (success)

    } catch (err) {
      console.error("Fetch error:", err);
      setError(`Workspace failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch rows when schema, table, or db instance changes
  useEffect(() => {
    if (schema && table && db) {
      fetchRows();
    } else {
      // Clear state if schema/table/db become unavailable
      setRows([]);
      setError('');
      setLoading(false);
    }
  }, [schema, table, db]); // Dependencies

  return (
    <div className="mt-6">
      <h3 className="text-xl font-bold mb-2">Displaying Rows from {schema}.{table} (Max 100)</h3>
      <button
        className="button bg-blue-600 text-white mb-2"
        onClick={fetchRows} // Allow manual refresh
        disabled={loading || !schema || !table} // Disable if loading or no target
      >
        {loading ? 'Loading...' : 'Reload Rows'}
      </button>

      {/* Display status/error message */}
      {error && (
          <p className={`message mt-2 ${error.startsWith("Note:") ? 'warning' : error.startsWith("No rows") ? 'info' : 'error'}`}>
              {error}
          </p>
      )}

      {/* Render table only if rows exist and not loading */}
      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {/* Get headers from the first row */}
                {Object.keys(rows[0]).map((key, i) => (
                  <th key={i} className="th">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="td text-center">
                      {/* Handle boolean display and nulls */}
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
// --- Minimal Container Component ---
// *** CHANGE: Accept studentSchema prop ***
const convertToCSV = (rows, columns) => {
  const header = columns.join(',');
  const body = rows.map(row => columns.map(col => {
    const value = row[col] ?? 'NULL';
    return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
  }).join(','));

  return [header, ...body].join('\n');
};

// --- Minimal Container Component ---
const Minimal = ({ studentSchema }) => {
  const db = usePGlite ? usePGlite() : null;
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState([]);
  const [primaryKey, setPrimaryKey] = useState('');
  const [error, setError] = useState('');
  const [csvName, setCsvName] = useState(''); // State for CSV file name

  // Effect to fetch tables from the studentSchema when it changes or db connection is ready
  useEffect(() => {
    const fetchTables = async () => {
      if (!db || !studentSchema) {
        setTables([]);
        return;
      }
      setError('');
      try {
        const res = await db.query(
          `SELECT table_name FROM information_schema.tables
           WHERE table_schema = $1 AND table_type = 'BASE TABLE'
           ORDER BY table_name;`,
          [studentSchema]
        );
        setTables(res.rows.map(r => r.table_name));
        if (res.rows.length === 0) {
          setError(`No tables found in schema '${studentSchema}'.`);
        }
      } catch (err) {
        console.error(`Error fetching tables for schema ${studentSchema}:`, err);
        setError(`Error fetching tables: ${err.message}`);
        setTables([]);
      }
    };
    fetchTables();
    setSelectedTable('');
    setColumns([]);
    setPrimaryKey('');
  }, [db, studentSchema]);

  // Effect to fetch columns and primary key for the selected table within the studentSchema
  useEffect(() => {
    const fetchSchema = async () => {
      if (!selectedTable || !db || !studentSchema) return;
      setError(prev => (prev && !prev.startsWith("Note:")) ? '' : prev);
      setColumns([]);
      setPrimaryKey('');
      try {
        const colRes = await db.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = $1 AND table_name = $2
           ORDER BY ordinal_position;`,
          [studentSchema, selectedTable]
        );
        setColumns(colRes.rows.map(r => r.column_name));

        const pkRes = await db.query(`
          SELECT a.attname as column_name
          FROM   pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          JOIN   pg_class t ON t.oid = i.indrelid JOIN pg_namespace n ON n.oid = t.relnamespace
          WHERE  i.indisprimary AND t.relname = $1 AND n.nspname = $2;
        `, [selectedTable, studentSchema]);

        if (pkRes.rows.length === 1) {
          setPrimaryKey(pkRes.rows[0].column_name);
        } else if (pkRes.rows.length > 1) {
          setPrimaryKey('');
          setError("Note: Deletion disabled for tables with composite primary keys in this view.");
        } else {
          setPrimaryKey('');
        }
      } catch (err) {
        console.error(`Error fetching schema details for ${studentSchema}.${selectedTable}:`, err);
        setError(`Error fetching schema details: ${err.message}`);
      }
    };
    if (db && selectedTable && studentSchema) fetchSchema();
  }, [selectedTable, db, studentSchema]);

  const handleTableChange = (e) => {
    setSelectedTable(e.target.value);
    setError('');
  };

  // Fetch rows for selected table
  const fetchRows = async () => {
    if (!schema || !table) return;
    try {
      const query = `SELECT * FROM ${schema}.${table} LIMIT 100;`;
      const result = await db.query(query);
      setRows(result.rows);
    } catch (err) {
      setError('Failed to fetch rows');
    }
  };

  // Convert to CSV handler
  const handleConvertToCSV = async () => {
    if (!selectedTable || !columns.length) {
      setError('Please select a table and wait for the columns to load.');
      return;
    }
    try {
      const query = `SELECT * FROM ${studentSchema}.${selectedTable};`;
      const result = await db.query(query);
      const csvContent = convertToCSV(result.rows, columns);
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      saveAs(blob, `${csvName || selectedTable}.csv`);
    } catch (err) {
      setError('Error exporting to CSV.');
    }
  };

  return (
    <div className="container">
      <h2 className="heading">Database Browser {studentSchema ? `(Schema: ${studentSchema})` : '(No Student DB Loaded)'}</h2>

      {!studentSchema && (
        <p className="message warning">
          Please load a student/exam database using the "Load Student DB" link first to browse its tables.
        </p>
      )}

      {error && <p className={error.startsWith("Note:") ? "message warning" : "error"}>{error}</p>}

      {db && studentSchema && (
        <>
          <label className="block mb-1 font-semibold">Select Table from '{studentSchema}'</label>
          <select
            className="input"
            value={selectedTable}
            onChange={handleTableChange}
            disabled={tables.length === 0}
          >
            <option value="">-- Choose a table --</option>
            {tables.map((table, idx) => (<option key={idx} value={table}>{table}</option>))}
          </select>

          {selectedTable && (
            <div key={`${studentSchema}-${selectedTable}`}>
              <InsertComponent schema={studentSchema} table={selectedTable} columns={columns} />
              <DeleteComponent schema={studentSchema} table={selectedTable} primaryKey={primaryKey} />
              <DisplayComponent schema={studentSchema} table={selectedTable} />
              
              <div className="mt-6">
                <h3 className="text-xl font-bold mb-2">Export Table to CSV</h3>
                <input
                  type="text"
                  placeholder="Enter CSV file name"
                  value={csvName}
                  onChange={e => setCsvName(e.target.value)}
                  className="input my-1"
                />
                <button
                  className="button bg-blue-600 text-white mt-2"
                  onClick={handleConvertToCSV}
                >
                  Convert to CSV
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {!usePGlite && (
        <p className="error">PGLite React bindings (usePGlite) not found.</p>
      )}
    </div>
  );
};

export default Minimal;

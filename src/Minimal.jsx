import { useState, useEffect } from 'react';
import { usePGlite } from '@electric-sql/pglite-react';

const InsertComponent = ({ table, columns }) => {
  const db = usePGlite();
  const [values, setValues] = useState({});

  const handleChange = (col, value) => {
    setValues({ ...values, [col]: value });
  };

  const insertRow = async () => {
    const filledCols = columns.filter(col => values[col]);
    if (filledCols.length === 0) return alert("Please fill at least one column.");

    const colNames = filledCols.join(', ');
    const colValues = filledCols.map(col =>
      isNaN(values[col]) ? `'${values[col]}'` : values[col]
    ).join(', ');

    const query = `INSERT INTO ${table} (${colNames}) VALUES (${colValues});`;

    try {
      await db.query(query);
      alert("Row inserted!");
      setValues({});
    } catch (err) {
      console.error("Insert error:", err);
      alert("Insert failed. See console.");
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold mt-4 mb-2">Insert Row into {table}</h3>
      {columns.map((col, idx) => (
        <input
          key={idx}
          className="block border p-2 my-2 w-full text-black"
          placeholder={`Enter ${col}`}
          value={values[col] || ''}
          onChange={e => handleChange(col, e.target.value)}
        />
      ))}
      <button className="bg-green-600 text-white px-4 py-2 mt-2" onClick={insertRow}>Insert</button>
    </div>
  );
};

const DeleteComponent = ({ table, primaryKey }) => {
  const db = usePGlite();
  const [pkValue, setPkValue] = useState('');

  const deleteRow = async () => {
    if (!pkValue) return alert("Enter primary key value");

    const valueStr = isNaN(pkValue) ? `'${pkValue}'` : pkValue;
    const query = `DELETE FROM ${table} WHERE ${primaryKey} = ${valueStr};`;

    try {
      await db.query(query);
      alert("Row deleted!");
      setPkValue('');
    } catch (err) {
      console.error("Delete error:", err);
      alert("Delete failed. See console.");
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold mt-4 mb-2">Delete Row from {table}</h3>
      <input
        className="block border p-2 my-2 w-full text-black"
        placeholder={`Enter ${primaryKey}`}
        value={pkValue}
        onChange={e => setPkValue(e.target.value)}
      />
      <button className="bg-red-600 text-white px-4 py-2" onClick={deleteRow}>Delete</button>
    </div>
  );
};

const DisplayComponent = ({ table }) => {
  const db = usePGlite();
  const [rows, setRows] = useState([]);

  const fetchRows = async () => {
    try {
      const result = await db.query(`SELECT * FROM ${table};`);
      setRows(result.rows);
    } catch (err) {
      console.error("Fetch error:", err);
      alert("Fetch failed.");
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold mt-4 mb-2">Rows in {table}</h3>
      <button className="bg-blue-600 text-white px-4 py-2 mb-2" onClick={fetchRows}>Load Rows</button>
      <div className="overflow-x-auto">
        <table className="table-auto border-collapse w-full text-sm">
          <thead>
            {rows.length > 0 && (
              <tr>
                {Object.keys(rows[0]).map((key, i) => (
                  <th key={i} className="border px-4 py-2 bg-gray-800">{key}</th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {Object.values(row).map((val, j) => (
                  <td key={j} className="border px-4 py-2 text-center">{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Minimal = () => {
  const db = usePGlite();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState([]);
  const [primaryKey, setPrimaryKey] = useState('');

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await db.query(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        `);
        const names = res.rows.map(r => r.table_name);
        setTables(names);
      } catch (err) {
        console.error("Error fetching tables:", err);
      }
    };
    fetchTables();
  }, [db]);

  useEffect(() => {
    const fetchSchema = async () => {
      if (!selectedTable) return;
      try {
        const res = await db.query(`
          SELECT column_name, data_type, ordinal_position
          FROM information_schema.columns
          WHERE table_name = '${selectedTable}'
          ORDER BY ordinal_position;
        `);
        const cols = res.rows.map(r => r.column_name);
        setColumns(cols);

        // Attempt to find a primary key
        const pkRes = await db.query(`
          SELECT a.attname as column_name
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = '${selectedTable}'::regclass AND i.indisprimary;
        `);
        setPrimaryKey(pkRes.rows[0]?.column_name || cols[0]); // fallback to first column
      } catch (err) {
        console.error("Error fetching schema:", err);
      }
    };
    fetchSchema();
  }, [selectedTable, db]);

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Dynamic Table Interface</h2>

      <label className="block mb-2 font-semibold">Select Table</label>
      <select
        className="text-black p-2 mb-4 w-full"
        value={selectedTable}
        onChange={(e) => setSelectedTable(e.target.value)}
      >
        <option value="">-- Choose a table --</option>
        {tables.map((table, idx) => (
          <option key={idx} value={table}>{table}</option>
        ))}
      </select>

      {selectedTable && (
        <>
          <InsertComponent table={selectedTable} columns={columns} />
          <DeleteComponent table={selectedTable} primaryKey={primaryKey} />
          <DisplayComponent table={selectedTable} />
        </>
      )}
    </div>
  );
};

export default Minimal;

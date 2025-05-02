// src/AddAssignmentPage.jsx
import React, { useState, useEffect } from 'react';
import { usePGlite } from '@electric-sql/pglite-react';
import { useNavigate, useParams } from 'react-router-dom'; // Assuming selectedCourseId might come via props or context in a real app

// Receive selectedCourseId as a prop
const AddAssignmentPage = ({ selectedCourseId }) => {
  const db = usePGlite();
  const navigate = useNavigate();

  // State for the form fields
  const [assignmentName, setAssignmentName] = useState('');
  const [description, setDescription] = useState('');
  // Remove courseId state: const [courseId, setCourseId] = useState('');
  const [schemaId, setSchemaId] = useState(''); // Selected base schema definition ID from xdata_schemainfo
  const [connectionId, setConnectionId] = useState(''); // Selected connection ID ('NULL' string for none)

  // State for dropdown options
  // Remove courses state: const [courses, setCourses] = useState([]);
  const [schemas, setSchemas] = useState([]); // List of schemas for the selected course
  const [connections, setConnections] = useState([]); // List of ALL connections (remains the same)

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // For form submission
  const [isMetaLoading, setIsMetaLoading] = useState(false); // For loading schemas and connections

  // --- Effect: Fetch Schemas (for selected course) and Connections ---
  useEffect(() => {
    const fetchOptionsForCourse = async () => {
      // Don't fetch if DB not ready or no course is selected via props
      if (!db || !selectedCourseId) {
        console.log("AddAssignmentPage: DB not ready or no course selected, clearing schemas.");
        setSchemas([]); // Clear schemas if no course is selected
        // Optionally fetch connections even without a course ID, or clear them too
        // setConnections([]);
        return;
      }

      setIsMetaLoading(true);
      console.log(`AddAssignmentPage: Fetching options for course ${selectedCourseId}...`);
      setMessage(''); // Clear previous messages

      try {
        // Fetch Schemas specific to the selected course
        console.log(`Workspaceing schemas for course: ${selectedCourseId}`);
        // Fetch both ID and Name for the dropdown
        const schemaRes = await db.query(
          `SELECT schema_id, schema_name
           FROM public.xdata_schemainfo
           WHERE course_id = $1
           ORDER BY schema_id;`, // Order by ID for consistency
          [selectedCourseId] // Use the selected course ID from props
        );
        setSchemas(schemaRes.rows);
        console.log(`Workspaceed schemas for course ${selectedCourseId}:`, schemaRes.rows);
        if (schemaRes.rows.length === 0) {
           setMessage(prev => prev + `\nWarning: No base schema definitions found for course ${selectedCourseId}.`);
        }

        // Fetch ALL Connections (assuming connections are global or management is separate)
        // Only fetch connections if they haven't been fetched yet
        if (connections.length === 0) {
            console.log("Fetching all connections...");
            const connRes = await db.query(
              'SELECT connection_id, connection_name, course_id FROM public.xdata_database_connection ORDER BY connection_name, connection_id'
            );
            setConnections(connRes.rows);
            console.log("Fetched all connections:", connRes.rows);
        }

      } catch (err) {
        console.error("Error fetching options:", err);
        setMessage(`Error fetching dropdown options: ${err.message}`);
        setSchemas([]); // Clear on error
        // Optionally clear connections on error too: setConnections([]);
      } finally {
        setIsMetaLoading(false);
      }
    };

    fetchOptionsForCourse();
    // This effect should re-run if the db connection or the selected course changes
  }, [db, selectedCourseId]); // Add selectedCourseId dependency

  // --- Handle Form Submission ---
  const handleAddAssignment = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    // Validation: Use selectedCourseId from props
    if (!db || !assignmentName || !selectedCourseId || !schemaId || connectionId === '') {
      setMessage('Error: Please ensure a course is selected, provide an Assignment Name, and select a Schema and Connection/(None).');
      setIsLoading(false);
      return;
    }

    try {
      // Use selectedCourseId from props to find the next assignment ID
      const maxIdResult = await db.query(
          'SELECT MAX(assignment_id) as max_id FROM public.xdata_assignment WHERE course_id = $1',
          [selectedCourseId]
      );
      const nextAssignmentId = (maxIdResult.rows[0]?.max_id || 0) + 1;

      const sql = `
            INSERT INTO public.xdata_assignment
                (course_id, assignment_id, assignmentname, description, defaultschemaid, connection_id)
            VALUES ($1, $2, $3, $4, $5, $6);
        `;
      // Handle the 'NULL' string value for connection ID
      const finalConnectionId = connectionId === 'NULL' ? null : parseInt(connectionId, 10);

      const params = [
        selectedCourseId, // Use the prop directly
        nextAssignmentId,
        assignmentName.trim(),
        description.trim() || null, // Handle empty description
        parseInt(schemaId, 10), // The selected base schema ID from xdata_schemainfo
        finalConnectionId, // NULL or the selected connection ID
      ];

      console.log("Inserting Assignment with params:", params);
      await db.query(sql, params);
      setMessage(`Assignment '${assignmentName}' (ID: ${nextAssignmentId}) created successfully for course ${selectedCourseId}!`);
      // Add a slight delay so the user can see the success message, then navigate
      setTimeout(() => navigate(`/assignments?courseId=${selectedCourseId}`), 1500); // Navigate back to list for the same course

    } catch (err) {
      console.error("Error adding assignment:", err);
      setMessage(`Error creating assignment: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render ---

  // Handle case where no course is selected via props
  if (!selectedCourseId) {
      return (
          <div className="container">
              <h2 className="heading">Create New Assignment</h2>
              <p className="message error">Please select a course first before adding an assignment.</p>
              {/* Optional: Add a button to navigate back to the course list */}
              <button onClick={() => navigate('/')} className="button mt-4">Go to Courses</button>
          </div>
      );
  }

  return (
    <div className="container">
      {/* Display the course for which the assignment is being added */}
      <h2 className="heading">Create New Assignment for Course: {selectedCourseId}</h2>

      {/* Show loading indicator while fetching schemas/connections */}
      {isMetaLoading && !message.includes('Error') && <p>Loading options...</p>}

      <form onSubmit={handleAddAssignment} className={`p-4 border border-gray-600 rounded-lg bg-gray-800 ${isLoading ? 'opacity-50' : ''}`}>

        {/* Course Selection Dropdown REMOVED */}

        {/* Assignment Name */}
        <div className="mb-3">
          <label htmlFor="assignmentname" className="block text-sm font-medium text-gray-300 mb-1">Assignment Name*</label>
          {/* Enable only when course is selected (which is always true if this form renders) */}
          <input type="text" id="assignmentname" value={assignmentName} onChange={(e) => setAssignmentName(e.target.value)} className="input" required maxLength="20" disabled={isLoading} />
        </div>
        {/* Description */}
        <div className="mb-3">
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
          <textarea id="description" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} className="textarea" disabled={isLoading} />
        </div>
        {/* Schema and Connection Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <div>
            <label htmlFor="schemaId" className="block text-sm font-medium text-gray-300 mb-1">Base Student Schema Definition*</label>
            <select
              id="schemaId"
              value={schemaId}
              onChange={(e) => setSchemaId(e.target.value)}
              className="input"
              required
              // Disable if loading options or no schemas found for this course
              disabled={isLoading || isMetaLoading || schemas.length === 0}
            >
              <option value="">-- Select Base Schema --</option>
              {/* Maps over schemas fetched specifically for the selected course */}
              {schemas.map(s => (
                // Use schema_id as the value
                <option key={s.schema_id} value={String(s.schema_id)}>
                  {/* Display schema_name and schema_id */}
                  {s.schema_name} (ID: {s.schema_id})
                </option>
              ))}
            </select>
             {schemas.length === 0 && !isMetaLoading && <p className="text-xs text-red-400 mt-1">No base schema definitions found for this course.</p>}
          </div>
          <div>
            <label htmlFor="connectionId" className="block text-sm font-medium text-gray-300 mb-1">Database Connection*</label>
            <select
              id="connectionId"
              value={connectionId} // Controlled component
              onChange={(e) => setConnectionId(e.target.value)} // Update state
              className="input"
              required
              // Disable only when submitting or if options haven't loaded
              disabled={isLoading || isMetaLoading}
            >
              <option value="">-- Select Connection --</option>
              <option value="NULL">(None)</option> {/* Default/None option */}
              {/* Maps over ALL fetched connections */}
              {connections.map(c => (
                // Use connection_id as the value
                <option key={c.connection_id} value={String(c.connection_id)}>
                   {/* Display name and ID */}
                  {c.connection_name || `Connection ${c.connection_id}`} (ID: {c.connection_id})
                   {/* Optionally show associated course if helpful: (For Course: {c.course_id}) */}
                </option>
              ))}
            </select>
             {/* No warning needed if connections list is empty, because "None" is valid */}
          </div>
        </div>
        {/* TODO: Add other assignment fields like start/end times etc. */}

        {/* Message Display */}
        {message && <p className={`message text-sm my-3 ${message.includes('Error:') || message.includes('Warning:') ? 'warn' : 'success'}`}>{message.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>)}</p>}


        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-4">
           {/* Navigate back to the assignment list for the current course */}
          <button type="button" onClick={() => navigate(`/assignments?courseId=${selectedCourseId}`)} className="button text-sm bg-gray-600 hover:bg-gray-700 text-white" disabled={isLoading}>Cancel</button>
          {/* Submit disabled if loading, no DB, or required fields empty */}
          <button type="submit" className="button text-sm bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading || isMetaLoading || !db || !schemaId || connectionId === ''}>Create Assignment</button>
        </div>
      </form>
    </div>
  );
};

export default AddAssignmentPage;
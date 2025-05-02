// src/AddAssignmentPage.jsx
import React, { useState, useEffect } from 'react';
import { usePGlite } from '@electric-sql/pglite-react';
import { useNavigate } from 'react-router-dom';

const AddAssignmentPage = () => {
  const db = usePGlite();
  const navigate = useNavigate();

  // State for the form fields
  const [assignmentName, setAssignmentName] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState(''); // Selected course ID
  const [schemaId, setSchemaId] = useState(''); // Selected base schema definition ID
  const [connectionId, setConnectionId] = useState(''); // Selected connection ID ('NULL' string for none)

  // State for dropdown options
  const [courses, setCourses] = useState([]); // List of available courses
  const [schemas, setSchemas] = useState([]); // List of ALL base schemas
  const [connections, setConnections] = useState([]); // List of ALL connections

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // For form submission
  const [isMetaLoading, setIsMetaLoading] = useState(false); // For loading ALL dropdown options

  // --- Effect: Fetch ALL courses, schemas, and connections ONCE ---
  useEffect(() => {
    const fetchInitialOptions = async () => {
      if (!db) {
        console.log("AddAssignmentPage: DB not ready for initial fetch.");
        return;
      }
      // Avoid refetching if lists are already populated
      if (courses.length > 0 || schemas.length > 0 || connections.length > 0) {
          return;
      }

      setIsMetaLoading(true);
      console.log("AddAssignmentPage: Fetching initial dropdown options (courses, schemas, connections)...");
      setMessage(''); // Clear any previous messages

      try {
        // Fetch Courses
        const courseRes = await db.query(`
              SELECT instructor_course_id, course_name
              FROM public.xdata_course
              ORDER BY course_name, instructor_course_id
          `);
        setCourses(courseRes.rows);
        console.log("Fetched courses:", courseRes.rows);
        if (courseRes.rows.length === 0) {
          setMessage(prev => prev + "\nWarning: No courses found.");
        }

        // Fetch ALL Schemas definitions
        const schemaRes = await db.query(
                            `SELECT schema_name FROM information_schema.schemata
                   WHERE schema_name LIKE 'student_schema_%' ORDER BY schema_name;`
        );
        setSchemas(schemaRes.rows);
        console.log("Fetched all schemas:", schemaRes.rows);
        if (schemaRes.rows.length === 0) {
           setMessage(prev => prev + "\nWarning: No base schema definitions found in xdata_schemainfo.");
        }

        // Fetch ALL Connections
        const connRes = await db.query(
          'SELECT connection_id, connection_name, course_id FROM public.xdata_database_connection ORDER BY connection_name, connection_id'
        );
        setConnections(connRes.rows);
        console.log("Fetched all connections:", connRes.rows);
        // No warning needed if connections is empty, as "None" is an option

      } catch (err) {
        console.error("Error fetching initial options:", err);
        setMessage(`Error fetching dropdown options: ${err.message}`);
        setCourses([]); // Clear on error
        setSchemas([]);
        setConnections([]);
      } finally {
        setIsMetaLoading(false);
      }
    };

    fetchInitialOptions();
  }, [db]); // Run only when db connection is ready

  // --- Handle Form Submission ---
  const handleAddAssignment = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    // Validation: Ensure course, schema, and connection (or "None") are selected
    if (!db || !assignmentName || !courseId || !schemaId || connectionId === '') {
      setMessage('Error: Please fill Assignment Name and select a Course, Schema, and Connection/(None).');
      setIsLoading(false);
      return;
    }

    try {
      const maxIdResult = await db.query('SELECT MAX(assignment_id) as max_id FROM public.xdata_assignment WHERE course_id = $1', [courseId]);
      const nextAssignmentId = (maxIdResult.rows[0]?.max_id || 0) + 1;

      const sql = `
            INSERT INTO public.xdata_assignment
                (course_id, assignment_id, assignmentname, description, defaultschemaid, connection_id)
            VALUES ($1, $2, $3, $4, $5, $6);
        `;
      // Handle the 'NULL' string value for connection ID
      const finalConnectionId = connectionId === 'NULL' ? null : parseInt(connectionId, 10);

      const params = [
        courseId, // The selected course from the dropdown
        nextAssignmentId,
        assignmentName.trim(),
        description.trim() || null,
        parseInt(schemaId, 10), // The selected base schema ID
        finalConnectionId, // NULL or the selected connection ID
      ];

      console.log("Inserting Assignment with params:", params);
      await db.query(sql, params);
      setMessage(`Assignment '${assignmentName}' (ID: ${nextAssignmentId}) created successfully for course ${courseId}!`);
      // Add a slight delay so the user can see the success message
      setTimeout(() => navigate('/assignments'), 1500);

    } catch (err) {
      console.error("Error adding assignment:", err);
      setMessage(`Error creating assignment: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render ---
  return (
    <div className="container">
      <h2 className="heading">Create New Assignment</h2>
      {/* Show loading indicator only while fetching initial options */}
      {isMetaLoading && !message.includes('Error') && <p>Loading options...</p>}

      <form onSubmit={handleAddAssignment} className={`p-4 border border-gray-600 rounded-lg bg-gray-800 ${isLoading ? 'opacity-50' : ''}`}>

        {/* Course Selection Dropdown */}
        <div className="mb-3">
          <label htmlFor="courseId" className="block text-sm font-medium text-gray-300 mb-1">Course*</label>
          <select
            id="courseId"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="input"
            required
            disabled={isLoading || isMetaLoading || courses.length === 0}
          >
            <option value="">-- Select Course --</option>
            {/* Maps over ALL fetched courses */}
            {courses.map(c => (
              <option key={c.instructor_course_id} value={c.instructor_course_id}>
                {c.course_name || c.instructor_course_id} ({c.instructor_course_id})
              </option>
            ))}
          </select>
          {courses.length === 0 && !isMetaLoading && <p className="text-xs text-red-400 mt-1">No courses found in database.</p>}
        </div>

        {/* Assignment Name */}
        <div className="mb-3">
          <label htmlFor="assignmentname" className="block text-sm font-medium text-gray-300 mb-1">Assignment Name*</label>
          <input type="text" id="assignmentname" value={assignmentName} onChange={(e) => setAssignmentName(e.target.value)} className="input" required maxLength="20" disabled={isLoading || !courseId} />
        </div>
        {/* Description */}
        <div className="mb-3">
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
          <textarea id="description" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} className="textarea" disabled={isLoading || !courseId} />
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
              // Disable only when submitting or if options haven't loaded
              disabled={isLoading || isMetaLoading || schemas.length === 0}
            >
              <option value="">-- Select Base Schema --</option>
              {/* Maps over ALL fetched base schema definitions */}
              {schemas.map(s => (
                <option key={`${s.course_id}-${s.schema_id}`} value={String(s.schema_id)}>
                  {s.schema_name} (ID: {s.schema_id}, For Course: {s.course_id})
                </option>
              ))}
            </select>
             {schemas.length === 0 && !isMetaLoading && <p className="text-xs text-red-400 mt-1">No base schema definitions found.</p>}
          </div>
          <div>
            <label htmlFor="connectionId" className="block text-sm font-medium text-gray-300 mb-1">Database Connection*</label>
            <select
              id="connectionId"
              value={connectionId} // Controlled component using string state
              onChange={(e) => setConnectionId(e.target.value)} // Update string state
              className="input"
              required
              // Disable only when submitting or if options haven't loaded
              disabled={isLoading || isMetaLoading}
            >
              <option value="">-- Select Connection --</option>
              <option value="NULL">(None)</option> {/* Default/None option */}
              {/* Maps over ALL fetched connections */}
              {connections.map(c => (
                <option key={`${c.course_id}-${c.connection_id}`} value={String(c.connection_id)}>
                  {c.connection_name || `Connection ${c.connection_id}`} (ID: {c.connection_id}, For Course: {c.course_id})
                </option>
              ))}
            </select>
             {/* No warning needed if connections list is empty, because "None" is valid */}
          </div>
        </div>
        {/* TODO: Add other assignment fields */}

        {/* Message Display */}
        {message && <p className={`message text-sm my-3 ${message.includes('Error:') || message.includes('Warning:') ? 'warn' : 'success'}`}>{message}</p>}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={() => navigate('/assignments')} className="button text-sm bg-gray-600 hover:bg-gray-700 text-white" disabled={isLoading}>Cancel</button>
          {/* Submit disabled if loading, no DB, or required fields empty */}
          <button type="submit" className="button text-sm bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading || isMetaLoading || !db || !courseId || !schemaId || connectionId === ''}>Create Assignment</button>
        </div>
      </form>
    </div>
  );
};

export default AddAssignmentPage;
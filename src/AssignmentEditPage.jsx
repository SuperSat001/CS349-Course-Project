// src/AssignmentEditPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePGlite } from '@electric-sql/pglite-react';

// --- Reusable Question Editor Component ---
// (Same as defined for AddAssignmentPage)
const QuestionEditor = ({ question, index, onUpdate, onRemove }) => {
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        onUpdate(index, { ...question, [name]: type === 'checkbox' ? checked : value });
    };
    const isValid = question.qText?.trim() && question.correctQuery?.trim() && question.marks >= 0;

    return (
        <div className={`p-3 border rounded mb-3 bg-gray-700 ${isValid ? 'border-gray-600' : 'border-red-500'}`}>
            <div className="flex justify-between items-center mb-2">
                 <h4 className="font-semibold text-gray-200">Question {index + 1}</h4>
                 <button onClick={() => onRemove(index)} className="button-error-xs" title="Remove Question">&times;</button>
            </div>
            {/* Question Text */}
            <div className="mb-2">
                <label htmlFor={`qText-${index}`} className="label text-sm">Question Text*</label>
                <textarea id={`qText-${index}`} name="qText" rows="3" value={question.qText || ''} onChange={handleChange} className="textarea text-sm" required />
            </div>
            {/* Correct SQL */}
            <div className="mb-2">
                <label htmlFor={`correctQuery-${index}`} className="label text-sm">Correct SQL Query*</label>
                <textarea id={`correctQuery-${index}`} name="correctQuery" rows="4" value={question.correctQuery || ''} onChange={handleChange} className="textarea font-mono text-xs" required />
            </div>
            {/* Marks & Order Independent */}
            <div className="grid grid-cols-2 gap-4 mb-2">
                <div>
                    <label htmlFor={`marks-${index}`} className="label text-sm">Marks*</label>
                    <input type="number" id={`marks-${index}`} name="marks" value={question.marks ?? 1} onChange={handleChange} className="input text-sm" required min="0" step="0.5"/>
                </div>
                <div className="flex items-center mt-5">
                     <input type="checkbox" id={`orderIndependent-${index}`} name="orderIndependent" checked={!!question.orderIndependent} onChange={handleChange} className="mr-2 h-4 w-4"/>
                     <label htmlFor={`orderIndependent-${index}`} className="label text-sm pt-1">Order Independent?</label>
                </div>
            </div>
            {!isValid && <p className="text-xs text-red-400 mt-1">Text, query, and non-negative marks required.</p>}
        </div>
    );
};
// --- End QuestionEditor ---


const AssignmentEditPage = ({ selectedCourseId }) => {
  const { assignmentId } = useParams(); // Get assignmentId from URL
  const navigate = useNavigate();
  const db = usePGlite();

  // State for form data - initialize with empty/null
  const [assignmentName, setAssignmentName] = useState('');
  const [description, setDescription] = useState('');
  const [schemaId, setSchemaId] = useState(''); // defaultschemaid
  const [connectionId, setConnectionId] = useState(''); // connection_id
  const [questions, setQuestions] = useState([]); // Current questions being edited

  // State for dropdown options
  const [schemas, setSchemas] = useState([]);
  const [connections, setConnections] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Fetch initial data
  const fetchData = useCallback(async () => {
    // Need selectedCourseId passed from App.jsx for context
    if (!db || !assignmentId || !selectedCourseId) {
      setError("Missing database, course context, or assignment ID.");
      setLoading(false);
      return;
    }
    setLoading(true); setError(''); setMessage('');
    try {
      // Fetch Assignment Details
      const assgnRes = await db.query(
        `SELECT assignmentname, description, defaultschemaid, connection_id
         FROM public.xdata_assignment
         WHERE course_id = $1 AND assignment_id = $2`,
        [selectedCourseId, assignmentId]
      );
      if (assgnRes.rows.length === 0) throw new Error("Assignment not found for this course.");
      const data = assgnRes.rows[0];
      setAssignmentName(data.assignmentname || '');
      setDescription(data.description || '');
      setSchemaId(data.defaultschemaid ? String(data.defaultschemaid) : '');
      setConnectionId(data.connection_id !== null ? String(data.connection_id) : 'NULL');

      // Fetch Questions for this assignment
      const qinfoRes = await db.query(
        `SELECT question_id, querytext as qText, correctquery, totalmarks as marks, orderindependent
         FROM public.xdata_qinfo
         WHERE course_id = $1 AND assignment_id = $2 ORDER BY question_id`,
        [selectedCourseId, assignmentId]
      );
      setQuestions(qinfoRes.rows.map(q => ({...q, orderIndependent: !!q.orderindependent})));

      // Fetch Available Base Schemas for this course
      const schemaRes = await db.query(
        `SELECT schema_id, schema_name FROM public.xdata_schemainfo WHERE course_id = $1 ORDER BY schema_id;`,
        [selectedCourseId]
      );
      setSchemas(schemaRes.rows);

      // Fetch All Connections
       const connRes = await db.query(
         'SELECT connection_id, connection_name FROM public.xdata_database_connection ORDER BY connection_name'
       );
       setConnections(connRes.rows);

    } catch (err) {
      console.error("Error fetching assignment data for edit:", err);
      setError(`Failed to load assignment data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [db, assignmentId, selectedCourseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Fetch data on load

  // --- Question Management Functions ---
  const addNewQuestion = () => {
    setQuestions(prev => [
        ...prev, { qText: '', correctQuery: '', marks: 1, orderIndependent: false }
    ]);
  };
  const updateQuestion = (index, updatedQuestion) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? updatedQuestion : q)));
  };
  const removeQuestion = (index) => {
    if (window.confirm(`Remove Question ${index + 1}? Changes saved only when 'Save All Changes' is clicked.`)) {
         setQuestions(prev => prev.filter((_, i) => i !== index));
    }
  };
  // --- End Question Management ---

  // --- Handle Save Changes ---
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');

    // Validation (same as Add page)
    if (!assignmentName || !schemaId || connectionId === '' || questions.length === 0 || questions.some(q => !q.qText?.trim() || !q.correctQuery?.trim() || q.marks === undefined || q.marks < 0)) {
        setError('Validation Error: Please ensure Assignment Name, Base Schema, Connection/(None) are set, and all questions have text, query, and marks.');
        return;
    }

    setSaving(true);
    let transactionStarted = false;

    try {
        await db.query('BEGIN');
        transactionStarted = true;

        // 1. Update xdata_assignment
        const assignmentSql = `UPDATE public.xdata_assignment SET assignmentname = $1, description = $2, defaultschemaid = $3, connection_id = $4 WHERE course_id = $5 AND assignment_id = $6;`;
        const finalConnectionId = connectionId === 'NULL' ? null : parseInt(connectionId, 10);
        const assignmentParams = [assignmentName.trim(), description.trim() || null, parseInt(schemaId, 10), finalConnectionId, selectedCourseId, assignmentId];
        await db.query(assignmentSql, assignmentParams);
        console.log(`Assignment ${assignmentId} updated.`);

        // 2. Sync questions: Delete existing, then Insert current state
        await db.query(`DELETE FROM public.xdata_qinfo WHERE course_id = $1 AND assignment_id = $2;`, [selectedCourseId, assignmentId]);
        console.log(`Existing questions deleted for assignment ${assignmentId}.`);

        const qinfoSql = `INSERT INTO public.xdata_qinfo (course_id, assignment_id, question_id, querytext, correctquery, totalmarks, orderindependent, query_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`;
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const questionId = i + 1; // Assign new sequential ID
            const qinfoParams = [selectedCourseId, assignmentId, questionId, question.qText.trim(), question.correctQuery.trim(), parseFloat(question.marks) || 0, question.orderIndependent || false, questionId]; // query_id = question_id
            await db.query(qinfoSql, qinfoParams);
            console.log(`Question ${questionId} inserted/updated for assignment ${assignmentId}.`);
        }

        // 3. Commit
        await db.query('COMMIT');
        transactionStarted = false;

        setMessage(`Assignment '${assignmentName}' and its ${questions.length} question(s) saved successfully!`);
        // Re-fetch data to ensure consistency, especially if IDs changed (though they shouldn't with delete+insert)
        // await fetchData(); // Optional: uncomment if you want to refresh state after save

    } catch (err) {
        console.error("Error saving assignment:", err);
        setError(`Save Error: ${err.message}`);
        if (transactionStarted) { try { await db.query('ROLLBACK'); } catch (rbError) { console.error("Rollback failed:", rbError); } }
    } finally {
        setSaving(false);
    }
  };

  // --- Render Logic ---
  if (loading) return <div className="container"><p>Loading assignment editor...</p></div>;
  if (error && !assignmentName) return <div className="container"><p className="error">{error}</p><button onClick={() => navigate('/assignments')} className="button mt-4">Back to List</button></div>;

  return (
    <div className="container">
      <h2 className="heading">Edit Assignment (Course: {selectedCourseId} | ID: {assignmentId})</h2>
      {message && <p className="message success mb-4">{message}</p>}
      {error && <p className="message error mb-4">{error}</p>}

      <form onSubmit={handleSaveChanges}>
        {/* Assignment Details Section (similar to Add page, but controlled by state fetched) */}
        <div className="p-4 border border-gray-600 rounded-lg bg-gray-800 mb-6">
          <h3 className="text-lg font-semibold mb-3">Assignment Details</h3>
          {/* Assignment Name Input */}
          <div className="mb-3">
            <label htmlFor="assignmentname" className="label">Assignment Name*</label>
            <input type="text" id="assignmentname" value={assignmentName} onChange={(e) => setAssignmentName(e.target.value)} className="input" required maxLength="20" disabled={saving} />
          </div>
          {/* Description Textarea */}
          <div className="mb-3">
            <label htmlFor="description" className="label">Description</label>
            <textarea id="description" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} className="textarea" disabled={saving} />
          </div>
          {/* Schema and Connection Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            {/* Base Schema Dropdown */}
            <div>
              <label htmlFor="schemaId" className="label">Base Student Schema Definition*</label>
              <select id="schemaId" value={schemaId} onChange={(e) => setSchemaId(e.target.value)} className="input" required disabled={saving || schemas.length === 0}>
                <option value="">-- Select Base Schema --</option>
                {schemas.map(s => <option key={s.schema_id} value={String(s.schema_id)}>{s.schema_name} (ID: {s.schema_id})</option>)}
              </select>
            </div>
            {/* Connection Dropdown */}
            <div>
              <label htmlFor="connectionId" className="label">Database Connection*</label>
              <select id="connectionId" value={connectionId} onChange={(e) => setConnectionId(e.target.value)} className="input" required disabled={saving}>
                <option value="">-- Select Connection --</option>
                <option value="NULL">(None)</option>
                {connections.map(c => <option key={c.connection_id} value={String(c.connection_id)}>{c.connection_name || `Conn ${c.connection_id}`}</option>)}
              </select>
            </div>
          </div>
        </div> {/* End Assignment Details */}

        {/* Questions Section */}
        <div className="p-4 border border-gray-600 rounded-lg bg-gray-800 mb-6">
          <h3 className="text-lg font-semibold mb-3">Questions</h3>
          {questions.map((q, index) => (
            <QuestionEditor
              key={q.question_id || `new-${index}`} // Use DB id if exists
              index={index}
              question={q}
              onUpdate={updateQuestion}
              onRemove={removeQuestion}
            />
          ))}
          <button type="button" onClick={addNewQuestion} className="button bg-green-600 hover:bg-green-700 text-sm mt-2" disabled={saving}>
            Add New Question
          </button>
        </div> {/* End Questions Section */}

        {/* Action Buttons */}
        <div className="flex justify-between gap-3 mt-4">
           <button type="button" onClick={() => navigate('/assignments')} className="button text-sm bg-gray-600 hover:bg-gray-700 text-white" disabled={saving}>
                Cancel / Back to List
           </button>
          <button type="submit" className="button text-sm bg-blue-600 hover:bg-blue-700 text-white"
             disabled={saving || loading || /* Add full validation check again */ false}>
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssignmentEditPage;
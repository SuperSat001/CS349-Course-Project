// src/AddAssignmentPage.jsx
import React, { useState, useEffect } from 'react';
import { usePGlite } from '@electric-sql/pglite-react';
import { useNavigate, useParams } from 'react-router-dom'; // Assuming selectedCourseId might come via props or context in a real app

// --- Helper: Component for displaying/editing a single question ---
const QuestionEditor = ({ question, index, onUpdate, onRemove }) => {
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        onUpdate(index, { ...question, [name]: type === 'checkbox' ? checked : value });
    };

    return (
        <div className="p-3 border border-gray-600 rounded mb-3 bg-gray-700">
            <h4 className="font-semibold mb-2 text-gray-200">Question {index + 1}</h4>
            <div className="mb-2">
                <label htmlFor={`qText-${index}`} className="label text-sm">Question Text*</label>
                <textarea
                    id={`qText-${index}`} name="qText" rows="3"
                    value={question.qText} onChange={handleChange}
                    className="textarea text-sm" required
                />
            </div>
            <div className="mb-2">
                <label htmlFor={`correctQuery-${index}`} className="label text-sm">Correct SQL Query*</label>
                <textarea
                    id={`correctQuery-${index}`} name="correctQuery" rows="4"
                    value={question.correctQuery} onChange={handleChange}
                    className="textarea font-mono text-xs" required
                />
                {/* TODO: Add button to test this query against selected schema */}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-2">
                <div>
                    <label htmlFor={`marks-${index}`} className="label text-sm">Marks*</label>
                    <input
                        type="number" id={`marks-${index}`} name="marks"
                        value={question.marks} onChange={handleChange}
                        className="input text-sm" required min="0" step="0.5"
                    />
                </div>
                <div className="flex items-center mt-5">
                    <input
                        type="checkbox" id={`orderIndependent-${index}`} name="orderIndependent"
                        checked={question.orderIndependent} onChange={handleChange}
                        className="mr-2 h-4 w-4"
                    />
                    <label htmlFor={`orderIndependent-${index}`} className="label text-sm pt-1">Order Independent?</label>
                </div>
            </div>
            <button onClick={() => onRemove(index)} className="button-error text-xs mt-1">Remove Question</button>
        </div>
    );
};
// --- End Helper ---

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
    const [questions, setQuestions] = useState([]);
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

    // --- Question Management Functions ---
    const addNewQuestion = () => {
        setQuestions(prev => [
            ...prev,
            // Default structure for a new question
            { qText: '', correctQuery: '', marks: 1, orderIndependent: false }
        ]);
    };

    const updateQuestion = (index, updatedQuestion) => {
        setQuestions(prev => prev.map((q, i) => (i === index ? updatedQuestion : q)));
    };

    const removeQuestion = (index) => {
        setQuestions(prev => prev.filter((_, i) => i !== index));
    };
    // --- End Question Management ---


    // --- Handle Form Submission ---
    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        setMessage('');

        // Validation
        if (!db || !assignmentName || !selectedCourseId || !schemaId || connectionId === '' || questions.length === 0) {
            setMessage('Error: Please fill Assignment Name, select Schema/Connection, and add at least one question.');
            return;
        }
        // Add validation within questions if needed (e.g., check for empty text/query)
        if (questions.some(q => !q.qText.trim() || !q.correctQuery.trim())) {
            setMessage('Error: Please ensure all questions have Question Text and a Correct SQL Query.');
            return;
        }

        setIsLoading(true);
        let transactionStarted = false;
        let nextAssignmentId = 0; // To store the generated ID

        try {
            await db.query('BEGIN');
            transactionStarted = true;

            // 1. Get next assignment ID
            const maxIdResult = await db.query(
                'SELECT MAX(assignment_id) as max_id FROM public.xdata_assignment WHERE course_id = $1',
                [selectedCourseId]
            );
            nextAssignmentId = (maxIdResult.rows[0]?.max_id || 0) + 1;

            // 2. Insert into xdata_assignment
            const assignmentSql = `
                INSERT INTO public.xdata_assignment
                    (course_id, assignment_id, assignmentname, description, defaultschemaid, connection_id)
                VALUES ($1, $2, $3, $4, $5, $6);
            `;
            const finalConnectionId = connectionId === 'NULL' ? null : parseInt(connectionId, 10);
            const assignmentParams = [
                selectedCourseId, nextAssignmentId, assignmentName.trim(),
                description.trim() || null, parseInt(schemaId, 10), finalConnectionId
            ];
            await db.query(assignmentSql, assignmentParams);
            console.log(`Assignment ${nextAssignmentId} inserted.`);

            const qinfoSql = `
            INSERT INTO public.xdata_qinfo
                (course_id, assignment_id, question_id, querytext, correctquery, totalmarks, orderindependent, query_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `; // Added query_id column and $8 placeholder

            for (let i = 0; i < questions.length; i++) {
                const question = questions[i];
                const questionId = i + 1; // Assign sequential ID (1-based) for question_id

                // *** MODIFIED PARAMS ARRAY ***
                const qinfoParams = [
                    selectedCourseId,           // $1: course_id
                    nextAssignmentId,           // $2: assignment_id
                    questionId,                 // $3: question_id (sequential 1, 2, ...)
                    question.qText.trim(),      // $4: querytext
                    question.correctQuery.trim(),// $5: correctquery
                    parseFloat(question.marks) || 0, // $6: totalmarks
                    question.orderIndependent || false, // $7: orderindependent
                    questionId                  // $8: query_id (set same as question_id)
                ];
                await db.query(qinfoSql, qinfoParams);
                console.log(`Question ${questionId} (Query ID: ${questionId}) for assignment ${nextAssignmentId} inserted.`); // Updated log
            }

            // 4. Commit
            await db.query('COMMIT');
            transactionStarted = false;

            setMessage(`Assignment '${assignmentName}' (ID: ${nextAssignmentId}) with ${questions.length} question(s) created successfully!`);
            // Navigate back to the list page
            setTimeout(() => navigate('/assignments'), 1500);

        } catch (err) {
            console.error("Error creating assignment:", err);
            setMessage(`Error: ${err.message}`);
            if (transactionStarted) {
                try { await db.query('ROLLBACK'); console.log("Transaction rolled back."); }
                catch (rbError) { console.error("Rollback failed:", rbError); }
            }
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
            <h2 className="heading">Create New Assignment for Course: {selectedCourseId}</h2>
            {isMetaLoading && <p>Loading options...</p>}
            {message && <p className={`message text-sm my-3 ${message.includes('Error:') ? 'error' : 'success'}`}>{message.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>)}</p>}

            {/* Main form for assignment details */}
            <form onSubmit={handleCreateAssignment}>
                {/* Assignment Details Section */}
                <div className="p-4 border border-gray-600 rounded-lg bg-gray-800 mb-6">
                    <h3 className="text-lg font-semibold mb-3">Assignment Details</h3>
                    {/* Assignment Name Input */}
                    <div className="mb-3">
                        <label htmlFor="assignmentname" className="label">Assignment Name*</label>
                        <input type="text" id="assignmentname" value={assignmentName} onChange={(e) => setAssignmentName(e.target.value)} className="input" required maxLength="20" disabled={isLoading} />
                    </div>
                    {/* Description Textarea */}
                    <div className="mb-3">
                        <label htmlFor="description" className="label">Description</label>
                        <textarea id="description" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} className="textarea" disabled={isLoading} />
                    </div>
                    {/* Schema and Connection Dropdowns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        {/* Base Schema Dropdown */}
                        <div>
                            <label htmlFor="schemaId" className="label">Base Student Schema Definition*</label>
                            <select id="schemaId" value={schemaId} onChange={(e) => setSchemaId(e.target.value)} className="input" required disabled={isLoading || isMetaLoading || schemas.length === 0}>
                                <option value="">-- Select Base Schema --</option>
                                {schemas.map(s => <option key={s.schema_id} value={String(s.schema_id)}>{s.schema_name} (ID: {s.schema_id})</option>)}
                            </select>
                            {schemas.length === 0 && !isMetaLoading && <p className="text-xs text-red-400 mt-1">No base schemas found for this course.</p>}
                        </div>
                        {/* Connection Dropdown */}
                        <div>
                            <label htmlFor="connectionId" className="label">Database Connection*</label>
                            <select id="connectionId" value={connectionId} onChange={(e) => setConnectionId(e.target.value)} className="input" required disabled={isLoading || isMetaLoading}>
                                <option value="">-- Select Connection --</option>
                                <option value="NULL">(None)</option>
                                {connections.map(c => <option key={c.connection_id} value={String(c.connection_id)}>{c.connection_name || `Conn ${c.connection_id}`}</option>)}
                            </select>
                        </div>
                    </div>
                </div> {/* End Assignment Details Section */}

                {/* Questions Section */}
                <div className="p-4 border border-gray-600 rounded-lg bg-gray-800 mb-6">
                    <h3 className="text-lg font-semibold mb-3">Questions</h3>
                    {questions.length === 0 && <p className="text-gray-400 text-sm mb-3">No questions added yet.</p>}
                    {questions.map((q, index) => (
                        <QuestionEditor
                            key={index} // Using index is okay here as long as we don't reorder heavily
                            index={index}
                            question={q}
                            onUpdate={updateQuestion}
                            onRemove={removeQuestion}
                        />
                    ))}
                    <button type="button" onClick={addNewQuestion} className="button bg-green-600 hover:bg-green-700 text-sm mt-2" disabled={isLoading}>
                        Add New Question
                    </button>
                </div> {/* End Questions Section */}


                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => navigate('/assignments')} className="button text-sm bg-gray-600 hover:bg-gray-700 text-white" disabled={isLoading}>Cancel</button>
                    <button type="submit" className="button text-sm bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={isLoading || isMetaLoading || !db || !assignmentName || !schemaId || connectionId === '' || questions.length === 0 || questions.some(q => !q.qText.trim() || !q.correctQuery.trim())}>
                        {isLoading ? 'Creating...' : 'Create Assignment & Questions'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddAssignmentPage;
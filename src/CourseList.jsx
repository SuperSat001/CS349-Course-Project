// src/CourseList.jsx
import { useState, useEffect, useCallback } // Import useCallback
  from 'react'
import { usePGlite } from '@electric-sql/pglite-react'
import AddCourseForm from './AddCourseForm'; // Import the new form component

const CourseList = () => {
    const db = usePGlite ? usePGlite() : null;
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false); // State to toggle form visibility

    // Wrap fetchCourses in useCallback so it can be called from outside useEffect
    // without changing its identity unless db changes.
    const fetchCourses = useCallback(async () => {
        if (!db) {
            setError("Database connection not available.");
            setLoading(false);
            return;
        }
        console.log("Fetching courses...");
        setLoading(true);
        setError(''); // Clear previous errors before fetching
        try {
            const result = await db.query(`SELECT instructor_course_id, course_name, description, year, semester FROM public.xdata_course ORDER BY course_name;`);
            setCourses(result.rows);
             if (result.rows.length === 0) {
                 setError("No courses found in the database."); // Use error state for feedback
             }
        } catch (err) {
            console.error("Error fetching courses:", err);
            setError(`Failed to fetch courses: ${err.message}. Ensure 'xdata_course' table exists.`);
            setCourses([]); // Clear courses on error
        } finally {
            setLoading(false);
        }
    }, [db]); // Dependency is db connection

    // Initial fetch on component mount or when db connection changes
    useEffect(() => {
        if (db) {
            fetchCourses();
        } else {
             setError("Database connection not ready.");
             setLoading(false);
        }
    }, [db, fetchCourses]); // Include fetchCourses in dependencies

    // Function to handle successful course addition from the form
    const handleCourseAdded = () => {
        setShowAddForm(false); // Hide the form
        fetchCourses(); // Re-fetch the course list
    };

    // Render logic
    return (
        <div className="container">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="heading">Available Courses</h2>
                 {/* Button to show the add course form */}
                 <button
                    onClick={() => setShowAddForm(true)}
                    className="button bg-green-600 hover:bg-green-700 text-white"
                    disabled={!db} // Disable if DB is not ready
                 >
                     Add New Course
                 </button>
            </div>

            {/* Conditionally render the AddCourseForm */}
            {showAddForm && (
                <AddCourseForm
                    onCourseAdded={handleCourseAdded}
                    onCancel={() => setShowAddForm(false)} // Pass function to hide form
                />
            )}

            {/* Display Loading / Error States */}
            {loading && <p>Loading courses...</p>}
            {error && !error.startsWith("No courses found") && <p className="error">{error}</p>}
            {!loading && error.startsWith("No courses found") && <p className="message info">{error}</p>}


            {/* Display Course List */}
            {!loading && courses.length > 0 && (
                <ul>
                    {courses.map((course) => (
                        <li key={course.instructor_course_id} className="listItem">
                            <h3 className="text-xl font-semibold">{course.course_name || '(No Name)'}</h3>
                            <p className="text-sm text-gray-400 mb-1">
                                ID: {course.instructor_course_id}
                                {course.year && course.semester && ` | ${course.semester}, ${course.year}`}
                                {course.year && !course.semester && ` | ${course.year}`}
                                {!course.year && course.semester && ` | ${course.semester}`}
                            </p>
                            <p className="text-gray-300">{course.description || '(No description)'}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default CourseList;
import { useState,useEffect } from 'react'
import { usePGlite } from '@electric-sql/pglite-react'

const CourseList = () => {
    const db = usePGlite ? usePGlite() : null; 
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
      const fetchCourses = async () => {
        if (!db) {
          setError("Database connection not available via usePGlite hook.");
          setLoading(false);
          return;
        }
        setLoading(true);
        setError(''); // Clear previous errors
        try {
          // Fetch course data
          const result = await db.query(`SELECT instructor_course_id, course_name, description FROM public.xdata_course ORDER BY course_name;`);
          setCourses(result.rows);
        } catch (err) {
          console.error("Error fetching courses:", err);
          setError(`Failed to fetch courses: ${err.message}. Ensure the 'xdata_course' table exists and the database is loaded correctly.`);
          setCourses([]); // Clear courses on error
        } finally {
          setLoading(false); // Ensure loading is set to false in all cases
        }
      };

      if (usePGlite) {
          fetchCourses();
      } else {
          setError("usePGlite hook is not available.");
          setLoading(false);
      }

    }, [db]); // Dependency array includes db

    // Render logic
    return (
      <div className="container">
        <h2 className="heading">Available Courses</h2>
        {loading && <p>Loading courses...</p>}
        {error && <p className="error">{error}</p>}
        {!usePGlite && <p className="error">PGLite React hook not found.</p>}
        {!loading && !error && db && courses.length === 0 && usePGlite && (
          <p>No courses found in the loaded database.</p>
        )}

        {!loading && !error && db && courses.length > 0 && usePGlite && (
          <ul>
            {courses.map((course) => (
              <li key={course.instructor_course_id} className="listItem">
                <h3 className="text-xl font-semibold">{course.course_name || '(No Name)'}</h3>
                <p className="text-sm text-gray-400 mb-2">ID: {course.instructor_course_id}</p>
                <p className="text-gray-300">{course.description || '(No description)'}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

export default CourseList;

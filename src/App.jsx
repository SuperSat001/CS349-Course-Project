import { Routes, Route, Link } from 'react-router-dom'
import Options from './Options.jsx'
import Dummy2 from './Dummy2.jsx'
import Minimal from './Minimal.jsx'
import './App.css'

const Navbar = () => (
  <nav>
    <Link to="/">Home</Link>
    <Link to="/options">Query Planning</Link>
    <Link to="/dummy2">Dummy2</Link>
  </nav>
)

function App() {

  return (
    <div>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            <Minimal />
          }
        />
        <Route path="/options" element={<Options />} />
        <Route path="/dummy2" element={<Dummy2 />} />
      </Routes>
    </div>
  )
}

export default App;
import {Someth,Login,Register} from './Webpage.jsx'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';



function App() {

  

  return (
    <>
      <BrowserRouter>
        <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/home" element={<Someth />} />
                      <Route path="/register" element={<Register />} />
        </Routes>
      </BrowserRouter>
      
    </>
  )
}

export default App

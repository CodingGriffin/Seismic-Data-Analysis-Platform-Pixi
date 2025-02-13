import {useState} from 'react'
import './App.scss'
import GeometryButton, {GeometryItem} from "./components/GeometryButton.tsx";


function App() {
    const [geometry, setGeometry] = useState<GeometryItem[]>([])
    return (
        <GeometryButton geometry={geometry} setGeometry={setGeometry}/>
    )
}

export default App

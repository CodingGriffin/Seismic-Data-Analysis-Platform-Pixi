import {useState} from 'react'
import './App.scss'
import GeometryButton, {GeometryItem} from "./components/GeometryButton.tsx";
import AddGeometry from './components/AddGeometry.tsx';

function App() {
    const [geometry, setGeometry] = useState<GeometryItem[]>([])
    return (
        // <GeometryButton geometry={geometry} setGeometry={setGeometry}/>
        <AddGeometry onSetGeometry={setGeometry} onClose={() => {}}/>
    )
}

export default App

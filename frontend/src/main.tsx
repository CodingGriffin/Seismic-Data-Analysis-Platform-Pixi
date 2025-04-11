import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.scss'
import './scss/styles.scss'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from './routes/routes'

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RouterProvider router={router}/>
    </StrictMode>,
)


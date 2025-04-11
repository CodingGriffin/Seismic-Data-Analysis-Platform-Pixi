import { Outlet, Link } from "react-router";
import { Provider } from "react-redux";
import { store } from "../store";
import { Toast } from "../components/Toast/Toast";
import "../App.scss";

export default function RootLayout() {
    return (
        <Provider store={store}>
            <Toast />
            <div className="w-full">
                <nav className="navbar navbar-expand-lg navbar-light bg-light mb-4">
                    <div className="container-fluid">
                        <Link className="navbar-brand" to="/">Home</Link>
                        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                            <span className="navbar-toggler-icon"></span>
                        </button>
                        <div className="collapse navbar-collapse" id="navbarNav">
                            <ul className="navbar-nav">
                                <li className="nav-item">
                                    <Link className="nav-link" to="/picks">Picks</Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/disper">Disper</Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                </nav>
                <Outlet/>
            </div>
        </Provider>
    )
}
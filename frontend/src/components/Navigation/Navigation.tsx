import { Link, NavLink } from "react-router";

const Navigation = () => {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container">
        <Link to="/disper" className="btn btn-primary me-2">
          Go to Dispersion
        </Link>
        
        <NavLink 
          to="/pick" 
          className={({ isActive }) => 
            isActive ? "btn btn-success" : "btn btn-outline-success"
          }
        >
          Pick Page
        </NavLink>
      </div>
    </nav>
  );
};

export default Navigation;
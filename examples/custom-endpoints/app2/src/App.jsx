import React from "react";
import { Routes, Route, Link } from "react-router-dom";

const App2 = () => {
  return (
    <div>
      <h1>App 2</h1>
      <nav>
        <ul>
          <li>
            <Link to="/app2">Dashboard</Link>
          </li>
          <li>
            <Link to="/app2/settings">Settings</Link>
          </li>
        </ul>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  );
};

function Dashboard() {
  return (
    <div>
      <h2>App 2 Dashboard</h2>
      <p>Welcome to App 2's dashboard</p>
    </div>
  );
}

function Settings() {
  return (
    <div>
      <h2>App 2 Settings</h2>
      <p>Configure App 2 settings here</p>
    </div>
  );
}

export default App2;

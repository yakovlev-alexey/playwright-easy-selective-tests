import React from "react";
import { Routes, Route, Link } from "react-router-dom";

const App1 = () => {
  return (
    <div>
      <h1>App 1</h1>
      <nav>
        <ul>
          <li>
            <Link to="/app1">Home</Link>
          </li>
          <li>
            <Link to="/app1/about">About</Link>
          </li>
        </ul>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
};

function Home() {
  return (
    <div>
      <h2>App 1 Home</h2>
      <p>Welcome to App 1</p>
    </div>
  );
}

function About() {
  return (
    <div>
      <h2>About App 1</h2>
      <p>This is App 1's about page</p>
    </div>
  );
}

export default App1;

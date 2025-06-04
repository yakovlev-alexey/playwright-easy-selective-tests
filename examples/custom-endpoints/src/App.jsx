import React from "react";
import { useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

export default function App() {
  return (
    <Router>
      <div>
        <nav>
          <ul>
            <li>
              <Link to="/app1">App 1</Link>
            </li>
            <li>
              <Link to="/app2">App 2</Link>
            </li>
          </ul>
        </nav>

        <Routes>
          <Route path="/app1/*" element={<App1 />} />
          <Route path="/app2/*" element={<App2 />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
}

function Home() {
  return (
    <div>
      <h1>Welcome to Multi-App Example</h1>
      <p>Choose an app from the navigation above</p>
    </div>
  );
}

async function loadApp1() {
  const { default: App1 } = await import("../app1/src/App.jsx");
  return App1;
}

async function loadApp2() {
  const { default: App2 } = await import("../app2/src/App.jsx");
  return App2;
}

function App1() {
  const componentRef = useRef(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    loadApp1().then((App1) => {
      componentRef.current = App1;
      setLoaded(true);
    });
  }, []);

  if (!loaded) return <div>Loading App 1...</div>;
  return <componentRef.current />;
}

function App2() {
  const componentRef = useRef(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    loadApp2().then((App2) => {
      componentRef.current = App2;
      setLoaded(true);
    });
  }, []);

  if (!loaded) return <div>Loading App 2...</div>;
  return <componentRef.current />;
}

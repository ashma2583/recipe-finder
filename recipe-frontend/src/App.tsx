import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [status, setStatus] = useState<string>('Loading...');
  const [cppMessage, setCppMessage] = useState<string>('Click to test C++');
  const [dbTime, setDbTime] = useState<string>('');

  useEffect(() => {
    // Fetch data from YOUR backend
    fetch('http://localhost:3001/api/health')
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.message);
        setDbTime(data.db_time);
      })
      .catch((err) => {
        console.error(err);
        setStatus('Error connecting to backend');
      });
  }, []);

  const testCppEngine = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/test-cpp');
      const data = await res.json();
      setCppMessage(data.message);
    } catch (err) {
      setCppMessage('C++ Engine Offline');
    }
  };

  return (
    <div className="App">
      <h1>Recipe Finder 🍅</h1>
      <div className="card">
        <h2>System Status</h2>
        <p>Backend: <strong>{status}</strong></p>
      </div>

      <div className="card" style={{ border: '2px solid #646cff', marginTop: '20px' }}>
        <h2>High-Performance Engine</h2>
        <p>{cppMessage}</p>
        <button onClick={testCppEngine}>Run C++ Matcher</button>
      </div>
    </div>
  );
}

export default App;
import React, { useState, useEffect, useCallback } from 'react';

const cardStyle = {
    flex: 1,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    padding: 20,
  };
  
  const headingStyle = {
    fontSize: 25,
    borderBottom: '1px solid #eee',
    paddingBottom: 10,
    marginBottom: 10,
  };
  
  const listStyle = {
    listStyle: 'disc',
    paddingLeft: 20,
    fontSize: 20,
    lineHeight: '1.8em',
  };
  
  const probStyle = {
    color: '#555',
    fontSize: 14,
  };
  
const AutocompleteComponent = () => {
  const [input, setInput] = useState('');
  const [noSmoothing, setNoSmoothing] = useState([]);
  const [laplaceSmoothing, setLaplaceSmoothing] = useState([]);
  const [kneserNey, setKneserNey] = useState([]);
  const [error, setError] = useState('');

  const fetchSuggestions = useCallback(async () => {
    if (!input.trim()) {
      setNoSmoothing([]);
      setLaplaceSmoothing([]);
      setKneserNey([]);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error fetching suggestions");
        return;
      }

      setError('');
      setNoSmoothing(data.no_smoothing.slice(0, 5));
      setLaplaceSmoothing(data.laplace_smoothing.slice(0, 5));
      setKneserNey(data.kneser_ney ? data.kneser_ney.slice(0, 5) : []);
    } catch (err) {
      console.error(err);
      setError("Server error");
    }
  }, [input]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [fetchSuggestions]);

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ fontSize: 32, marginBottom: 20 }}>Autocomplete</h2>
  
      <input
        type="text"
        value={input}
        placeholder="Start typing..."
        onChange={(e) => setInput(e.target.value)}
        style={{
          width: '100%',
          padding: 12,
          fontSize: 18,
          borderRadius: 6,
          border: '1px solid #ccc',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          outlineColor: '#f5c542',
        }}
      />
  
      {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}
  
      <div style={{ display: 'flex', gap: 20, marginTop: 30 }}>
        {/* CARD */}
        <div style={cardStyle}>
          <h4 style={headingStyle}>No Smoothing</h4>
          <ul style={listStyle}>
            {noSmoothing.map((item, i) => (
              <li key={i}><span style={probStyle}>({item.prob})</span> {item.word}</li>
            ))}
          </ul>
        </div>
  
        {/* CARD */}
        <div style={cardStyle}>
          <h4 style={headingStyle}>Laplace Smoothing</h4>
          <ul style={listStyle}>
            {laplaceSmoothing.map((item, i) => (
              <li key={i}><span style={probStyle}>({item.prob})</span> {item.word}</li>
            ))}
          </ul>
        </div>
  
        {/* CARD */}
        <div style={cardStyle}>
          <h4 style={headingStyle}>Kneser-Ney Smoothing</h4>
          <ul style={listStyle}>
            {kneserNey.map((item, i) => (
              <li key={i}><span style={probStyle}>({item.prob})</span> {item.word}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
  
};

export default AutocompleteComponent;

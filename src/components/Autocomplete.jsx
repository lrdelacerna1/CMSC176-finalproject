import React, { useState, useEffect } from 'react';

const corpus = [
    "the cat sat on the mat",
    "the dog sat on the rug",
    "the cat chased the mouse",
    "the dog barked loudly",
    "the mouse ran away",
    "the mat was soft",
    "the rug was dirty",
    "the cat was sleepy",
    "the dog was noisy",
    "the mouse was quick"
  ];

  
const AutocompleteComponent = () => {
  const [input, setInput] = useState('');
  const [noSmoothing, setNoSmoothing] = useState([]);
  const [laplaceSmoothing, setLaplaceSmoothing] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchSuggestions();
    }, 300); // debounce to avoid over-fetching

    return () => clearTimeout(delayDebounce);
  }, [input]);

  const fetchSuggestions = async () => {
    if (!input.trim()) {
      setNoSmoothing([]);
      setLaplaceSmoothing([]);
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
      setNoSmoothing(data.no_smoothing);
      setLaplaceSmoothing(data.laplace_smoothing);
    } catch (err) {
      console.error(err);
      setError("Server error");
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: 'auto' }}>
      <h2>Autocomplete</h2>
      <input
        type="text"
        value={input}
        placeholder="Start typing..."
        onChange={(e) => setInput(e.target.value)}
        style={{ width: '100%', padding: 10, fontSize: 16 }}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
  
      <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
        <div style={{ flex: 1 }}>
          <h4>No Smoothing</h4>
          <ul>
            {noSmoothing.map((item, i) => (
              <li key={i}>{item.word} ({item.prob})</li>
            ))}
          </ul>
        </div>
  
        <div style={{ flex: 1 }}>
          <h4>Laplace Smoothing</h4>
          <ul>
            {laplaceSmoothing.map((item, i) => (
              <li key={i}>{item.word} ({item.prob})</li>
            ))}
          </ul>
        </div>
  
        <div style={{ flex: 1 }}>
          <h4>Corpus</h4>
          <ul>
            {corpus.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};



export default AutocompleteComponent;

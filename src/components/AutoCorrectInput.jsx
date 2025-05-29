import React, { useState } from 'react';
import axios from 'axios';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AutocorrectDemo() {
  const [word, setWord] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const handleSubmit = async () => {
    if (!word.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/autocorrect', { word });
      setResults(response.data);
      setHistory(prev => [...prev, {
        word,
        results: response.data
      }].slice(-5)); // Keep last 5 searches
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = results?.corrections?.map(c => ({
    word: c.word,
    unsmoothed: c.unsmoothed_prob,
    smoothed: c.smoothed_prob,
    probabilityDifference: Math.abs(c.smoothed_prob - c.unsmoothed_prob)
  })) || [];

  const probabilityComparisonData = results?.corrections?.flatMap(c => [
    { name: c.word, type: 'Unsmoothed', value: c.unsmoothed_prob },
    { name: c.word, type: 'Smoothed', value: c.smoothed_prob }
  ]) || [];

  const historyData = history.map(item => ({
    name: item.word,
    suggestions: item.results.corrections.length
  }));

  return (
    <div className="container">
      <div className="header">
        <h1>Autocorrect with Smoothing Comparison</h1>
        <div className="search-box">
          <input
            type="text"
            placeholder="Enter a misspelled word..."
            value={word}
            onChange={e => setWord(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Checking...' : 'Check'}
          </button>
        </div>
        <p className="hint">Try words like "recieve", "acomodate", or "definately"</p>
      </div>

      {results && (
        <>
          <div className="results-section">
            <h2>Results for: "{word}"</h2>
            
            <div className="chart-grid">
              <div className="chart-container">
                <h3>Probability Comparison</h3>
                <div className="chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="word" />
                      <YAxis label={{ value: 'Probability', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value) => value.toFixed(6)} />
                      <Legend />
                      <Bar dataKey="unsmoothed" fill="#8884d8" name="Unsmoothed" />
                      <Bar dataKey="smoothed" fill="#82ca9d" name="Smoothed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-container">
                <h3>Probability Difference</h3>
                <div className="chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="word" name="Word" />
                      <YAxis label={{ value: 'Δ Probability', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value) => value.toFixed(6)} />
                      <Legend />
                      <Scatter name="Difference" data={chartData} fill="#FF8042" dataKey="probabilityDifference" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="chart-grid">
              <div className="chart-container">
                <h3>Side-by-Side Comparison</h3>
                <div className="chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={probabilityComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: 'Probability', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value) => value.toFixed(6)} />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke="#8884d8" name="Unsmoothed" 
                        strokeDasharray="5 5" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="value" stroke="#82ca9d" name="Smoothed" 
                        dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-container">
                <h3>Probability Distribution</h3>
                <div className="chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="smoothed"
                        nameKey="word"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value.toFixed(6)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="results-table">
              <h3>Detailed Probabilities</h3>
              <table>
                <thead>
                  <tr>
                    <th>Word</th>
                    <th>Unsmoothed Probability</th>
                    <th>Smoothed Probability</th>
                    <th>Difference</th>
                    <th>Improvement</th>
                  </tr>
                </thead>
                <tbody>
                  {results.corrections.map((c, idx) => (
                    <tr key={idx}>
                      <td>{c.word}</td>
                      <td>{c.unsmoothed_prob.toFixed(6)}</td>
                      <td>{c.smoothed_prob.toFixed(6)}</td>
                      <td>
                        {(c.smoothed_prob - c.unsmoothed_prob).toFixed(6)}
                      </td>
                      <td>
                        {((c.smoothed_prob - c.unsmoothed_prob) / c.unsmoothed_prob * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {history.length > 0 && (
            <div className="history-section">
              <h2>Search History</h2>
              <div className="chart">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={historyData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Suggestions', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="suggestions" fill="#8884d8" name="Suggestions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        
        .header {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        h1, h2, h3 {
          color: #333;
        }
        
        .search-box {
          display: flex;
          gap: 10px;
          margin: 15px 0;
        }
        
        input {
          flex: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        
        button {
          padding: 10px 20px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
        
        button:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }
        
        .hint {
          color: #666;
          font-size: 14px;
          margin-top: 5px;
        }
        
        .results-section, .history-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        
        .chart-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 20px 0;
        }
        
        .chart-container {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
        }
        
        .chart {
          height: 300px;
        }
        
        .results-table {
          margin-top: 20px;
          overflow-x: auto;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
        }
        
        th, td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        
        th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        tr:hover {
          background-color: #f1f1f1;
        }
        
        @media (max-width: 768px) {
          .chart-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
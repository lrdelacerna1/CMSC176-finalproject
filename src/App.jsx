import React, { useState } from 'react';
import axios from "axios";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function App() {
  const [text, setText] = useState("");
  const [classification, setClassification] = useState("");
  const [word, setWord] = useState("");
  const [autocorrectResult, setAutocorrectResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const classifyText = async () => {
    const res = await axios.post("http://localhost:5000/classify", { text });
    setClassification(res.data.class);
  };

  const checkAutocorrect = async () => {
    if (!word.trim()) return;
    
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/autocorrect", { word });
      setAutocorrectResult(res.data);
      setHistory(prev => [...prev, {
        word,
        results: res.data
      }].slice(-3));
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = autocorrectResult?.corrections?.map(c => ({
    name: c.word,
    unsmoothed: c.unsmoothed_prob,
    smoothed: c.smoothed_prob,
    frequency: c.frequency
  })) || [];

  const pieData = chartData.map(item => ({
    name: item.name,
    value: item.smoothed
  }));

  const historyData = history.map((item, index) => ({
    name: item.word,
    suggestions: item.results.corrections.length,
    fill: COLORS[index % COLORS.length]
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Language Processing Demo</h1>
          <p className="text-gray-600">TF-IDF Classification and Autocorrect with Smoothing</p>
        </header>

        {/* Text Classification Section */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Text Classification</h2>
          <div className="space-y-4">
            <textarea
              className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="4"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text for classification"
            />
            <button
              onClick={classifyText}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
            >
              Classify Text
            </button>
            {classification && (
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="font-medium">Predicted Class:</p>
                <p className="text-blue-800 font-semibold">{classification}</p>
              </div>
            )}
          </div>
        </section>

        {/* Autocorrect Section */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Autocorrect with Smoothing</h2>
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && checkAutocorrect()}
                placeholder="Enter a misspelled word"
              />
              <button
                onClick={checkAutocorrect}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition disabled:bg-gray-400"
              >
                {loading ? "Processing..." : "Check Spelling"}
              </button>
            </div>

            {autocorrectResult && (
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-md">
                  <h3 className="font-medium">Results for: "{autocorrectResult.original}"</h3>
                  <p className="text-sm text-gray-600">
                    Vocabulary Size: {autocorrectResult.stats.vocab_size} | 
                    Total Words: {autocorrectResult.stats.total_words}
                  </p>
                </div>

                {/* Visualization Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bar Chart */}
                  <div className="h-80 bg-gray-50 p-4 rounded-md">
                    <h4 className="text-center font-medium mb-2">Probability Comparison</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => value.toFixed(6)}
                          labelFormatter={(value) => `Word: ${value}`}
                        />
                        <Legend />
                        <Bar dataKey="unsmoothed" fill="#8884d8" name="Unsmoothed" />
                        <Bar dataKey="smoothed" fill="#82ca9d" name="Smoothed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie Chart */}
                  <div className="h-80 bg-gray-50 p-4 rounded-md">
                    <h4 className="text-center font-medium mb-2">Probability Distribution</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => value.toFixed(6)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Detailed Results Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Word</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unsmoothed Prob</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Smoothed Prob</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {autocorrectResult.corrections.map((correction, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{correction.word}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{correction.frequency}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{correction.unsmoothed_prob.toFixed(6)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{correction.smoothed_prob.toFixed(6)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {(correction.smoothed_prob - correction.unsmoothed_prob).toFixed(6)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Search History */}
                {history.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-2">Recent Searches</h4>
                    <div className="h-64 bg-gray-50 p-4 rounded-md">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={historyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="suggestions" name="Suggestions">
                            {historyData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
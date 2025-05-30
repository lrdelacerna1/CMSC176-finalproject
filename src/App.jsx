import React, { useState } from "react";
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
} from "recharts";

import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import SentenceProbability from "./components/SentenceProbability";
import Autocomplete from "./components/Autocomplete";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

function App() {
  const [text, setText] = useState("");
  const [classification, setClassification] = useState("");
  const [word, setWord] = useState("");
  const [autocorrectResult, setAutocorrectResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [sentence, setSentence] = useState("");
  const [sentenceProb, setSentenceProb] = useState(null);
  const [probLoading, setProbLoading] = useState(false);

  
  const calculateSentenceProb = async () => {
    if (!sentence.trim()) return;

    setProbLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:5000/sentence_probability",
        { sentence }
      );
      setSentenceProb(res.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setProbLoading(false);
    }
  };

  return (
    <div className="container py-5">
      {/* Header */}
      <div className="text-center mb-5">
        <h1 className="h4 fw-bold text-muted">Add-One Smoothing</h1>
      </div>

      {/* Sentence Probability Component */}
      <SentenceProbability
        sentence={sentence}
        setSentence={setSentence}
        calculateSentenceProb={calculateSentenceProb}
        probLoading={probLoading}
        sentenceProb={sentenceProb}
      />
      {/* Autocomplete Component */}
      <div>
         <Autocomplete />;
      </div>
    </div>
  );
}

export default App;

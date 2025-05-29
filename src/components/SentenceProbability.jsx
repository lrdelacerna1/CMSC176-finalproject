import React from "react";

function SentenceProbability({
  sentence,
  setSentence,
  calculateSentenceProb,
  probLoading,
  sentenceProb,
}) {

  
  return (
    <section
  className="container-xl bg-white p-4 rounded shadow mb-4"
  style={{ minHeight: "80vh" }}
>
  <div className="row d-flex align-items-start">
    {/* Left Column */}
    <div className="col-md-6 mb-4 d-flex flex-column justify-content-between">
      <h2 className="h4 mb-4">Sentence Probability</h2>
      <div>
        <div className="form-group mb-3">
          <label htmlFor="sentenceInput" className="form-label">
            Enter a sentence:
          </label>
          <textarea
            id="sentenceInput"
            className="form-control"
            rows="6"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder="Type your sentence here"
          />
        </div>
      </div>
      <div className="d-flex justify-content-end mt-auto">
        <button
          onClick={calculateSentenceProb}
          disabled={probLoading}
          className="btn btn-primary"
        >
          {probLoading ? "Calculating..." : "Calculate Probability"}
        </button>
      </div>
    </div>

    {/* Right Column */}
    <div className="col-md-6 ps-4 border-start">
      {sentenceProb && (
        <>
          <h2 className="h4 mb-4">Probability of the Sentence</h2>

          <div className="alert alert-info">
            <p className="mb-1">
              <strong>"{sentenceProb.sentence}"</strong>
            </p>
            <p className="mb-0">
              <strong>Probability:</strong>{" "}
              {(sentenceProb.probability * 100).toFixed(4)}%
            </p>
          </div>

          <div className="row">
            <div className="col-md-6">
              <h6>Unigrams</h6>
              <div className="table-responsive">
                <table className="table table-bordered table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>Word</th>
                      <th>Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentenceProb.unigrams.length > 0 ? (
                      sentenceProb.unigrams.map((uni, index) => (
                        <tr key={`uni-${index}`}>
                          <td>{uni.word}</td>
                          <td>{uni.frequency.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="text-center text-muted">
                          No unigrams found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="col-md-6">
              <h6>Bigrams</h6>
              <div className="table-responsive">
                <table className="table table-bordered table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>Bigram</th>
                      <th>Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentenceProb.bigrams.length > 0 ? (
                      sentenceProb.bigrams.map((bi, index) => (
                        <tr key={`bi-${index}`}>
                          <td>{bi.bigram}</td>
                          <td>{bi.frequency.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="text-center text-muted">
                          No bigrams found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
</section>

  );
}

export default SentenceProbability;

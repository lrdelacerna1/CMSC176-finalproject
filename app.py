from flask import Flask, request, jsonify
from flask_cors import CORS
import nltk
import string
from collections import defaultdict, Counter
import math
from nltk.corpus import webtext
from nltk.tokenize import sent_tokenize, word_tokenize

# Download resources
nltk.download('webtext')
nltk.download('punkt')

# === Flask Setup ===
app = Flask(__name__)
CORS(app)

# === Preprocessing ===
translator = str.maketrans("", "", string.punctuation)
raw_words = [word for fileid in webtext.fileids() for word in webtext.words(fileid)]
tokens = [word.lower().translate(translator) for word in raw_words if word.isalpha()]

# === Corpus Statistics ===
word_freq = Counter(tokens)
total_words = sum(word_freq.values())
vocab_size = len(word_freq)

bigram_counts = Counter((tokens[i], tokens[i+1]) for i in range(len(tokens)-1))
total_bigrams = sum(bigram_counts.values())
vocab_bigrams = len(bigram_counts)

# === Edit Distance for Autocorrect ===
def edit_distance_one(word):
    letters = string.ascii_lowercase
    splits = [(word[:i], word[i:]) for i in range(len(word) + 1)]
    deletes = [L + R[1:] for L, R in splits if R]
    inserts = [L + c + R for L, R in splits for c in letters]
    replaces = [L + c + R[1:] for L, R in splits if R for c in letters]
    transposes = [L + R[1] + R[0] + R[2:] for L, R in splits if len(R) > 1]
    return set(deletes + inserts + replaces + transposes)

def get_suggestions(input_word):
    input_word = input_word.lower()
    candidates = edit_distance_one(input_word)
    filtered = [w for w in candidates if w in word_freq]
    suggestions = []
    for word in filtered:
        freq = word_freq[word]
        prob_unsmoothed = freq / total_words
        prob_smoothed = (freq + 1) / (total_words + vocab_size)
        suggestions.append({
            "word": word,
            "smoothed_prob": prob_smoothed,
            "unsmoothed_prob": prob_unsmoothed,
            "frequency": freq
        })
    return sorted(suggestions, key=lambda x: x['smoothed_prob'], reverse=True)[:5]

# === Sentence Probability Endpoint ===
def calculate_sentence_probability(sentence):
    words = sentence.lower().split()
    if not words:
        return 0.0

    unigram_probs = [(word_freq.get(w, 0) + 1) / (total_words + vocab_size) for w in words]
    bigram_probs = [(bigram_counts.get((words[i], words[i+1]), 0) + 1) / (total_bigrams + vocab_bigrams)
                    for i in range(len(words) - 1)]

    if unigram_probs and bigram_probs:
        log_prob = (sum(map(math.log, unigram_probs)) + sum(map(math.log, bigram_probs))) / (len(unigram_probs) + len(bigram_probs))
        return math.exp(log_prob)
    elif unigram_probs:
        return math.exp(sum(map(math.log, unigram_probs)) / len(unigram_probs))
    else:
        return 0.0

@app.route("/sentence_probability", methods=["POST"])
def sentence_probability():
    sentence = request.json.get("sentence", "")
    prob = calculate_sentence_probability(sentence)
    words = sentence.lower().split()

    unigrams = [{
        "word": word,
        "frequency": word_freq.get(word, 0),
        "probability": (word_freq.get(word, 0) + 1) / (total_words + vocab_size)
    } for word in set(words)]

    bigrams = [{
        "bigram": f"{words[i]} {words[i+1]}",
        "frequency": bigram_counts.get((words[i], words[i+1]), 0),
        "probability": (bigram_counts.get((words[i], words[i+1]), 0) + 1) / (total_bigrams + vocab_bigrams)
    } for i in range(len(words)-1)]

    return jsonify({
        "sentence": sentence,
        "probability": prob,
        "unigrams": sorted(unigrams, key=lambda x: x["frequency"], reverse=True),
        "bigrams": sorted(bigrams, key=lambda x: x["frequency"], reverse=True),
        "corpus_stats": {
            "total_words": total_words,
            "vocab_size": vocab_size,
            "total_bigrams": total_bigrams,
            "vocab_bigrams": vocab_bigrams
        }
    })

# === Trigram Models ===
def preprocess_corpus():
    webtext_sents = []
    for fileid in webtext.fileids():
        raw_text = webtext.raw(fileid)
        sents = sent_tokenize(raw_text)
        for sent in sents:
            cleaned_tokens = [w.lower() for w in word_tokenize(sent) if w.isalpha()]
            if cleaned_tokens:
                webtext_sents.append(" ".join(cleaned_tokens))
    return webtext_sents

corpus = preprocess_corpus()

class NoSmoothingTrigramModel:
    def __init__(self, corpus):
        self.trigrams = Counter()
        self.bigrams = Counter()
        self.train(corpus)

    def train(self, corpus):
        for sentence in corpus:
            tokens = sentence.lower().split()
            for i in range(2, len(tokens)):
                self.trigrams[(tokens[i-2], tokens[i-1], tokens[i])] += 1
                self.bigrams[(tokens[i-2], tokens[i-1])] += 1

    def trigram_prob(self, w1, w2, w3):
        return self.trigrams[(w1, w2, w3)] / self.bigrams[(w1, w2)] if self.bigrams[(w1, w2)] > 0 else 0.0

    def predict_next(self, w1, w2, candidates):
        return sorted([(w, self.trigram_prob(w1, w2, w)) for w in candidates], key=lambda x: x[1], reverse=True)

class LaplaceSmoothingTrigramModel(NoSmoothingTrigramModel):
    def __init__(self, corpus):
        super().__init__(corpus)
        self.vocab = set(w for sent in corpus for w in sent.split())
        self.vocab_size = len(self.vocab)

    def trigram_prob(self, w1, w2, w3):
        return (self.trigrams[(w1, w2, w3)] + 1) / (self.bigrams[(w1, w2)] + self.vocab_size)

class KneserNeyTrigramModel(NoSmoothingTrigramModel):
    def __init__(self, corpus, discount=0.75):
        super().__init__(corpus)
        self.discount = discount
        self.continuation_counts = defaultdict(set)
        self.word_counts = Counter()

        for (w1, w2, w3), count in self.trigrams.items():
            self.continuation_counts[(w1, w2)].add(w3)
            self.word_counts[w3] += 1

        self.unique_continuations = defaultdict(int)
        # for w3 in self.word_counts:
        #     self.unique_continuations[w3] = len([1 for (w1, w2, _w3) in self.trigrams if _w3 == w3])
        w3_to_bigram_contexts = defaultdict(set)
        for (w1, w2, w3) in self.trigrams:
            w3_to_bigram_contexts[w3].add((w1, w2))

        self.unique_continuations = {w3: len(contexts) for w3, contexts in w3_to_bigram_contexts.items()}

        self.total_unique_bigrams = len(set((w1, w2) for (w1, w2, w3) in self.trigrams))

    # def continuation_prob(self, w3):
    #     return self.unique_continuations[w3] / self.total_unique_bigrams
    def continuation_prob(self, w3):
        return self.unique_continuations.get(w3, 0) / self.total_unique_bigrams if self.total_unique_bigrams > 0 else 0.0


    def trigram_prob(self, w1, w2, w3):
        trigram = (w1, w2, w3)
        bigram = (w1, w2)
        c_tri = self.trigrams[trigram]
        c_bi = self.bigrams[bigram]

        if c_bi == 0:
            return self.continuation_prob(w3)

        lambda_w1w2 = self.discount * len(self.continuation_counts[bigram]) / c_bi
        prob = max(c_tri - self.discount, 0) / c_bi + lambda_w1w2 * self.continuation_prob(w3)
        return prob

# === Initialize Models ===
no_smooth = NoSmoothingTrigramModel(corpus)
laplace = LaplaceSmoothingTrigramModel(corpus)
kneser_ney = KneserNeyTrigramModel(corpus)
vocab = list(laplace.vocab)
vocab = sorted(word_freq, key=word_freq.get, reverse=True)[:500]

@app.route("/autocomplete", methods=["POST"])
def autocomplete():
    data = request.get_json()
    text = data.get("text", "").strip().lower()
    tokens = text.split()

    if len(tokens) < 2:
        return jsonify({"no_smoothing": [], "laplace_smoothing": [], "kneser_ney": []})

    w1, w2 = tokens[-2], tokens[-1]

    preds_no = no_smooth.predict_next(w1, w2, vocab)
    preds_lap = laplace.predict_next(w1, w2, vocab)
    preds_kn = kneser_ney.predict_next(w1, w2, vocab)

    return jsonify({
    "no_smoothing": [{"word": w, "prob": round(p, 4)} for w, p in preds_no[:5] if p > 0],
    "laplace_smoothing": [{"word": w, "prob": round(p, 4)} for w, p in preds_lap[:5]],
    "kneser_ney": [{"word": w, "prob": round(p, 4)} for w, p in preds_kn[:5]]
    })

if __name__ == "__main__":
    app.run(debug=True)

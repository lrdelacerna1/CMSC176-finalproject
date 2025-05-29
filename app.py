from flask import Flask, request, jsonify
from flask_cors import CORS
import nltk
import string
from collections import defaultdict
import math

# Download necessary resources
nltk.download('brown')
nltk.download('punkt')

from nltk.corpus import brown

app = Flask(__name__)
CORS(app)

# Tokenize and normalize the Brown corpus
raw_words = brown.words()
translator = str.maketrans("", "", string.punctuation)
tokens = [word.lower().translate(translator) for word in raw_words if word.isalpha()]

# Initialize word frequency data
word_freq = defaultdict(int)
for word in tokens:
    word_freq[word] += 1

total_words = sum(word_freq.values())
vocab_size = len(word_freq)

# Create bigram counts
bigram_counts = defaultdict(int)
for i in range(len(tokens) - 1):
    bigram = (tokens[i], tokens[i + 1])
    bigram_counts[bigram] += 1

total_bigrams = sum(bigram_counts.values())
vocab_bigrams = len(bigram_counts)

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

def calculate_sentence_probability(sentence):
    words = sentence.lower().split()
    if not words:
        return 0.0
    
    unigram_probs = []
    for word in words:
        freq = word_freq.get(word, 0)
        prob = (freq + 1) / (total_words + vocab_size)
        unigram_probs.append(prob)
    
    bigram_probs = []
    for i in range(len(words)-1):
        bigram = (words[i], words[i+1])
        freq = bigram_counts.get(bigram, 0)
        prob = (freq + 1) / (total_bigrams + vocab_bigrams)
        bigram_probs.append(prob)
    
    if unigram_probs and bigram_probs:
        log_prob = (sum(math.log(p) for p in unigram_probs) / len(unigram_probs) +
                    sum(math.log(p) for p in bigram_probs) / len(bigram_probs)) / 2
        return math.exp(log_prob)
    elif unigram_probs:
        return math.exp(sum(math.log(p) for p in unigram_probs) / len(unigram_probs))
    else:
        return 0.0

@app.route("/autocorrect", methods=["POST"])
def autocorrect():
    word = request.json["word"]
    suggestions = get_suggestions(word)
    
    return jsonify({
        "original": word,
        "corrections": suggestions,
        "stats": {
            "vocab_size": vocab_size,
            "total_words": total_words
        }
    })

@app.route("/sentence_probability", methods=["POST"])
def sentence_probability():
    sentence = request.json["sentence"]
    prob = calculate_sentence_probability(sentence)
    
    words = sentence.lower().split()
    unigrams = []
    bigrams = []
    
    for word in set(words):
        freq = word_freq.get(word, 0)
        prob_uni = (freq + 1) / (total_words + vocab_size)
        unigrams.append({
            "word": word,
            "frequency": freq,
            "probability": prob_uni
        })
    
    for i in range(len(words)-1):
        bigram = (words[i], words[i+1])
        freq = bigram_counts.get(bigram, 0)
        prob_bi = (freq + 1) / (total_bigrams + vocab_bigrams)
        bigrams.append({
            "bigram": f"{words[i]} {words[i+1]}",
            "frequency": freq,
            "probability": prob_bi
        })
    
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

# AUTCOMPLETE STUFF
corpus = [
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
]

class NoSmoothingTrigramModel:
    def __init__(self, corpus):
        self.trigrams = defaultdict(int)
        self.bigrams = defaultdict(int)
        self.train(corpus)

    def train(self, corpus):
        for sentence in corpus:
            tokens = sentence.lower().split()
            for i in range(2, len(tokens)):
                self.trigrams[(tokens[i-2], tokens[i-1], tokens[i])] += 1
                self.bigrams[(tokens[i-2], tokens[i-1])] += 1

    def trigram_prob(self, w1, w2, w3):
        if self.bigrams[(w1, w2)] == 0:
            return 0.0
        return self.trigrams[(w1, w2, w3)] / self.bigrams[(w1, w2)]

    def predict_next(self, w1, w2, candidates):
        return sorted(
            [(w, self.trigram_prob(w1, w2, w)) for w in candidates],
            key=lambda x: x[1],
            reverse=True
        )

class LaplaceSmoothingTrigramModel:
    def __init__(self, corpus):
        self.trigrams = defaultdict(int)
        self.bigrams = defaultdict(int)
        self.vocab = set()
        self.vocab_size = 0
        self.train(corpus)

    def train(self, corpus):
        for sentence in corpus:
            tokens = sentence.lower().split()
            self.vocab.update(tokens)
            for i in range(2, len(tokens)):
                self.trigrams[(tokens[i-2], tokens[i-1], tokens[i])] += 1
                self.bigrams[(tokens[i-2], tokens[i-1])] += 1
        self.vocab_size = len(self.vocab)

    def trigram_prob(self, w1, w2, w3):
        return (self.trigrams[(w1, w2, w3)] + 1) / (self.bigrams[(w1, w2)] + self.vocab_size)

    def predict_next(self, w1, w2, candidates):
        return sorted(
            [(w, self.trigram_prob(w1, w2, w)) for w in candidates],
            key=lambda x: x[1],
            reverse=True
        )

# === Initialize models ===
no_smooth = NoSmoothingTrigramModel(corpus)
laplace = LaplaceSmoothingTrigramModel(corpus)
vocab = list(laplace.vocab)

@app.route("/autocomplete", methods=["POST"])
def autocomplete():
    data = request.get_json()
    text = data.get("text", "").strip().lower()
    tokens = text.split()

    if len(tokens) < 2:
        return jsonify({"no_smoothing": [], "laplace_smoothing": []})

    w1, w2 = tokens[-2], tokens[-1]

    preds_no = no_smooth.predict_next(w1, w2, vocab)
    preds_lap = laplace.predict_next(w1, w2, vocab)

    return jsonify({
        "no_smoothing": [{"word": w, "prob": round(p, 4)} for w, p in preds_no if p > 0],
        "laplace_smoothing": [{"word": w, "prob": round(p, 4)} for w, p in preds_lap]
    })



if __name__ == "__main__":
    app.run(debug=True)

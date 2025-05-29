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

if __name__ == "__main__":
    app.run(debug=True)

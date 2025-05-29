from flask import Flask, request, jsonify
from flask_cors import CORS
import nltk
import string
from collections import defaultdict
import numpy as np

nltk.download('words')
from nltk.corpus import words

app = Flask(__name__)
CORS(app)

# Initialize word frequency data
english_words = words.words()
word_freq = defaultdict(int)
for word in english_words:
    word = word.lower()
    word_freq[word] += 1

total_words = sum(word_freq.values())
vocab_size = len(word_freq)

def edit_distance_one(word):
    """Generate all possible words with edit distance of 1"""
    letters = string.ascii_lowercase
    splits = [(word[:i], word[i:]) for i in range(len(word) + 1)]
    deletes = [L + R[1:] for L, R in splits if R]
    inserts = [L + c + R for L, R in splits for c in letters]
    replaces = [L + c + R[1:] for L, R in splits if R for c in letters]
    transposes = [L + R[1] + R[0] + R[2:] for L, R in splits if len(R) > 1]
    return set(deletes + inserts + replaces + transposes)

def get_suggestions(input_word):
    input_word = input_word.lower()
    
    # Generate candidates with edit distance 1
    candidates = edit_distance_one(input_word)
    
    # Filter to only valid English words
    filtered = [w for w in candidates if w in word_freq]
    
    # Calculate probabilities
    suggestions = []
    for word in filtered:
        freq = word_freq[word]
        
        # Unsmoothed probability
        prob_unsmoothed = freq / total_words
        
        # Laplace smoothing (add-one)
        prob_smoothed = (freq + 1) / (total_words + vocab_size)
        
        suggestions.append({
            "word": word,
            "smoothed_prob": prob_smoothed,
            "unsmoothed_prob": prob_unsmoothed,
            "frequency": freq
        })
    
    # Sort by smoothed probability and get top 5
    return sorted(suggestions, key=lambda x: x['smoothed_prob'], reverse=True)[:5]

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

if __name__ == "__main__":
    app.run(debug=True)
import nltk
from collections import defaultdict
import string

def load_custom_corpus(filepath):
    with open(filepath, "r", encoding="utf-8") as file:
        text = file.read().lower()
    words = text.split()  # naive split on whitespace
    return words

# Load corpus from file
custom_words = load_custom_corpus("sample-corpus.txt")

# Create word frequency table
word_freq = defaultdict(int)
for word in custom_words:
    word = word.lower()
    word_freq[word] += 1

total_words = sum(word_freq.values())
vocab_size = len(word_freq)

def edit_distance_one(word):
    """Return all words one edit away from the input word."""
    letters = string.ascii_lowercase
    splits = [(word[:i], word[i:]) for i in range(len(word) + 1)]
    deletes = [L + R[1:] for L, R in splits if R]
    inserts = [L + c + R for L, R in splits for c in letters]
    replaces = [L + c + R[1:] for L, R in splits if R for c in letters]
    return set(deletes + inserts + replaces)

def get_suggestions(input_word):
    input_word = input_word.lower()

    candidates = edit_distance_one(input_word)
    filtered = [w for w in candidates if w in word_freq]

    suggestions = []
    for word in filtered:
        freq = word_freq[word]

        # With Laplace smoothing
        prob_smoothed = (freq + 1) / (total_words + vocab_size)

        # Without smoothing (just raw frequency)
        prob_unsmoothed = freq / total_words

        suggestions.append({
            "word": word,
            "smoothed_prob": round(prob_smoothed, 10),
            "unsmoothed_prob": round(prob_unsmoothed, 10)
        })

    # Sort by smoothed probability
    return sorted(suggestions, key=lambda x: x['smoothed_prob'], reverse=True)[:5]

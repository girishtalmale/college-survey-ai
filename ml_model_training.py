import pandas as pd
import numpy as np
import re
import json
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import LinearSVC
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

# Basic text cleaning & lemmatization function
STOPWORDS = {
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", "you've", "you'll", "you'd",
    'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', "she's", 'her', 'hers',
    'herself', 'it', "it's", 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
    'who', 'whom', 'this', 'that', "that'll", 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but',
    'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
    'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'should', "should've", 'now', 'd', 'll', 'm',
    'o', 're', 've', 'y', 'ain', 'aren'
}

def preprocess_text(text):
    if not isinstance(text, str):
        return ""
    # Convert to lowercase
    text = text.lower()
    # Remove special characters and numbers
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    # Tokenize and remove stopwords
    tokens = text.split()
    cleaned_tokens = [w for w in tokens if w not in STOPWORDS and len(w) > 1]
    return " ".join(cleaned_tokens)

def train_and_evaluate_models(data_path="college_survey_corpus.csv"):
    if not os.path.exists(data_path):
        from dataset_generator import generate_survey_dataset
        df = generate_survey_dataset(1800, data_path)
    else:
        df = pd.read_csv(data_path)
        
    print(f"Loaded dataset with {len(df)} records.")
    
    # Preprocess survey reviews
    df['cleaned_review'] = df['review_text'].apply(preprocess_text)
    
    X = df['cleaned_review']
    y = df['sentiment']
    
    # Train/Test Split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # TF-IDF Vectorization
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=3000)
    X_train_tfidf = vectorizer.fit_transform(X_train)
    X_test_tfidf = vectorizer.transform(X_test)
    
    labels = ["Positive", "Neutral", "Negative"]
    
    models = {
        "Multinomial Naive Bayes": MultinomialNB(),
        "Logistic Regression": LogisticRegression(max_iter=1000, C=1.0, random_state=42),
        "Random Forest Classifier": RandomForestClassifier(n_estimators=100, random_state=42),
        "Support Vector Machine": LinearSVC(C=1.0, random_state=42)
    }
    
    comparison_results = {}
    best_model_name = None
    best_f1 = -1
    best_model_obj = None
    
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train_tfidf, y_train)
        y_pred = model.predict(X_test_tfidf)
        
        acc = float(accuracy_score(y_test, y_pred))
        precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')
        cm = confusion_matrix(y_test, y_pred, labels=labels).tolist()
        
        comparison_results[name] = {
            "accuracy": round(acc, 4),
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
            "confusion_matrix": cm,
            "labels": labels
        }
        
        print(f"  {name} - Accuracy: {acc:.4f}, F1-Score: {f1:.4f}")
        
        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name
            best_model_obj = model
            
    print(f"\nBest Performing Model: {best_model_name} with weighted F1-score of {best_f1:.4f}")
    
    # Save best model and vectorizer
    with open("sentiment_model.pkl", "wb") as f:
        pickle.dump(best_model_obj, f)
        
    with open("tfidf_vectorizer.pkl", "wb") as f:
        pickle.dump(vectorizer, f)
        
    # Extract top informative words per sentiment category from TF-IDF & Logistic Regression coefficients
    feature_names = np.array(vectorizer.get_feature_names_out())
    top_words = {}
    
    log_reg = LogisticRegression(max_iter=1000, random_state=42)
    log_reg.fit(X_train_tfidf, y_train)
    
    for i, label in enumerate(log_reg.classes_):
        top_indices = np.argsort(log_reg.coef_[i])[-10:][::-1]
        top_words[label] = feature_names[top_indices].tolist()
        
    metrics_export = {
        "best_model": best_model_name,
        "models": comparison_results,
        "top_keywords": top_words,
        "total_samples": len(df),
        "test_samples": len(X_test)
    }
    
    with open("model_metrics.json", "w") as f:
        json.dump(metrics_export, f, indent=2)
        
    print("Saved model_metrics.json, sentiment_model.pkl, and tfidf_vectorizer.pkl successfully.")
    return metrics_export

if __name__ == "__main__":
    train_and_evaluate_models()

import os
import json
import pickle
import pandas as pd
import numpy as np
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS

from dataset_generator import generate_survey_dataset
from ml_model_training import preprocess_text, train_and_evaluate_models

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)

DATASET_FILE = "college_survey_corpus.csv"
MODEL_FILE = "sentiment_model.pkl"
VECTORIZER_FILE = "tfidf_vectorizer.pkl"
METRICS_FILE = "model_metrics.json"

# Ensure dataset and ML model are initialized
def init_system():
    if not os.path.exists(DATASET_FILE):
        print("Generating initial survey corpus dataset...")
        generate_survey_dataset(1800, DATASET_FILE)
        
    if not os.path.exists(MODEL_FILE) or not os.path.exists(METRICS_FILE):
        print("Training ML sentiment models...")
        train_and_evaluate_models(DATASET_FILE)

# Load AI Sentiment model and vectorizer
def load_ml_assets():
    if os.path.exists(MODEL_FILE) and os.path.exists(VECTORIZER_FILE):
        with open(MODEL_FILE, "rb") as f:
            model = pickle.load(f)
        with open(VECTORIZER_FILE, "rb") as f:
            vectorizer = pickle.load(f)
        return model, vectorizer
    return None, None

model, vectorizer = load_ml_assets()

def predict_single_sentiment(text):
    global model, vectorizer
    if model is None or vectorizer is None:
        model, vectorizer = load_ml_assets()
        
    if model is None or vectorizer is None:
        # Fallback basic rule classifier if ML model pickle isn't loaded yet
        text_lower = text.lower()
        pos_words = ["good", "great", "excellent", "best", "top", "helpful", "clean", "wonderful", "outstanding", "smooth"]
        neg_words = ["bad", "poor", "outdated", "slow", "broken", "worst", "unhelpful", "strict", "dirty", "unhygienic"]
        pos_count = sum(1 for w in pos_words if w in text_lower)
        neg_count = sum(1 for w in neg_words if w in text_lower)
        if pos_count > neg_count:
            return "Positive", 0.85
        elif neg_count > pos_count:
            return "Negative", 0.85
        else:
            return "Neutral", 0.70

    cleaned = preprocess_text(text)
    tfidf_vec = vectorizer.transform([cleaned])
    
    pred = model.predict(tfidf_vec)[0]
    
    # Calculate confidence probability if model supports predict_proba or decision_function
    confidence = 0.90
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(tfidf_vec)[0]
        confidence = float(np.max(probs))
    elif hasattr(model, "decision_function"):
        decision = model.decision_function(tfidf_vec)[0]
        # Softmax approximation
        exp_dec = np.exp(decision - np.max(decision))
        probs = exp_dec / np.sum(exp_dec)
        confidence = float(np.max(probs))
        
    return pred, round(confidence, 4)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/dashboard-summary", methods=["GET"])
def get_dashboard_summary():
    if not os.path.exists(DATASET_FILE):
        init_system()
        
    df = pd.read_csv(DATASET_FILE)
    
    total_surveys = len(df)
    sentiment_counts = df['sentiment'].value_counts().to_dict()
    
    pos_count = sentiment_counts.get("Positive", 0)
    neu_count = sentiment_counts.get("Neutral", 0)
    neg_count = sentiment_counts.get("Negative", 0)
    
    pos_pct = round((pos_count / total_surveys) * 100, 1) if total_surveys > 0 else 0
    neu_pct = round((neu_count / total_surveys) * 100, 1) if total_surveys > 0 else 0
    neg_pct = round((neg_count / total_surveys) * 100, 1) if total_surveys > 0 else 0
    
    # Facility-wise breakdown
    facility_grouped = df.groupby(['facility', 'sentiment']).size().unstack(fill_value=0).to_dict(orient='index')
    
    # Department-wise breakdown
    dept_grouped = df.groupby(['department', 'sentiment']).size().unstack(fill_value=0).to_dict(orient='index')
    
    # Department average rating
    dept_ratings = df.groupby('department')['rating'].mean().round(2).to_dict()
    
    # Facility average rating
    facility_ratings = df.groupby('facility')['rating'].mean().round(2).to_dict()
    
    top_facility = max(facility_ratings, key=facility_ratings.get) if facility_ratings else "N/A"
    low_facility = min(facility_ratings, key=facility_ratings.get) if facility_ratings else "N/A"
    
    # Load ML metrics comparison
    metrics_data = {}
    if os.path.exists(METRICS_FILE):
        with open(METRICS_FILE, "r") as f:
            metrics_data = json.load(f)
            
    recent_responses = df.tail(10).iloc[::-1].to_dict(orient='records')
    
    return jsonify({
        "status": "success",
        "total_surveys": total_surveys,
        "sentiment_counts": {
            "Positive": pos_count,
            "Neutral": neu_count,
            "Negative": neg_count
        },
        "sentiment_percentages": {
            "Positive": pos_pct,
            "Neutral": neu_pct,
            "Negative": neg_pct
        },
        "facility_analysis": facility_grouped,
        "facility_ratings": facility_ratings,
        "department_analysis": dept_grouped,
        "department_ratings": dept_ratings,
        "top_rated_facility": top_facility,
        "lowest_rated_facility": low_facility,
        "ml_model_metrics": metrics_data,
        "recent_responses": recent_responses
    })

@app.route("/api/submit-feedback", methods=["POST"])
def submit_feedback():
    data = request.json or {}
    
    department = data.get("department", "Computer Science & Engineering")
    academic_year = data.get("academic_year", "1st Year")
    facility = data.get("facility", "Faculties")
    rating = int(data.get("rating", 4))
    review_text = data.get("review_text", "").strip()
    
    if not review_text:
        return jsonify({"status": "error", "message": "Review text cannot be empty."}), 400
        
    # AI Sentiment prediction
    pred_sentiment, confidence = predict_single_sentiment(review_text)
    
    # Generate new student ID
    if os.path.exists(DATASET_FILE):
        df = pd.read_csv(DATASET_FILE)
        new_id = f"STU{len(df) + 1:04d}"
    else:
        new_id = "STU0001"
        df = pd.DataFrame(columns=["student_id", "department", "academic_year", "facility", "rating", "review_text", "sentiment"])
        
    new_entry = {
        "student_id": new_id,
        "department": department,
        "academic_year": academic_year,
        "facility": facility,
        "rating": rating,
        "review_text": review_text,
        "sentiment": pred_sentiment
    }
    
    df = pd.concat([df, pd.DataFrame([new_entry])], ignore_index=True)
    df.to_csv(DATASET_FILE, index=False)
    
    return jsonify({
        "status": "success",
        "message": "Feedback submitted successfully!",
        "predicted_sentiment": pred_sentiment,
        "confidence_score": confidence,
        "submitted_entry": new_entry
    })

@app.route("/api/predict-sentiment", methods=["POST"])
def api_predict_sentiment():
    data = request.json or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"sentiment": "Neutral", "confidence": 0.50})
        
    sentiment, confidence = predict_single_sentiment(text)
    return jsonify({
        "sentiment": sentiment,
        "confidence": confidence,
        "cleaned_text": preprocess_text(text)
    })

@app.route("/api/all-responses", methods=["GET"])
def get_all_responses():
    if not os.path.exists(DATASET_FILE):
        init_system()
        
    df = pd.read_csv(DATASET_FILE)
    
    dept_filter = request.args.get("department")
    facility_filter = request.args.get("facility")
    sentiment_filter = request.args.get("sentiment")
    search_query = request.args.get("search")
    
    filtered_df = df.copy()
    
    if dept_filter and dept_filter != "All":
        filtered_df = filtered_df[filtered_df['department'] == dept_filter]
    if facility_filter and facility_filter != "All":
        filtered_df = filtered_df[filtered_df['facility'] == facility_filter]
    if sentiment_filter and sentiment_filter != "All":
        filtered_df = filtered_df[filtered_df['sentiment'] == sentiment_filter]
    if search_query:
        query = search_query.lower()
        filtered_df = filtered_df[
            filtered_df['review_text'].str.lower().str.contains(query, na=False) |
            filtered_df['student_id'].str.lower().str.contains(query, na=False)
        ]
        
    records = filtered_df.iloc[::-1].to_dict(orient="records")
    return jsonify({
        "status": "success",
        "total_records": len(records),
        "data": records
    })

# Initialize data and models on server start
init_system()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)


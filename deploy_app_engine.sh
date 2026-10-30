#!/bin/bash
# Google App Engine Deployment Script for EduPulse AI

echo "===================================================="
echo " Deploying College Survey AI to Google App Engine"
echo "===================================================="

# Check gcloud CLI
if ! command -v gcloud &> /dev/null
then
    echo "Error: gcloud CLI is not installed."
    echo "Please run this script in Google Cloud Shell or install Google Cloud SDK."
    exit 1
fi

# Ensure dataset and ML model are initialized
echo "Step 1: Checking survey dataset and ML models..."
python3 dataset_generator.py
python3 ml_model_training.py

echo "Step 2: Deploying to Google App Engine using app.yaml..."
gcloud app deploy app.yaml --quiet

echo "===================================================="
echo " Deployment Complete!"
echo " Launching application in browser..."
echo "===================================================="
gcloud app browse

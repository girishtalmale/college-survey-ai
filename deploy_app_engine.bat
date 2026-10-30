@echo off
echo ====================================================
echo  Deploying College Survey AI to Google App Engine
echo ====================================================

python dataset_generator.py
python ml_model_training.py

echo Deploying app to Google App Engine...
gcloud app deploy app.yaml --quiet

echo ====================================================
echo  Deployment Complete!
echo ====================================================
gcloud app browse

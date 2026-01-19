import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

def detect_outliers(records):
    """
    Analyzes a list of dictionary records to find statistical outliers.
    Returns a list of indices (0-based) that are considered anomalies.
    """
    if not records or len(records) < 5:
        return []

    try:
        df = pd.DataFrame(records)
        
        # Select only numeric columns for analysis
        numeric_df = df.select_dtypes(include=[np.number])
        if numeric_df.empty:
            # Try to convert string numbers to actual numbers
            for col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
            numeric_df = df.select_dtypes(include=[np.number])

        # If still no numeric data, we can't detect outliers mathematically
        if numeric_df.empty:
            return []

        # Fill NaNs to avoid errors
        numeric_df = numeric_df.fillna(numeric_df.mean())

        # Train Isolation Forest
        # contamination='auto' lets the model decide the threshold
        clf = IsolationForest(random_state=42, contamination='auto')
        preds = clf.fit_predict(numeric_df)

        # -1 indicates an outlier, 1 indicates inlier
        outlier_indices = [i for i, x in enumerate(preds) if x == -1]
        
        return outlier_indices

    except Exception as e:
        print(f"ML Error: {e}")
        return []

def analyze_quality(records):
    """
    Calculates basic quality metrics for a dataset.
    Returns a dict with quality_score, issues_detected, and summary.
    """
    if not records:
        return {
            "quality_score": 0.0,
            "issues_detected": {"missingValues": 0, "duplicateRows": 0},
            "summary": "Empty dataset"
        }

    try:
        df = pd.DataFrame(records)
        total_cells = df.size
        total_rows = len(df)
        
        # 1. Missing Values
        missing_count = int(df.isnull().sum().sum())
        
        # 2. Duplicates
        duplicate_count = int(df.duplicated().sum())
        
        # 3. Quality Score (Simple heuristic)
        # Penalize for missing cells and duplicate rows
        # Max score 1.0, Min score 0.0
        penalty = (missing_count / total_cells) + (duplicate_count / total_rows)
        quality_score = max(0.0, 1.0 - penalty)
        
        return {
            "quality_score": quality_score,
            "issues_detected": {
                "missingValues": missing_count,
                "duplicateRows": duplicate_count
            },
            "summary": f"Quality Score: {int(quality_score*100)}%. Found {missing_count} missing values and {duplicate_count} duplicates."
        }

    except Exception as e:
        print(f"Quality Analysis Error: {e}")
        return {
            "quality_score": 0.0,
            "issues_detected": {"error": str(e)},
            "summary": "Analysis failed"
        }

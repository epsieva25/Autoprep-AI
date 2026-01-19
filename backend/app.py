from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy.exc import SQLAlchemyError
from db import SessionLocal, engine, Base
from models import Project, Dataset, AnalysisResult, ProcessingHistory
from config import settings

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Create tables if missing
with engine.begin() as conn:
    Base.metadata.create_all(bind=conn)

def require_api_key():
    # If API_KEY is set, enforce it; otherwise allow open access
    if settings.API_KEY:
        key = request.headers.get("x-api-key")
        if key != settings.API_KEY:
            return jsonify({"error": "Unauthorized"}), 401
    return None

@app.errorhandler(404)
def not_found(_):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Server error", "detail": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True})

# ---- Projects ----
@app.route("/api/projects", methods=["GET", "POST"])
def projects():
    if (resp := require_api_key()) is not None:
        return resp
    db = SessionLocal()
    try:
        if request.method == "GET":
            items = db.query(Project).order_by(Project.created_at.desc()).all()
            return jsonify([{
                "id": p.id, "name": p.name, "description": p.description, "meta": p.meta,
                "created_at": p.created_at.isoformat()
            } for p in items])
        data = request.get_json() or {}
        proj = Project(name=data.get("name", "Untitled Project"),
                       description=data.get("description"),
                       meta=data.get("meta"))
        db.add(proj)
        db.commit()
        db.refresh(proj)
        return jsonify({"id": proj.id}), 201
    except SQLAlchemyError as e:
        db.rollback()
        return jsonify({"error": "DB error", "detail": str(e)}), 500
    finally:
        db.close()

@app.route("/api/projects/<pid>", methods=["GET", "PUT", "DELETE"])
def project_detail(pid: str):
    if (resp := require_api_key()) is not None:
        return resp
    db = SessionLocal()
    try:
        proj = db.query(Project).get(pid)
        if not proj:
            return jsonify({"error": "Project not found"}), 404
        if request.method == "GET":
            return jsonify({"id": proj.id, "name": proj.name, "description": proj.description, "meta": proj.meta})
        if request.method == "PUT":
            data = request.get_json() or {}
            proj.name = data.get("name", proj.name)
            proj.description = data.get("description", proj.description)
            proj.meta = data.get("meta", proj.meta)
            db.commit()
            return jsonify({"ok": True})
        db.delete(proj)
        db.commit()
        return jsonify({"ok": True})
    except SQLAlchemyError as e:
        db.rollback()
        return jsonify({"error": "DB error", "detail": str(e)}), 500
    finally:
        db.close()

# ---- Datasets ----
@app.route("/api/projects/<pid>/datasets", methods=["POST", "GET"])
def datasets(pid: str):
    if (resp := require_api_key()) is not None:
        return resp
    db = SessionLocal()
    try:
        if request.method == "GET":
            items = db.query(Dataset).filter(Dataset.project_id == pid).order_by(Dataset.created_at.desc()).all()
            return jsonify([{"id": d.id, "columns": d.columns, "rows": d.rows, "created_at": d.created_at.isoformat()} for d in items])
        data = request.get_json() or {}
        d = Dataset(project_id=pid, columns=data.get("columns"), rows=data.get("rows"))
        db.add(d)
        db.commit()
        db.refresh(d)

        # TRIGGER AUTOMATED ANALYSIS
        try:
            from ml import analyze_quality
            quality_metrics = analyze_quality(d.rows)
            
            # Save Analysis Result
            a = AnalysisResult(
                project_id=pid,
                summary=quality_metrics["summary"],
                details={
                    "quality_score": quality_metrics["quality_score"],
                    "issues_detected": quality_metrics["issues_detected"]
                }
            )
            db.add(a)
            db.commit()
        except Exception as e:
            print(f"Auto-analysis failed: {e}")
            # Don't fail the upload just because analysis failed
            
        return jsonify({"id": d.id}), 201
    except SQLAlchemyError as e:
        db.rollback()
        return jsonify({"error": "DB error", "detail": str(e)}), 500
    finally:
        db.close()

# ---- Analysis ----
@app.route("/api/projects/<pid>/analysis", methods=["POST", "GET"])
def analysis(pid: str):
    if (resp := require_api_key()) is not None:
        return resp
    db = SessionLocal()
    try:
        if request.method == "GET":
            items = db.query(AnalysisResult).filter(AnalysisResult.project_id == pid).order_by(AnalysisResult.created_at.desc()).all()
            return jsonify([{"id": a.id, "summary": a.summary, "details": a.details, "created_at": a.created_at.isoformat()} for a in items])
        data = request.get_json() or {}
        a = AnalysisResult(project_id=pid, summary=data.get("summary"), details=data.get("details"))
        db.add(a)
        db.commit()
        db.refresh(a)
        return jsonify({"id": a.id}), 201
    except SQLAlchemyError as e:
        db.rollback()
        return jsonify({"error": "DB error", "detail": str(e)}), 500
    finally:
        db.close()

# ---- Processing ----
@app.route("/api/projects/<pid>/processing", methods=["POST", "GET"])
def processing(pid: str):
    if (resp := require_api_key()) is not None:
        return resp
    db = SessionLocal()
    try:
        if request.method == "GET":
            items = db.query(ProcessingHistory).filter(ProcessingHistory.project_id == pid).order_by(ProcessingHistory.created_at.desc()).all()
            return jsonify([{"id": ph.id, "steps": ph.steps, "result_preview": ph.result_preview, "created_at": ph.created_at.isoformat()} for ph in items])
        data = request.get_json() or {}
        ph = ProcessingHistory(project_id=pid, steps=data.get("steps"), result_preview=data.get("result_preview"))
        db.add(ph)
        db.commit()
        db.refresh(ph)
        return jsonify({"id": ph.id}), 201
    except SQLAlchemyError as e:
        db.rollback()
        return jsonify({"error": "DB error", "detail": str(e)}), 500
@app.route("/api/projects/<pid>/analysis/audit", methods=["POST"])
def audit_project(pid: str):
    if (resp := require_api_key()) is not None:
        return resp
    db = SessionLocal()
    try:
        # 1. Fetch the latest dataset for this project
        dataset = db.query(Dataset).filter(Dataset.project_id == pid).order_by(Dataset.created_at.desc()).first()
        if not dataset or not dataset.rows:
            return jsonify({"error": "No data found for this project"}), 404

        # 2. Run AI Analysis
        from ml import detect_outliers
        outlier_indices = detect_outliers(dataset.rows)
        
        # 3. Save result as an analysis record
        summary = f"AI Audit found {len(outlier_indices)} anomalies."
        new_analysis = AnalysisResult(
            project_id=pid,
            summary=summary,
            details={"outlier_indices": outlier_indices}
        )
        db.add(new_analysis)
        db.commit()
        
        return jsonify({
            "audit_count": len(outlier_indices),
            "outlier_indices": outlier_indices,
            "summary": summary
        })

    except Exception as e:
        db.rollback()
        return jsonify({"error": "Analysis failed", "detail": str(e)}), 500
    finally:
        db.close()

@app.route("/api/projects/<pid>/pipeline/download", methods=["GET"])
def download_pipeline(pid: str):
    if (resp := require_api_key()) is not None:
        return resp
    db = SessionLocal()
    try:
        # Fetch latest processing history
        history = db.query(ProcessingHistory).filter(ProcessingHistory.project_id == pid).order_by(ProcessingHistory.created_at.desc()).first()
        
        # Basic template
        script_content = f"""import pandas as pd
import numpy as np

def process_data(input_file, output_file):
    # Load Data
    print(f"Loading {{input_file}}...")
    df = pd.read_csv(input_file)
    
    # Applied Transformations
"""

        if history and history.steps:
            # Dynamically add steps
            # This is a basic implementation mapping known steps to pandas code
            for step in history.steps: # steps is usually a list of strings or dicts
                # Assuming simple string descriptions for this MVP or a specific dict structure
                # You might need to adjust this matching logic based on how you store 'steps'
                if "missing" in str(step).lower():
                     script_content += f"    # {step}\n    df = df.fillna(0) # Placeholder logic for fillna\n"
                elif "duplicate" in str(step).lower():
                     script_content += f"    # {step}\n    df = df.drop_duplicates()\n"
                else:
                     script_content += f"    # {step}\n    # Generic placeholder for custom step\n"
        else:
            script_content += "    # No specific transformations recorded.\n"

        script_content += """
    # Save Report
    print(f"Saving processed data to {{output_file}}...")
    df.to_csv(output_file, index=False)
    print("Done!")

if __name__ == "__main__":
    process_data("input.csv", "cleaned_output.csv")
"""
        
        from flask import Response
        return Response(
            script_content,
            mimetype="text/x-python",
            headers={"Content-Disposition": "attachment;filename=pipeline.py"}
        )

    except Exception as e:
        return jsonify({"error": "Pipeline generation failed", "detail": str(e)}), 500
    finally:
        db.close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int( os.getenv("PORT", "8000") ), debug=settings.DEBUG)

# AutoPrep AI

AutoPrep AI is an intelligent data preparation and auditing tool designed to streamline the data cleaning process. It leverages machine learning to automatically detect anomalies, assess data quality, and generate reproducible data processing pipelines.

## Features

- **Project Management**: Organize data work into projects.
- **Data Upload & Inspection**: Upload CSV datasets and inspect rows/columns instantly.
- **AI-Powered Audit**: 
    - Uses **Isolation Forest** to detect statistical outliers and data anomalies.
    - Automatically calculates a quality score based on missing values and duplicates.
- **Automated Analysis**: Get instant insights into data's health upon upload.
- **Pipeline Generation**: Automatically generate a Python script (`pipeline.py`) that reproduces your data processing steps (cleaning, transformations) for reproducibility.

## Tech Stack

### Backend
- **Framework**: Flask (Python)
- **Database**: SQLite (via SQLAlchemy)
- **ML/Data**: Pandas, NumPy, Scikit-learn (Isolation Forest)
- **CORS**: Flask-CORS

### Frontend
- **Framework**: Next.js 14
- **Styling**: TailwindCSS, TailwindCSS Animate
- **UI Components**: Radix UI, Lucide React
- **Charts**: Recharts
- **Data Handling**: PapaParse, Zod, React Hook Form

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/epsieva25/Autoprep-AI.git
    cd Autoprep-AI
    ```

2.  **Backend Setup:**
    ```bash
    cd backend
    # Create a virtual environment (optional but recommended)
    python -m venv venv
    # On Windows
    venv\Scripts\activate
    # On macOS/Linux
    source venv/bin/activate
    
    # Install dependencies
    pip install -r requirements.txt
    ```

3.  **Frontend Setup:**
    ```bash
    cd ../frontend
    npm install
    ```

### Running the Application

1.  **Start the Backend:**
    ```bash
    cd backend
    python app.py
    ```
    The backend will run on `http://localhost:8000`.

2.  **Start the Frontend:**
    ```bash
    cd frontend
    npm run dev
    ```
    The frontend will run on `http://localhost:3000` (or similar).

## Usage

1.  Open the frontend in the browser.
2.  Create a new project.
3.  Upload a CSV dataset.
4.  View the automated "AI Audit" results to see anomalies and quality scores.
5.  Use the interface to clean or process data (if features available).
6.  Download the generated `pipeline.py` script to reproduce the steps locally.


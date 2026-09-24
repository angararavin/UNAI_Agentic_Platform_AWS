import os
from pathlib import Path
from dotenv import load_dotenv

# Base Directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)

# Resilient custom parser for both ':' and '=' in .env
if env_path.exists():
    with open(env_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
            elif ":" in line:
                k, v = line.split(":", 1)
            else:
                continue
            k = k.strip()
            v = v.strip().strip("'").strip('"')
            if k and v:
                os.environ[k] = v

# API Keys
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY") or os.getenv("tavily", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("Groq", "")
MARKETAUX_API_KEY = os.getenv("MARKETAUX_API_KEY") or os.getenv("marketaux", "")
# Gemini is used as a drop-in alternative to Groq for the recommendation SME
# call (both are OpenAI-compatible chat/completions endpoints) -- see
# recommendation_agent.py's provider selection.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("gemini", "")

DATA_DIR = BASE_DIR / "backend" / "data"


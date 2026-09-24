import os
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Ollama Local LLM Configuration
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434")
    OLLAMA_MODEL: str = Field(default="gemma4:latest")
    OLLAMA_FALLBACK_MODEL: str = Field(default="llama3.2:latest")
    OLLAMA_TIMEOUT: int = Field(default=120)

    # Environment & Logging
    APP_ENV: str = Field(default="development")
    LOG_LEVEL: str = Field(default="INFO")

    # Data Path
    DATA_ROOT: str = Field(default="./")

    # Server Ports
    FASTAPI_HOST: str = Field(default="0.0.0.0")
    FASTAPI_PORT: int = Field(default=8000)
    STREAMLIT_PORT: int = Field(default=8501)

    # Safety Gates
    ENABLE_AGENT_ACTIONS: bool = Field(default=True)
    ENABLE_WRITE_ACTIONS: bool = Field(default=False)

    # Performance & Reporting
    REPORTING_INTERVAL_HOURS: int = Field(default=24)
    REPORT_EXPORT_DIR: str = Field(default="./audit/reports")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql://ci:ci_dev@localhost:5432/companyintel"
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "company-intel-files"
    refusal_threshold: float = 0.55
    low_trust_threshold: float = 0.4
    retrieval_top_k_scoring: int = 12
    retrieval_top_k_studio: int = 8

settings = Settings()

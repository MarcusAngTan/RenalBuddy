from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "mysql+pymysql://renalbuddy:renalbuddy@127.0.0.1:3306/renalbuddy?charset=utf8mb4"
    jwt_secret: str
    jwt_hours: int = 12
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


def get_settings() -> Settings:
    return Settings()

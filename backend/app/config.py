from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    env: str = 'development'
    api_host: str = '127.0.0.1'
    api_port: int = 8000
    grantcompass_master_key: str
    allowed_origins: str = 'http://localhost:5173,http://127.0.0.1:5173'
    database_url: str = 'sqlite:///./grantcompass.db'
    # Live GitHub reads are opt-in; the mock provider is used otherwise.
    github_live_enabled: bool = False
    github_token: str = ''


settings = Settings()

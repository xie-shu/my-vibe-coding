"""应用配置管理"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置，从环境变量读取"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # 应用
    APP_NAME: str = "Yuan-Meet · 研发会议垂类 Agent"
    DEBUG: bool = True
    SERVER_PORT: int = 8787

    # SFU（mediasoup）服务地址，由 Step 1.3 启用
    SFU_BASE_URL: str = "http://localhost:4001"

    # 数据库
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/yuan_meet"
    DATABASE_ECHO: bool = False

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # LLM（OpenAI 兼容接口）
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-5.4-mini"
    VISION_MODEL: str = "gpt-5.4"
    EMBEDDING_ENABLED: bool = False
    EMBEDDING_MODEL: str = "text-embedding-v3"
    EMBEDDING_DIMENSIONS: int = 1024  # text-embedding-v3 维度

    # 文件上传
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 500 * 1024 * 1024  # 500MB

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]


settings = Settings()

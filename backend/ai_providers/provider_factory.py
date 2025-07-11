"""AI Provider Factory for creating text and vision providers."""

import os
from typing import Tuple
from .base import TextProvider, VisionProvider
from .openai_provider import OpenAITextProvider, OpenAIVisionProvider
from .anthropic_provider import AnthropicTextProvider, AnthropicVisionProvider
from .local_provider import LocalTextProvider, LocalVisionProvider


class ProviderFactory:
    """Factory for creating AI providers based on configuration."""

    @staticmethod
    def create_text_provider(
        provider_type: str = None, model_name: str = None
    ) -> TextProvider:
        """Create text provider based on configuration."""
        if provider_type is None:
            provider_type = os.environ.get("TEXT_PROVIDER", "openai").lower()
        if model_name is None:
            model_name = os.environ.get("TEXT_MODEL")

        if provider_type == "openai":
            return OpenAITextProvider(model_name)
        elif provider_type == "anthropic":
            return AnthropicTextProvider(model_name)
        elif provider_type == "local":
            return LocalTextProvider(model_name)
        else:
            raise ValueError(f"Unknown text provider: {provider_type}")

    @staticmethod
    def create_vision_provider(
        provider_type: str = None, model_name: str = None
    ) -> VisionProvider:
        """Create vision provider based on configuration."""
        if provider_type is None:
            provider_type = os.environ.get("VISION_PROVIDER", "openai").lower()
        if model_name is None:
            model_name = os.environ.get("VISION_MODEL")

        if provider_type == "openai":
            return OpenAIVisionProvider(model_name)
        elif provider_type == "anthropic":
            return AnthropicVisionProvider(model_name)
        elif provider_type == "local":
            return LocalVisionProvider(model_name)
        else:
            raise ValueError(f"Unknown vision provider: {provider_type}")

    @staticmethod
    def create_providers(
        text_provider: str = None,
        vision_provider: str = None,
        text_model: str = None,
        vision_model: str = None,
    ) -> Tuple[TextProvider, VisionProvider]:
        """Create both text and vision providers."""
        text_prov = ProviderFactory.create_text_provider(text_provider, text_model)
        vision_prov = ProviderFactory.create_vision_provider(
            vision_provider, vision_model
        )
        return text_prov, vision_prov

    @staticmethod
    def get_available_providers() -> dict:
        """Get list of available providers."""
        return {
            "text": ["openai", "anthropic", "local"],
            "vision": ["openai", "anthropic", "local"],
            "models": {
                "openai": {
                    "text": ["gpt-4o-mini", "gpt-4-turbo"],
                    "vision": ["gpt-4o-mini"],
                },
                "anthropic": {
                    "text": ["claude-3-sonnet-20240229"],
                    "vision": ["claude-3-sonnet-20240229"],
                },
                "local": {
                    "text": [
                        "Goekdeniz-Guelmez/Josiefied-Qwen3-30B-A3B-abliterated-v2"
                    ],
                    "vision": ["Qwen/Qwen-VL-Chat"],
                },
            },
        }

    @staticmethod
    def validate_provider_config() -> dict:
        """Validate provider configuration and API keys."""
        config = {
            "text_provider": os.environ.get("TEXT_PROVIDER", "openai"),
            "vision_provider": os.environ.get("VISION_PROVIDER", "openai"),
            "text_model": os.environ.get("TEXT_MODEL", "gpt-4o-mini"),
            "vision_model": os.environ.get("VISION_MODEL", "gpt-4o-mini"),
            "openai_available": bool(os.environ.get("OPENAI_API_KEY")),
            "anthropic_available": bool(os.environ.get("ANTHROPIC_API_KEY")),
            "local_available": True,  # Available when models are installed locally
        }

        # Validate current configuration
        text_provider = config["text_provider"]
        vision_provider = config["vision_provider"]

        if text_provider == "openai" and not config["openai_available"]:
            config["text_provider_valid"] = False
            config["text_provider_error"] = "OpenAI API key not configured"
        elif text_provider == "anthropic" and not config["anthropic_available"]:
            config["text_provider_valid"] = False
            config["text_provider_error"] = "Anthropic API key not configured"
        else:
            config["text_provider_valid"] = True
            config["text_provider_error"] = None

        if vision_provider == "openai" and not config["openai_available"]:
            config["vision_provider_valid"] = False
            config["vision_provider_error"] = "OpenAI API key not configured"
        elif vision_provider == "anthropic" and not config["anthropic_available"]:
            config["vision_provider_valid"] = False
            config["vision_provider_error"] = "Anthropic API key not configured"
        else:
            config["vision_provider_valid"] = True
            config["vision_provider_error"] = None

        return config

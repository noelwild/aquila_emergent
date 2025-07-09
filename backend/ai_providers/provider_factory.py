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
    def create_text_provider(provider_type: str = None) -> TextProvider:
        """Create text provider based on configuration."""
        if provider_type is None:
            provider_type = os.environ.get("TEXT_PROVIDER", "openai").lower()
        
        if provider_type == "openai":
            return OpenAITextProvider()
        elif provider_type == "anthropic":
            return AnthropicTextProvider()
        elif provider_type == "local":
            return LocalTextProvider()
        else:
            raise ValueError(f"Unknown text provider: {provider_type}")
    
    @staticmethod
    def create_vision_provider(provider_type: str = None) -> VisionProvider:
        """Create vision provider based on configuration."""
        if provider_type is None:
            provider_type = os.environ.get("VISION_PROVIDER", "openai").lower()
        
        if provider_type == "openai":
            return OpenAIVisionProvider()
        elif provider_type == "anthropic":
            return AnthropicVisionProvider()
        elif provider_type == "local":
            return LocalVisionProvider()
        else:
            raise ValueError(f"Unknown vision provider: {provider_type}")
    
    @staticmethod
    def create_providers(text_provider: str = None, vision_provider: str = None) -> Tuple[TextProvider, VisionProvider]:
        """Create both text and vision providers."""
        text_prov = ProviderFactory.create_text_provider(text_provider)
        vision_prov = ProviderFactory.create_vision_provider(vision_provider)
        return text_prov, vision_prov
    
    @staticmethod
    def get_available_providers() -> dict:
        """Get list of available providers."""
        return {
            "text": ["openai", "anthropic", "local"],
            "vision": ["openai", "anthropic", "local"]
        }
    
    @staticmethod
    def validate_provider_config() -> dict:
        """Validate provider configuration and API keys."""
        config = {
            "text_provider": os.environ.get("TEXT_PROVIDER", "openai"),
            "vision_provider": os.environ.get("VISION_PROVIDER", "openai"),
            "openai_available": bool(os.environ.get("OPENAI_API_KEY")),
            "anthropic_available": bool(os.environ.get("ANTHROPIC_API_KEY")),
            "local_available": True  # Always available (mock)
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
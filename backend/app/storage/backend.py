import os
from abc import ABC, abstractmethod
from pathlib import Path

from app.config import get_settings


class StorageBackend(ABC):
    @abstractmethod
    async def save(self, file_bytes: bytes, destination_rel_path: str) -> str:
        """Save file bytes to destination relative path, returning the stored relative path."""
        pass

    @abstractmethod
    def get_path(self, stored_path: str) -> Path:
        """Get absolute path on disk for the stored path."""
        pass

    @abstractmethod
    async def delete(self, stored_path: str) -> bool:
        """Delete stored file, returning True if deleted or False if didn't exist."""
        pass

    @abstractmethod
    def exists(self, stored_path: str) -> bool:
        """Check if stored path exists."""
        pass


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_dir: Path | str | None = None):
        if base_dir is None:
            settings = get_settings()
            # If relative, resolve relative to backend project root
            base_path = Path(settings.upload_dir)
            if not base_path.is_absolute():
                base_path = Path(__file__).resolve().parent.parent.parent / base_path
            self.base_dir = base_path.resolve()
        else:
            self.base_dir = Path(base_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_safe(self, rel_path: str) -> Path:
        clean_rel = os.path.normpath(rel_path).lstrip("/\\")
        target = (self.base_dir / clean_rel).resolve()
        try:
            target.relative_to(self.base_dir)
        except ValueError as err:
            raise ValueError(f"Path traversal detected: {rel_path}") from err
        return target

    async def save(self, file_bytes: bytes, destination_rel_path: str) -> str:
        target_path = self._resolve_safe(destination_rel_path)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(file_bytes)
        return str(target_path.relative_to(self.base_dir))

    def get_path(self, stored_path: str) -> Path:
        return self._resolve_safe(stored_path)

    async def delete(self, stored_path: str) -> bool:
        try:
            target_path = self._resolve_safe(stored_path)
            if target_path.is_file():
                target_path.unlink()
                # Clean up empty parent directory if empty
                try:
                    if target_path.parent != self.base_dir and not any(target_path.parent.iterdir()):
                        target_path.parent.rmdir()
                except OSError:
                    pass
                return True
            return False
        except (ValueError, FileNotFoundError):
            return False

    def exists(self, stored_path: str) -> bool:
        try:
            target_path = self._resolve_safe(stored_path)
            return target_path.is_file()
        except ValueError:
            return False


_storage_backend_instance: StorageBackend | None = None


def get_storage_backend() -> StorageBackend:
    global _storage_backend_instance
    if _storage_backend_instance is None:
        _storage_backend_instance = LocalStorageBackend()
    return _storage_backend_instance

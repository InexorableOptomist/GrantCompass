import base64
import hashlib
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.config import settings


class CryptoService:
    def __init__(self, master_key: str):
        # Derive 32-byte key for AES-256 from provided secret
        self._key = hashlib.sha256(master_key.encode('utf-8')).digest()

    def encrypt(self, plaintext: str) -> str:
        if plaintext is None:
            return ''
        aesgcm = AESGCM(self._key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
        payload = nonce + ciphertext
        return base64.b64encode(payload).decode('utf-8')

    def decrypt(self, token: str) -> str:
        if not token:
            return ''
        raw = base64.b64decode(token.encode('utf-8'))
        nonce, ciphertext = raw[:12], raw[12:]
        aesgcm = AESGCM(self._key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode('utf-8')


crypto_service = CryptoService(settings.grantcompass_master_key)

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ['GRANTCOMPASS_MASTER_KEY'] = 'test-key-not-for-production-1234567890'
os.environ['DATABASE_URL'] = 'sqlite:///./grantcompass-test.db'

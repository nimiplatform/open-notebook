"""
Pytest configuration file.

This file ensures that the project root is in the Python path,
allowing tests to import from the api and open_notebook modules.
"""

import os
import sys
from pathlib import Path

# Exercise the real process-token middleware with a deterministic test secret.
os.environ["OPEN_NOTEBOOK_HOST_TOKEN"] = "notebook-test-process"
os.environ["PYTHON_DOTENV_DISABLED"] = "1"
os.environ.pop("CORS_ORIGINS", None)

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

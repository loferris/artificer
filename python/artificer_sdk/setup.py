"""
Setup script for Artificer Python SDK
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read version
version_file = Path(__file__).parent / "artificer_sdk" / "version.py"
version = {}
with open(version_file) as f:
    exec(f.read(), version)

# Read README
readme_file = Path(__file__).parent / "README.md"
long_description = ""
if readme_file.exists():
    with open(readme_file, encoding="utf-8") as f:
        long_description = f.read()

setup(
    name="artificer-sdk",
    version=version["__version__"],
    author="Artificer Team",
    author_email="support@artificer.dev",
    description="Python SDK for Artificer gRPC services - document processing and conversion",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/loferris/artificer",
    project_urls={
        "Bug Tracker": "https://github.com/loferris/artificer/issues",
        "Documentation": "https://docs.artificer.dev",
        "Source Code": "https://github.com/loferris/artificer",
    },
    packages=find_packages(exclude=["tests", "tests.*"]),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Text Processing",
        "Topic :: Text Processing :: Markup",
        "Topic :: Text Processing :: Markup :: Markdown",
        "Topic :: Text Processing :: Markup :: HTML",
    ],
    python_requires=">=3.8",
    install_requires=[
        "grpcio>=1.60.0",
        "protobuf>=4.25.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "black>=23.0.0",
            "isort>=5.12.0",
            "mypy>=1.0.0",
            "grpcio-tools>=1.60.0",
        ],
    },
    keywords=[
        "artificer",
        "grpc",
        "document-processing",
        "markdown",
        "html",
        "pdf",
        "ocr",
        "text-processing",
        "portable-text",
        "notion",
        "roam",
    ],
    include_package_data=True,
    zip_safe=False,
)

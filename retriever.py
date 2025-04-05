import os
import json

from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.tools.retriever import create_retriever_tool
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor
from langchain_core.documents import Document
import chromadb

from PyPDF2 import PdfReader, PdfWriter

import bookmark

from dotenv import load_dotenv
from tqdm import tqdm

# Load .env file
env_path = os.path.join(os.path.dirname(__file__), ".env")
if not load_dotenv(env_path):
    raise Exception("Failed to load .env file") 
else:
    print(".env file loaded")

# Get OPENAI_API_KEY
api_key = os.environ["OPENAI_API_KEY"]
if not api_key:
    raise Exception("OPENAI_API_KEY not found in .env file")

os.environ["OPENAI_API_KEY"] = api_key

# Initialize a persistent Chroma vector database
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
persistent_client = chromadb.PersistentClient()
collection = persistent_client.create_collection(name="test_collection")

vector_store = chromadb.Chroma.collection(
    client=persistent_client,
    collection_name="test_collection",
    embedding_function=embeddings
)

# Initialize bookmarks
if not os.path.exists("../data/bookmarks.json"):
    bookmark.initialize_bookmarks("./data/PhysicsText.pdf", "./data/bookmarks.json")

# Create/load documents


import os
import json
from uuid import uuid4

from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.tools.retriever import create_retriever_tool
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor
from langchain_core.documents import Document
from langchain_chroma import Chroma
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
collection_name = "test_collection"
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
persistent_client = chromadb.PersistentClient()
collection = persistent_client.get_or_create_collection(name=collection_name)

vector_store = Chroma(
    client=persistent_client,
    collection_name=collection_name,
    embedding_function=embeddings
)
print("Chroma vector database initialized")

# Initialize bookmarks
textbook_path = "./data/PhysicsText.pdf"
bookmark_path = "./data/bookmarks.json"
if not os.path.exists(bookmark_path):
    bookmark.initialize_bookmarks(textbook_path, bookmark_path)
with open(bookmark_path, "r") as f:
    bookmarks = json.load(f)
print("Bookmarks loaded")

# Create/load documents
document_path = "./data/documents.json"
documents = []

if not os.path.exists(document_path):
    page_ranges = []
    for i in range(1, bookmarks["chapter_num"]+1):
        start_page = bookmarks[f"chapter {i}"]["page_num"]
        end_page = bookmarks[f"chapter {i}"]["last_page"]
        page_ranges.append((start_page, end_page))

    reader = PdfReader(textbook_path)

    for idx, (start_page, end_page) in enumerate(page_ranges):
        writer = PdfWriter()

        for page_num in range(start_page, end_page):
            writer.add_page(reader.pages[page_num])

        output_pdf = os.path.join("./data", f"chapter{idx+1}.pdf")

        with open(output_pdf, "wb") as f:
            writer.write(f)

    for i in tqdm(range(1, bookmarks["chapter_num"]+1), desc="Loading documents"):
        file_path = f"./data/chapter{i}.pdf"
        loader = PyPDFLoader(file_path)
        full_chapter = loader.load()

        for page_num, document in enumerate(full_chapter, start=1):
            documents.append(
                Document(
                    page_content=document.page_content, 
                    metadata={"chapter": f"Chapter {i}", "page": page_num}
                )
            )
    print("Documents loaded")

    with open(document_path, "w", encoding="utf-8") as f:
        json_docs = [
            {
                "page_content": doc.page_content,
                "metadata": doc.metadata
            }
            for doc in documents
        ]
        json.dump(json_docs, f, ensure_ascii=False, indent=4)
    print("Documents saved")

    for i in range(1, bookmarks["chapter_num"]+1):
        file_path = f"./data/chapter{i}.pdf"
        if os.path.exists(file_path):
            os.remove(file_path)
    print("Removed chapter PDFs")
else:
    with open(document_path, "r", encoding="utf-8") as f:
        json_docs = json.load(f)
        documents = [
            Document(page_content=doc["page_content"], metadata=doc["metadata"])
            for doc in json_docs
        ]
    

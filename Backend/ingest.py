import os
import time
# from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from uuid import uuid4
from langchain_ollama import OllamaEmbeddings

DOC_PATHS = "G:/Ollama/Test/Dataset"
MODEL_NAME = "llama3.2:latest"
EMBEDDING_MODEL = "mxbai-embed-large:latest"

chunk_size = 2000
chunk_overlap = 200
check_interval = 5

vector_store = Chroma(
    collection_name="document",
    embedding_function=OllamaEmbeddings(model=EMBEDDING_MODEL),
    persist_directory = "G:/Ollama/Test/db/chroma_langchain_db"
)


def ingest_files(fpath):
    print(f"Starting to ingest file: {fpath}")

    loader = PyPDFLoader(file_path=fpath)
    loaded_doc = loader.load()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap, separators=["\n", " ", ""])
    
    documents = text_splitter.split_documents(loaded_doc)
    uuids = [str(uuid4()) for _ in range(len(documents))]

    print(f"Adding {len(documents)} documents to the vector store")
    vector_store.add_documents(documents=documents, ids=uuids)


    print(f"Finished ingesting file: {fpath}")


def main_loop():
    while True:
        for filename in os.listdir(DOC_PATHS):
            if not filename.startswith("_"):
                filepath = os.path.join(DOC_PATHS, filename)
                ingest_files(filepath)
                new_filename = "_" + filename
                new_filepath = os.path.join(DOC_PATHS, new_filename)
                os.rename(filepath, new_filepath)
        time.sleep(check_interval)


if __name__ == "__main__":
    main_loop()
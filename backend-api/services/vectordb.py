import chromadb
from chromadb.config import Settings

# Initialize ChromaDB local client
client = chromadb.PersistentClient(path="./chroma_db")

# Create or get a collection for articles
collection = client.get_or_create_collection(
    name="articles",
    metadata={"hnsw:space": "cosine"} # Use cosine similarity
)

def add_article(article_id: str, text: str, metadata: dict):
    """Add an article to the vector database"""
    collection.add(
        documents=[text],
        metadatas=[metadata],
        ids=[article_id]
    )
    
def search_similar(query_text: str, n_results: int = 3):
    """Search for similar articles"""
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results
    )
    return results

def get_all_articles():
    """Get all stored articles history"""
    results = collection.get(
        include=["metadatas", "documents"]
    )
    return results

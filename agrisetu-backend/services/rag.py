"""RAG Service — embed documents, store in pgvector, retrieve relevant chunks."""
import os
import logging
from typing import List, Optional

from config import settings
from constants import RAG_EMBEDDING_MODEL, RAG_EMBEDDING_DIM, RAG_TOP_K

logger = logging.getLogger("agrisetu.rag")

_model = None


def _get_model():
    """Load sentence-transformers model (lazy, cached)."""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading RAG embedding model: {RAG_EMBEDDING_MODEL}")
            _model = SentenceTransformer(RAG_EMBEDDING_MODEL)
        except Exception as e:
            logger.warning(f"sentence-transformers unavailable: {e}")
            return None
    return _model


def embed_and_store_documents(kb_dir: str = "data/agronomy_kb"):
    """Read all .txt files from knowledge base directory, embed, and store in Supabase."""
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    model = _get_model()
    if not model:
        logger.warning("Embedding model unavailable")
        return

    # Clear existing knowledge base
    supabase.table("knowledge_base").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    documents = []
    for fname in sorted(os.listdir(kb_dir)):
        if fname.endswith(".txt"):
            filepath = os.path.join(kb_dir, fname)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read().strip()
            documents.append({"filename": fname, "content": content})

    if not documents:
        logger.warning(f"No documents found in {kb_dir}")
        return

    logger.info(f"Embedding {len(documents)} documents")

    # Batch embed
    texts = [doc["content"] for doc in documents]
    embeddings = model.encode(texts, show_progress_bar=True)

    # Store in pgvector
    for doc, emb in zip(documents, embeddings):
        embedding_list = emb.tolist()
        supabase.table("knowledge_base").insert({
            "content": doc["content"],
            "embedding": str(embedding_list),
            "metadata": {"filename": doc["filename"]},
        }).execute()

    logger.info(f"Stored {len(documents)} documents in knowledge base")


def retrieve_relevant_chunks(query: str, top_k: int = RAG_TOP_K) -> List[str]:
    """Retrieve top-k relevant chunks from knowledge base via vector search or file search."""
    try:
        model = _get_model()
        if model is not None:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
            query_embedding = model.encode([query])[0].tolist()
            result = supabase.rpc("match_knowledge_base", {
                "query_embedding": str(query_embedding),
                "match_count": top_k,
            }).execute()

            if result.data:
                return [row["content"] for row in result.data]
    except Exception as e:
        logger.warning(f"Vector search failed, falling back to text search: {e}")

    # Fallback 2: Direct file search in data/agronomy_kb
    try:
        possible_dirs = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "agronomy_kb"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "agronomy_kb"),
            "data/agronomy_kb",
        ]
        kb_dir = next((d for d in possible_dirs if os.path.exists(d)), None)
        if kb_dir:
            matched = []
            keywords = [w.lower() for w in query.split() if len(w) > 2]
            for fname in os.listdir(kb_dir):
                if fname.endswith(".txt"):
                    fpath = os.path.join(kb_dir, fname)
                    with open(fpath, "r", encoding="utf-8") as f:
                        text = f.read()
                        if any(kw in text.lower() for kw in keywords) or not keywords:
                            matched.append(text[:1000])
            if matched:
                return matched[:top_k]
    except Exception as e:
        logger.error(f"File KB fallback failed: {e}")

    return []
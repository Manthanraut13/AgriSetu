"""RAG Service — embed documents, store in pgvector, retrieve relevant chunks."""
import os
import logging
from typing import List, Optional
from sentence_transformers import SentenceTransformer

from config import settings
from constants import RAG_EMBEDDING_MODEL, RAG_EMBEDDING_DIM, RAG_TOP_K

logger = logging.getLogger("agrisetu.rag")

_model: Optional[SentenceTransformer] = None


def _get_model() -> SentenceTransformer:
    """Load sentence-transformers model (lazy, cached)."""
    global _model
    if _model is None:
        logger.info(f"Loading RAG embedding model: {RAG_EMBEDDING_MODEL}")
        _model = SentenceTransformer(RAG_EMBEDDING_MODEL)
    return _model


def embed_and_store_documents(kb_dir: str = "data/agronomy_kb"):
    """Read all .txt files from knowledge base directory, embed, and store in Supabase."""
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    model = _get_model()

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
    """Retrieve top-k relevant chunks from knowledge base via cosine similarity."""
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    model = _get_model()

    # Embed query
    query_embedding = model.encode([query])[0].tolist()

    # Use Supabase RPC for vector similarity search
    # We'll use a direct SQL query since Supabase Python client has limited pgvector support
    try:
        result = supabase.rpc("match_knowledge_base", {
            "query_embedding": str(query_embedding),
            "match_count": top_k,
        }).execute()

        if result.data:
            return [row["content"] for row in result.data]
    except Exception as e:
        logger.warning(f"RPC search failed, falling back to manual search: {e}")

    # Fallback: fetch all and compute similarity in Python
    try:
        all_docs = supabase.table("knowledge_base").select("content, embedding").execute()
        if not all_docs.data:
            return []

        import numpy as np
        query_emb = np.array(query_embedding)

        scored = []
        for doc in all_docs.data:
            try:
                doc_emb = np.array(eval(doc["embedding"]))
                similarity = float(np.dot(query_emb, doc_emb) / (
                    np.linalg.norm(query_emb) * np.linalg.norm(doc_emb) + 1e-8
                ))
                scored.append((similarity, doc["content"]))
            except Exception:
                continue

        scored.sort(key=lambda x: x[0], reverse=True)
        return [content for _, content in scored[:top_k]]

    except Exception as e:
        logger.error(f"Knowledge base search failed: {e}")

    # Fallback 2: Direct file search in data/agronomy_kb
    try:
        kb_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "agronomy_kb")
        if os.path.exists(kb_dir):
            matched = []
            keywords = [w.lower() for w in query.split() if len(w) > 3]
            for fname in os.listdir(kb_dir):
                if fname.endswith(".txt"):
                    fpath = os.path.join(kb_dir, fname)
                    with open(fpath, "r", encoding="utf-8") as f:
                        text = f.read()
                        if any(kw in text.lower() for kw in keywords):
                            matched.append(text[:1000])
            if matched:
                return matched[:top_k]
    except Exception as e:
        logger.error(f"File KB fallback failed: {e}")

    return []
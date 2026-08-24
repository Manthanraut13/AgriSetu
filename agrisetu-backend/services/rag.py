"""RAG Service — embed documents, store in pgvector, retrieve relevant chunks."""
import os
import logging
from typing import List, Optional

from config import settings
from constants import RAG_EMBEDDING_MODEL, RAG_EMBEDDING_DIM, RAG_TOP_K

logger = logging.getLogger("agrisetu.rag")

_model = None


def _get_kb_directory() -> Optional[str]:
    """Find the existing agronomy_kb directory across root and backend locations."""
    possible_dirs = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "agronomy_kb"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "agronomy_kb"),
        "../data/agronomy_kb",
        "data/agronomy_kb",
    ]
    for d in possible_dirs:
        if os.path.exists(d) and os.path.isdir(d):
            return d
    return None


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


def embed_and_store_documents(kb_dir: Optional[str] = None):
    """Read all .txt files from knowledge base directory, embed, and store in Supabase."""
    from supabase import create_client

    if not kb_dir:
        kb_dir = _get_kb_directory()
    if not kb_dir or not os.path.exists(kb_dir):
        logger.warning(f"Knowledge base directory not found: {kb_dir}")
        return

    try:
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        model = _get_model()
        if not model:
            logger.warning("Embedding model unavailable")
            return

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

        logger.info(f"Embedding {len(documents)} documents from {kb_dir}")
        texts = [doc["content"] for doc in documents]
        embeddings = model.encode(texts, show_progress_bar=False)

        # Clear existing knowledge base
        supabase.table("knowledge_base").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

        # Store in pgvector
        for doc, emb in zip(documents, embeddings):
            embedding_list = emb.tolist()
            supabase.table("knowledge_base").insert({
                "content": doc["content"],
                "embedding": str(embedding_list),
                "metadata": {"filename": doc["filename"]},
            }).execute()

        logger.info(f"Successfully stored {len(documents)} documents in knowledge base")
    except Exception as e:
        logger.warning(f"Failed to embed and store documents in Supabase: {e}")


def retrieve_relevant_chunks(query: str, top_k: int = RAG_TOP_K) -> List[str]:
    """Retrieve top-k relevant chunks from knowledge base via vector search or file search."""
    if not query or not query.strip():
        return []

    # 1. Try Vector Search via Supabase pgvector
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

            if result.data and len(result.data) > 0:
                chunks = [row["content"] for row in result.data if row.get("content")]
                if chunks:
                    logger.info(f"RAG vector search retrieved {len(chunks)} chunks for query: '{query[:40]}...'")
                    return chunks
    except Exception as e:
        logger.debug(f"Vector search RPC unavailable: {e}")

    # 2. File Search Fallback in agronomy_kb
    try:
        kb_dir = _get_kb_directory()
        if kb_dir:
            matched_docs = []
            stop_words = {"the", "a", "an", "in", "on", "for", "and", "or", "of", "to", "is", "how", "what", "when", "which", "should", "much", "many", "do", "does", "i", "my"}
            keywords = [w.lower() for w in query.split() if len(w) > 2 and w.lower() not in stop_words]

            for fname in sorted(os.listdir(kb_dir)):
                if fname.endswith(".txt"):
                    fpath = os.path.join(kb_dir, fname)
                    with open(fpath, "r", encoding="utf-8") as f:
                        content = f.read()
                        c_lower = content.lower()
                        # Score document based on keyword matches
                        score = sum(1 for kw in keywords if kw in c_lower)
                        if score > 0 or not keywords:
                            matched_docs.append((score, content))

            if matched_docs:
                matched_docs.sort(key=lambda x: x[0], reverse=True)
                chunks = [doc[1] for doc in matched_docs[:top_k]]
                logger.info(f"RAG file search retrieved {len(chunks)} KB chunks for query: '{query[:40]}...'")
                return chunks

            # Default agronomy fallback chunks if query is broad
            default_files = ["18_fertilizer_management.txt", "01_wheat_irrigation.txt", "20_soil_testing.txt"]
            default_chunks = []
            for df in default_files:
                df_path = os.path.join(kb_dir, df)
                if os.path.exists(df_path):
                    with open(df_path, "r", encoding="utf-8") as f:
                        default_chunks.append(f.read())
            if default_chunks:
                return default_chunks[:top_k]
    except Exception as e:
        logger.error(f"File KB fallback failed: {e}")

    return []
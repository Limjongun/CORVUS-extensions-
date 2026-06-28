from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
import hashlib

from services.llm import generate_summary
from services.vectordb import add_article

app = FastAPI(
    title="CORVUS AI Reading Workspace API",
    description="Backend API for CORVUS Chrome Extension",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ArticlePayload(BaseModel):
    url: str
    title: str
    content: str
    tone: str = "Standard"
    length: str = "30 sec"
    language: str = "Indonesian"

class ChatMessagePayload(BaseModel):
    role: str
    text: str

class ChatPayload(BaseModel):
    messages: list[ChatMessagePayload]
    tone: str = "Standard"
    language: str = "Indonesian"

@app.get("/")
def read_root():
    return {"message": "Welcome to CORVUS API"}

@app.post("/api/article/process")
async def process_article(payload: ArticlePayload):
    # 1. Generate unique ID for article based on URL
    article_id = hashlib.md5(payload.url.encode()).hexdigest()
    
    # 2. Store in Vector DB
    add_article(
        article_id=article_id,
        text=payload.content[:10000], 
        metadata={"url": payload.url, "title": payload.title}
    )
    
    # 3. Generate Summary using LLM
    from services.llm import generate_summary
    result = generate_summary(payload.content[:5000], tone=payload.tone, length=payload.length, language=payload.language)
    
    if "error" in result:
        return {
            "status": "error",
            "article_id": article_id,
            "message": result["error"]
        }
        
    return {
        "status": "success",
        "article_id": article_id,
        "summary": result.get("summary", ""),
        "keywords": result.get("keywords", []),
        "key_points": result.get("key_points", [])
    }

@app.post("/api/chat")
async def process_chat(payload: ChatPayload):
    from services.llm import generate_chat_response
    messages_dict = [{"role": msg.role, "text": msg.text} for msg in payload.messages]
    response = generate_chat_response(messages_dict, tone=payload.tone, language=payload.language)
    
    if response.startswith("Error") or response.startswith("Warning"):
        return {"status": "error", "message": response}
        
    return {"status": "success", "response": response}

@app.post("/api/flashcards")
async def process_flashcards(payload: ArticlePayload):
    from services.llm import generate_flashcards
    result = generate_flashcards(payload.content[:5000], language=payload.language)
    
    if "error" in result:
        return {"status": "error", "message": result["error"]}
        
    return {
        "status": "success",
        "flashcards": result.get("flashcards", [])
    }

@app.post("/api/mindmap")
async def process_mindmap(payload: ArticlePayload):
    from services.llm import generate_mindmap
    result = generate_mindmap(payload.content[:5000], language=payload.language)
    
    if result.startswith("mindmap\n  Error") or result.startswith("Warning"):
        return {"status": "error", "message": result}
        
    return {
        "status": "success",
        "mindmap": result
    }

@app.post("/api/flashcards/evaluate")
async def evaluate_flashcard(payload: dict):
    from services.llm import evaluate_flashcard_answer
    question = payload.get("question")
    true_answer = payload.get("true_answer")
    user_answer = payload.get("user_answer")
    language = payload.get("language", "Indonesian")
    
    result = evaluate_flashcard_answer(question, true_answer, user_answer, language)
    
    if "error" in result:
        return {"status": "error", "message": result["error"]}
        
    return {
        "status": "success",
        "evaluation": result
    }

@app.get("/api/history")
async def get_history():
    from services.vectordb import get_all_articles
    try:
        results = get_all_articles()
        history = []
        for i in range(len(results["ids"])):
            history.append({
                "id": results["ids"][i],
                "metadata": results["metadatas"][i],
                "snippet": results["documents"][i][:200] + "..." if results["documents"][i] else ""
            })
        return {"status": "success", "history": history}
    except Exception as e:
        return {"status": "error", "message": str(e)}

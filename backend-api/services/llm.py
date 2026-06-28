import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Initialize OpenAI client with GitHub Models endpoint
client = OpenAI(
    base_url=os.getenv("OPENAI_API_BASE", "https://models.inference.ai.azure.com"),
    api_key=os.getenv("GITHUB_TOKEN")
)
model_name = os.getenv("OPENAI_MODEL_NAME", "gpt-4o")

def generate_summary(text: str, tone: str = "Standard", length: str = "30 sec", language: str = "Indonesian") -> dict:
    """Generate a summary, keywords, and key points of the provided text using GitHub Models"""
    if not os.getenv("GITHUB_TOKEN") or os.getenv("GITHUB_TOKEN") == "your_github_token_here":
        return {"error": "Warning: GITHUB_TOKEN is not set. Please configure .env file."}
        
    length_instruction = ""
    if length == "30 sec":
        length_instruction = "Make the summary extremely brief (1-2 sentences max)."
    elif length == "1 min":
        length_instruction = "Make the summary a medium-sized paragraph."
    elif length == "Detailed":
        length_instruction = "Make the summary very detailed, comprehensive, and potentially span multiple paragraphs."
        
    system_prompt = f"""
    You are CORVUS, an AI reading assistant. Your task is to analyze the provided article text and extract the following:
    1. A summary ({length_instruction}).
    2. A list of 3-5 important keywords.
    3. A list of 3-5 key points or main ideas from the text.
    
    IMPORTANT: 
    - Adapt your writing style to be: {tone}.
    - You MUST write your response entirely in: {language}.
    
    You MUST return the output strictly in the following JSON format:
    {{
        "summary": "...",
        "keywords": ["...", "..."],
        "key_points": ["...", "..."]
    }}
    """
    
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            model=model_name,
            temperature=0.3,
            max_tokens=1500,
            response_format={ "type": "json_object" }
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        return {"error": f"Error generating summary: {str(e)}"}

def generate_chat_response(messages: list, tone: str = "Standard", language: str = "Indonesian") -> str:
    """Generate a free chat response based on conversation history"""
    if not os.getenv("GITHUB_TOKEN") or os.getenv("GITHUB_TOKEN") == "your_github_token_here":
        return "Warning: GITHUB_TOKEN is not set. Please configure .env file."
        
    system_prompt = f"You are CORVUS, a helpful AI reading assistant. Your tone of voice should be: {tone}. IMPORTANT: You MUST write your response entirely in: {language}."
    
    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        # map frontend roles to openai roles if needed
        # Assuming frontend sends: { role: "user" | "ai", text: "..." }
        role = "assistant" if msg["role"] == "ai" else "user"
        formatted_messages.append({"role": role, "content": msg["text"]})
        
    try:
        response = client.chat.completions.create(
            messages=formatted_messages,
            model=model_name,
            temperature=0.7,
            max_tokens=1500
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating chat response: {str(e)}"

def generate_flashcards(text: str, language: str = "Indonesian") -> dict:
    if not os.getenv("GITHUB_TOKEN") or os.getenv("GITHUB_TOKEN") == "your_github_token_here":
        return {"error": "Warning: GITHUB_TOKEN is not set. Please configure .env file."}
        
    system_prompt = f"""
    You are CORVUS, an AI reading assistant. Your task is to extract 5 to 10 important concepts from the provided text and turn them into Flashcards (Question & Answer pairs).
    
    IMPORTANT: You MUST write your response entirely in: {language}.
    
    You MUST return the output strictly in the following JSON format:
    {{
        "flashcards": [
            {{"question": "...", "answer": "..."}},
            {{"question": "...", "answer": "..."}}
        ]
    }}
    """
    
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            model=model_name,
            temperature=0.3,
            max_tokens=1500,
            response_format={ "type": "json_object" }
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        return {"error": f"Error generating flashcards: {str(e)}"}

def generate_mindmap(text: str, language: str = "Indonesian") -> str:
    if not os.getenv("GITHUB_TOKEN") or os.getenv("GITHUB_TOKEN") == "your_github_token_here":
        return "Warning: GITHUB_TOKEN is not set. Please configure .env file."
        
    system_prompt = f"""
    You are CORVUS, an AI reading assistant. Your task is to extract the main concepts and their relationships from the provided text and represent them as a Mermaid.js Mindmap.
    
    IMPORTANT: 
    - You MUST write the node labels entirely in: {language}.
    - Do NOT wrap the output in markdown code blocks (e.g. ```mermaid ... ```). Just output the raw mermaid syntax.
    - Start the syntax with 'mindmap' and use standard indentation.
    
    Example output format:
    mindmap
      root((Central Topic))
        Topic 1
          Subtopic A
          Subtopic B
        Topic 2
          Subtopic C
    """
    
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            model=model_name,
            temperature=0.3,
            max_tokens=1500
        )
        content = response.choices[0].message.content
        # clean up if model added markdown ticks
        content = content.replace("```mermaid", "").replace("```", "").strip()
        return content
    except Exception as e:
        return f"mindmap\n  Error\n    {str(e)}"

def evaluate_flashcard_answer(question: str, true_answer: str, user_answer: str, language: str = "Indonesian") -> dict:
    if not os.getenv("GITHUB_TOKEN") or os.getenv("GITHUB_TOKEN") == "your_github_token_here":
        return {"error": "Warning: GITHUB_TOKEN is not set."}
        
    system_prompt = f"""
    You are CORVUS, an encouraging AI tutor.
    The user is studying a flashcard.
    Question: {question}
    True Answer: {true_answer}
    
    The user answered: {user_answer}
    
    Evaluate the user's answer. 
    1. Is it conceptually correct or close enough?
    2. Provide an explanation comparing their answer to the true answer.
    3. Give them praise or motivation based on their effort!
    
    IMPORTANT: You MUST write your response entirely in: {language}.
    
    Return ONLY a valid JSON object in this format:
    {{
        "is_correct": true/false,
        "feedback": "Your detailed feedback, explanation, and motivation here."
    }}
    """
    
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt}
            ],
            model=model_name,
            temperature=0.4,
            response_format={ "type": "json_object" }
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        return {"error": f"Error evaluating answer: {str(e)}"}

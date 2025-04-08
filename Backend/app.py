import os
from flask import Flask, request, jsonify
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder # Import MessagesPlaceholder
from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain
from langchain.chains.history_aware_retriever import create_history_aware_retriever # Import history aware retriever

# --- Configuration ---
MODEL_NAME = "llama3.2:latest"
EMBEDDING_MODEL = "mxbai-embed-large:latest"
DB_PERSIST_DIRECTORY = "../db/chroma_langchain_db" # Use a variable

# --- Initialize LLM and Embeddings ---
llm = ChatOllama(model=MODEL_NAME, temperature=0.7) # Slightly lower temp might be better with history
embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)

# --- Initialize Vector Store ---
# Ensure the directory exists or handle potential errors during Chroma init if needed
if not os.path.exists(DB_PERSIST_DIRECTORY):
    print(f"Warning: Persist directory '{DB_PERSIST_DIRECTORY}' not found. Chroma will create it or fail if permissions are wrong.")
    # Optionally create it: os.makedirs(DB_PERSIST_DIRECTORY, exist_ok=True)

vector_store = Chroma(
    collection_name="document",
    embedding_function=embeddings,
    persist_directory=DB_PERSIST_DIRECTORY
)
retriever = vector_store.as_retriever(search_kwargs={"k": 5}) # Reduce K slightly? Test performance

history_aware_retriever_prompt = ChatPromptTemplate.from_messages([
    MessagesPlaceholder(variable_name="chat_history"), # Where the history messages will be inserted
    ("user", "{input}"),
    ("user", "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation")
])

history_aware_retriever_chain = create_history_aware_retriever(
    llm, retriever, history_aware_retriever_prompt
)

answer_generation_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are Jarvis. A friendly, empathetic, and succinct assistant specializing in mental health. Always provide a single, unified answer that fully addresses the query using the provided context if available. If the context is relevant, use it; if not, apply your common sense based on your mental health expertise. Do not generate separate parts or multiple answers, if the question is not related to mental health at all or gibberish, simply respond with: I'm sorry I can't answer on that topic. Context: \n\n{context}" # Context is inserted here
    ),
    MessagesPlaceholder(variable_name="chat_history"), # Include history for the final LLM call as well
    ("user", "{input}"), # The original user input
])

# --- Create the Document Chain ---
# This chain combines the retrieved documents into the final answer prompt
document_chain = create_stuff_documents_chain(
    llm=llm,
    prompt=answer_generation_prompt # Use the prompt defined above
)

conversational_retrieval_chain = create_retrieval_chain(
    history_aware_retriever_chain, # Use the history-aware retriever
    document_chain
)

# --- In-Memory Store for Chat Histories ---
# Store history objects keyed by session_id
# WARNING: This is lost if the Flask app restarts! For persistence, use Redis, a DB, etc.
chat_histories = {}

# --- Flask App ---
app = Flask(__name__)

def get_session_history(session_id: str) -> InMemoryChatMessageHistory:
    """Retrieves or creates a chat history for a given session ID."""
    if session_id not in chat_histories:
        print(f"Creating new history for session: {session_id}")
        chat_histories[session_id] = InMemoryChatMessageHistory()
    return chat_histories[session_id]

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    query = data.get("query")
    session_id = data.get("session_id") # Expect session_id from frontend

    if not query:
        return jsonify({"error": "No query provided."}), 400
    if not session_id:
        # Option 1: Return error (simplest)
        return jsonify({"error": "No session_id provided."}), 400
        # Option 2: Generate a session ID and return it (more complex frontend handling)
        # import uuid
        # session_id = str(uuid.uuid4())
        # return jsonify({"error": "No session_id provided, generated one.", "session_id": session_id}), 400

    print(f"\n--- Request ---")
    print(f"Session ID: {session_id}")
    print(f"Query: {query}")

    try:
        # 1. Get the chat history for this session
        session_history = get_session_history(session_id)
        print(f"History (before): {session_history.messages}")

        # 2. Invoke the conversational retrieval chain
        # It needs the original input and the history messages
        result = conversational_retrieval_chain.invoke({
            "input": query,
            "chat_history": session_history.messages # Pass the actual messages
        })

        # 3. Add the current interaction to the history *after* getting the response
        session_history.add_user_message(query)
        session_history.add_ai_message(result['answer'])

        print(f"Context Docs: {len(result.get('context', []))}")
        print(f"Answer: {result['answer']}")
        print(f"History (after): {session_history.messages}")
        print(f"--- End Request ---")

        # 4. Return the answer
        return jsonify({"answer": result['answer']})

    except Exception as e:
        print(f"Error processing chat for session {session_id}: {e}")
        # import traceback
        # traceback.print_exc() # Print detailed traceback for debugging
        return jsonify({"error": "An error occurred while processing your request."}), 500

if __name__ == '__main__':
    # Use host='0.0.0.0' to make it accessible on your network if needed
    # debug=True is helpful during development but disable for production
    app.run(host='0.0.0.0', port=5000, debug=True)
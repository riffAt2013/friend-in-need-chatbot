## "A Friend in Need", 

### A chatbot demonstrating Retrieval-Augmented Generation (RAG) using Ollama, Langchain, python in the Backend, Next.JS in the frontend.  

This is the code for the final project ENGI981B taken under the supervision of Dr. Weimin Huang for the Winter 2024-2025 Semester at Memorial University of Newfoundland.

Made by:
- Rifat Bin Masud (#202387267)
- Sayed Fazli Rabby (#202386191)

  Backend Code are seperated in the backend folder. Usual Next.JS based frontend project starter.
  To run:
  1. git clone the project.
  2. do ``` npm install ```
  3. go to backend directory and run ``` pip install -r requirements.txt ```
  4. make sure Ollama is installed and running in the background.
  5. This code is tested with Llama 3.2 (3Billion) as its LLM and mxbai-embed large for the embeddings
  6. run the ingest.py file with source data in the Dataset folder. this feeds the vector database with the contextual documents
  7. then run the app.py for the backend flask server.
  8. finally in the frontend directory run the Next.JS with ``` npm run dev ```
  9. The chatbot should be accessible at https://localhost:3000 

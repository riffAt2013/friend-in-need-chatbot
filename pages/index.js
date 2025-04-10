import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/Chat.module.css'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import CircularProgress from '@mui/material/CircularProgress';
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator

export default function Home() {
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! How can I help you today?" }
  ]);
  const [showModal, setShowModal] = useState(true);
  const [isChatStarted, setIsChatStarted] = useState(false);
  const [theme, setTheme] = useState('dark');
  // --- Session ID State ---
  const [sessionId, setSessionId] = useState(null);

  const messageListRef = useRef(null);
  const textAreaRef = useRef(null);

  // --- Session ID Generation ---
  // Generate a unique session ID when the component mounts
  useEffect(() => {
    setSessionId(uuidv4());
    console.log("Generated Session ID:", sessionId); // For debugging
  }, []); 

  // --- Theme Effects ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const initialTheme = savedTheme || (prefersLight ? 'light' : 'dark');
    setTheme(initialTheme);
    // Apply theme class immediately
     if (initialTheme === 'light') {
       document.body.classList.add('light-theme');
     } else {
       document.body.classList.remove('light-theme');
     }
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);


  // Auto-scroll chat
  useEffect(() => {
    if (messageListRef.current) {
      const behavior = messages.length > 2 ? "smooth" : "auto";
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: behavior
      });
    }
  }, [messages]);

  // Focus textarea
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [isChatStarted]);

  // Handle errors shown to user
  const handleError = (errorMsg = "Oops! There seems to be an error. Please try again.") => {
    setMessages(prev => [
      ...prev,
      { role: "assistant", content: errorMsg }
    ]);
    setLoading(false);
    // Keep userInput in case of error? -> Depends on desired UX
    // setUserInput(currentQuery); // <-- Uncomment if you want user input kept on error
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedInput = userInput.trim();
    if (!trimmedInput || loading) return;

    // --- Check if Session ID is ready ---
    if (!sessionId) {
      console.error("Session ID not generated yet. Cannot send message.");
      // Show error to user
      handleError("Chat session isn't ready yet. Please wait a moment or refresh the page.");
      return; // Stop the submission
    }
    // --- End Session ID Check ---

    if (!isChatStarted) {
      setIsChatStarted(true);
    }

    setLoading(true);
    const userMessage = { role: "user", content: trimmedInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    const currentQuery = trimmedInput; // Use trimmed input
    setUserInput(""); // Clear input immediately

    try {
      console.log(`Sending to /api/chat with session ID: ${sessionId}`); // Debug log
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // --- Include session_id in the request body ---
        body: JSON.stringify({ query: currentQuery, session_id: sessionId }),
      });

      // Improved response handling
      if (!response.ok) {
        let errorMsgFromServer = `Error: ${response.statusText} (Status: ${response.status})`;
        try {
          // Attempt to read detailed error from API route/Flask backend
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMsgFromServer = `Error: ${errorData.error}`;
          }
        } catch (jsonError) {
          console.warn("Could not parse error response body as JSON.");
        }
        handleError(errorMsgFromServer);
        setUserInput(currentQuery); // Keep input on backend/API error
        return; // Stop further processing
      }

      const data = await response.json();

      // Check if the response from API route has the 'answer'
      if (!data || typeof data.answer === 'undefined') {
         console.error("API Response missing 'answer':", data);
         handleError("Received an invalid response from the server.");
      } else if (data.answer === null || data.answer === "") {
          handleError("Received an empty response. Please try again or rephrase your question.");
      }
      else {
        setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
      }

    } catch (error) {
      console.error("Fetch Error:", error);
      // Network error or API route itself failed fundamentally
      handleError("Oops! Could not connect to the server. Please check your connection and try again.");
      setUserInput(currentQuery); // Keep input on network error
    } finally {
        setLoading(false);
        // Re-focus after response/error, only if not still loading
        if (textAreaRef.current && !loading) {
          textAreaRef.current.focus();
        }
    }
  };

  // Handle Enter key
  const handleEnter = (e) => {
    if (e.key === "Enter" && !e.shiftKey && userInput.trim()) {
        e.preventDefault();
        handleSubmit(e);
    }
  };

  // --- Theme Toggle Function ---
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <>
      <Head>
        <title>Your friend in Need</title>
        <meta name="description" content="Chat with your knowledge base powered by an Ollama-based RAG system" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={`${styles.pageContainer}`}>
          <div className={styles.topnav}>
            <div className={styles.navlogo}>
              <a href="/">Your friend in Need</a>
            </div>
            <div className={styles.navlinks}>
              {/* --- Theme Toggle Button --- */}
              <button onClick={toggleTheme} className={styles.themeToggleButton} title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}>
                 {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <a href="/about" target="_blank">About</a>
              <button className={styles.helpButton} onClick={() => setShowModal(true)}>Help</button>
            </div>
          </div>

          <main className={`${styles.main} ${isChatStarted ? styles.mainActive : styles.mainInitial}`}>
            <div className={`${styles.cloud} ${isChatStarted ? styles.cloudActive : styles.cloudInitial}`}>
              <div ref={messageListRef} className={styles.messagelist}>
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`} // More robust key
                    className={
                      `${message.role === "assistant" ? styles.apimessage : styles.usermessage}`
                    }
                  >
                    {/* Icons */}
                    {message.role === "assistant" ? (
                      <Image src="/hug.png" alt="Assistant" width="30" height="30" className={styles.boticon} priority={index < 3} />
                    ) : (
                      <Image src="/usericon.png" alt="User" width="30" height="30" className={styles.usericon} priority={index < 3} />
                    )}
                    {/* Content */}
                    <div className={styles.markdownanswer}>
                       {message.role === "user" && loading && index === messages.length - 1 ? (
                          <>
                            {message.content}
                            <span className={styles.loadingDots}><span>.</span><span>.</span><span>.</span></span>
                          </>
                       ) : (
                          <ReactMarkdown linkTarget="_blank">{message.content}</ReactMarkdown>
                       )}
                    </div>
                  </div>
                ))}
                {/* Separate Loading indicator for Assistant */}
                {loading && messages[messages.length - 1]?.role === 'user' && (
                   <div className={styles.apimessage} key="assistant-loading">
                     <Image src="/hug.png" alt="Assistant Loading" width="30" height="30" className={styles.boticon} priority />
                     <div className={styles.markdownanswer}>
                       <CircularProgress sx={{ color: 'var(--text-secondary)' }} size={20} />
                     </div>
                   </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className={`${styles.center} ${isChatStarted ? styles.centerActive : styles.centerInitial}`}>
              <div className={styles.cloudform}>
                <form onSubmit={handleSubmit}>
                  <textarea
                    disabled={loading}
                    onKeyDown={handleEnter}
                    ref={textAreaRef}
                    rows={1}
                    maxLength={1024}
                    placeholder={loading ? "Assistant is thinking..." : "Type your question..."}
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    className={styles.textarea}
                    onInput={(e) => {
                        e.target.style.height = 'auto';
                        // Use CSS max-height to constrain growth
                        e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                  />
                  <button type="submit" disabled={loading || !userInput.trim()} className={styles.generatebutton}>
                    {loading ? (
                      <div className={styles.loadingwheel}>
                        <CircularProgress sx={{ color: 'var(--text-accent)' }} size={20} />
                      </div>
                    ) : (
                      <svg viewBox="0 0 20 20" className={styles.svgicon} xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                      </svg>
                    )}
                  </button>
                </form>
              </div>
              <div className={styles.footer}>
                <p>This chatbot is powered by an Ollama-based RAG system!</p>
              </div>
            </div>
          </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className={styles.modal}>
        <div className={styles.modalContent}>
          <button className={styles.closeButton} onClick={() => setShowModal(false)}>×</button>
          <h2>🤖 How to Use the Chatbot</h2>
          <br />
          <p>
            Welcome to <strong>Your Friend in Need</strong>! 😊<br /><br />
            This chatbot is here to help answer your mental health questions. Please keep your inquiries focused on mental health topics so that we can provide you with the best support possible.<br /><br />
            <span style={{ fontWeight: "bold" }}>🚫 Reminder:</span> Avoid asking irrelevant or off-topic questions. If you do, the bot might reply with: <em>"I'm sorry I can't help you regarding that."</em><br /><br />
            We’re here to support you—feel free to ask anything related to mental health. Take care and enjoy your chat! 💖
          </p>
        </div>
      </div>
      )}
    </>
  );
}
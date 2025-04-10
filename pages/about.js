import { useState, useEffect } from 'react'; // Import hooks
import styles from "../styles/About.module.css"
import navstyles from '../styles/Chat.module.css' // Reuse Home nav styles

export default function About() {
  // --- Theme State ---
  const [theme, setTheme] = useState('dark'); // Default theme

 
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (prefersLight) {
      setTheme('light');
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

  // --- Theme Toggle Function  ---
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };


  return (
    // Wrap with a page container like index.js for consistent structure
    <div className={navstyles.pageContainer}>
      {/* Use the same topnav structure */}
      <div className={navstyles.topnav}>
          <div className={navstyles.navlogo}>
            <a href="/">Your friend in Need</a>
          </div>
          <div className={navstyles.navlinks}>
            {/* --- Theme Toggle Button --- */}
            <button onClick={toggleTheme} className={navstyles.themeToggleButton} title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}>
                {theme === 'light' ? '🌙' : '☀️'}
            </button>
            {/* Link back to Home */}
            <a href="/">Home</a>
            {/* Keep help button consistent if needed */}
            {/* <button className={navstyles.helpButton} onClick={() => alert('Help modal needed here too?')}>Help</button> */}
         </div>
      </div>

      {/* Main content area */}
      <main className={styles.main}> {/* Use main tag semantically */}
        <header className={styles.header}>
          <h1 className={styles.apptitle}>About Us</h1>
        </header>

        <section className={styles.content}>
          <p className={styles.text}>
          This demo is made using Langchain+Ollama+Chroma for final presentation of the course ENGI981B! 
          </p>

          <div className={styles.team}>
            <div className={styles.member}>
              <h2>Rifat Bin Masud</h2>
              <p>Student ID: 202387267</p>
              <p>rbmasud@mun.ca</p>
            </div>

            <div className={styles.member}>
              <h2>Sayed Fazli Rabby</h2>
              <p>Student ID: 202386191</p>
              <p>sfrabby@mun.ca</p>
            </div>
          </div>
        </section>
      </main>

    </div> // End pageContainer
  );
}
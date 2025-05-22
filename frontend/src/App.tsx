import AppRoutes from './routes';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ui/ThemeToggle';
// import './styles/App.css';

function App() {
    return (
      <ThemeProvider>
        <div className="App">
          <AppRoutes/>
          <ThemeToggle />
        </div>
      </ThemeProvider>
    );
  }
  
  export default App;

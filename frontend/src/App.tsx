import AppRoutes from './routes';
import ThemeToggle from './components/ui/ThemeToggle';

function App() {
    return (
        <div className="App"> 
            <AppRoutes />
            <div className="fixed bottom-4 right-4 z-50">
                <ThemeToggle />
            </div>
        </div>
    );
}
  
export default App;

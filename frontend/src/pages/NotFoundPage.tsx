import React from 'react';
import { useNavigate } from 'react-router-dom';
import FormButton from '../components/ui/FormButton';
import MessageBox from '../components/ui/MessageBox';
import ThemeToggle from '../components/ui/ThemeToggle';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  const handleReturnToSociety = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-custom-background dark:bg-dark-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h2 className="text-xl font-semibold text-custom-secondary dark:text-dark-third">
          DISCON Specialists
        </h2>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-custom-primary dark:text-dark-primary">
          404 - Page Not Found
        </h1>
        <p className="mt-2 text-md text-custom-third dark:text-dark-account-text">
          Looks like you've wandered into the digital wilderness!
        </p>
      </div>
      
      <MessageBox title="Oops! You've gone off the grid">
        <div className="my-4">
          <p className="mb-4">
            The page you're looking for has either been moved, deleted, or never existed in the first place.
          </p>
          <p className="mb-6">
            Don't worry though, you're not lost forever. Click the button below to return to civilisation.
          </p>
          <FormButton onClick={handleReturnToSociety}>
            Return to Society
          </FormButton>
        </div>
      </MessageBox>
      <ThemeToggle />
    </div>
  );
};

export default NotFoundPage;
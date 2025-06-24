import React from 'react';
import LandingLayout from '../layouts/LandingLayout';
import FeatureBlock from '../components/ui/FeatureBlock';
import FeatureGrid from '../components/ui/FeatureGrid';
import { Globe, LifeBuoy, LogIn, HelpCircle } from 'lucide-react';

const LandingHelpPage: React.FC = () => {
    return (
        <LandingLayout>
            <div className="mb-8 text-center">
                <h2 className="text-xl font-semibold text-custom-secondary dark:text-dark-third">
                    Help & Support
                </h2>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-custom-primary dark:text-dark-primary">
                    How Can We Help You?
                </h1>
                <p className="mt-2 text-md text-custom-third dark:text-dark-account-text">
                    Find answers to common questions and get in touch with our support team.
                </p>
            </div>

            <div className="mt-12 md:mt-16">
                <FeatureGrid>

                    <FeatureBlock
                        title="Visit DISCON Specialists"
                        icon={<Globe size={24} />}
                    >
                        <p>
                            For more information about our company, services, and career opportunities, please visit our corporate website.
                            <br />
                            <a 
                                href="https://www.disconspecialists.com/"
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                            >
                                Go to disconspecialists.com
                            </a>
                        </p>
                    </FeatureBlock>

                    <FeatureBlock
                        title="Technical Support"
                        icon={<LifeBuoy size={24} />}
                    >
                        <p>
                            Encountering a technical issue? Our support team is here to help. Please email us with a detailed description of the problem.
                            <br />
                            <a 
                                href="mailto:betatesters@gmail.com"
                                className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                            >
                                Contact Support
                            </a>
                        </p>
                    </FeatureBlock>

                    <FeatureBlock
                        title="Account Access"
                        icon={<LogIn size={24} />}
                    >
                        <p>
                            To access your dashboard, please use the 'Login' button in the navigation bar. If you're new, click 'Sign Up' to create an account.
                        </p>
                    </FeatureBlock>
                    
                    <FeatureBlock
                        title="Frequently Asked Questions"
                        icon={<HelpCircle size={24} />}
                    >
                        <p>
                            Have a question about how to use the scheduling system? Check our FAQ section for quick answers to common queries.
                        </p>
                    </FeatureBlock>

                </FeatureGrid>
            </div>
        </LandingLayout>
    );
};

export default LandingHelpPage;
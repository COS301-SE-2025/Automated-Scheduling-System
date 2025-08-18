import React from 'react';
import MainLayout from '../layouts/MainLayout';
import FeatureBlock from '../components/ui/FeatureBlock';
import FeatureGrid from '../components/ui/FeatureGrid';
import { LifeBuoy, BookOpen, Lightbulb, Gavel, Globe } from 'lucide-react';

const MainHelpPage: React.FC = () => {
    return (
        <MainLayout pageTitle="Help & Support">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-custom-primary dark:text-dark-primary">
                    Help Center
                </h1>
                <p className="mt-2 text-md text-custom-third dark:text-dark-account-text">
                    Find resources, get support, and provide feedback to help us improve the platform.
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
                            If you're experiencing a bug or technical glitch, please contact our support team. Provide as much detail as possible, including screenshots.
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
                        title="Feature Guides"
                        icon={<BookOpen size={24} />}
                    >
                        <p>
                            Learn how to make the most of the system. Find guides on using the dynamic calendar, managing users, and other key features.
                            <br />
                            <a
                                href="https://github.com/COS301-SE-2025/Automated-Scheduling-System/wiki/User-Manual"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                            >
                                Open the User Manual
                            </a>
                        </p>
                    </FeatureBlock>

                    <FeatureBlock
                        title="View Company Rules"
                        icon={<Gavel size={24} />}
                    >
                        <p>
                            Need to review company policies, scheduling procedures, or other internal rules? Access the centralized rulebook here.
                        </p>
                    </FeatureBlock>

                    <FeatureBlock
                        title="Feedback & Suggestions"
                        icon={<Lightbulb size={24} />}
                    >
                        <p>
                            Have an idea for a new feature or an improvement? We'd love to hear it. Your feedback helps us build a better tool for everyone.
                             <br />
                            <a
                                href="mailto:betatesters@gmail.com"
                                className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                            >
                                Share Your Ideas
                            </a>
                        </p>
                    </FeatureBlock>

                </FeatureGrid>
            </div>
        </MainLayout>
    );
};

export default MainHelpPage;
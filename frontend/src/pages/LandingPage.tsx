import React from 'react';
import LandingLayout from '../layouts/LandingLayout';
import FeatureBlock from '../components/ui/FeatureBlock';
import FeatureGrid from '../components/ui/FeatureGrid';
import { Calendar, Users, ShieldCheck, BookOpen } from 'lucide-react'; // Example icons

const LandingPage: React.FC = () => {
    return (
        <LandingLayout>
            <div className="mb-8 text-center">
                <h2 className="text-xl font-semibold text-custom-secondary dark:text-dark-third">
                    DISCON Specialists
                </h2>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-custom-primary dark:text-dark-primary">
                    Automated Scheduling System
                </h1>
                <p className="mt-2 text-md text-custom-third dark:text-dark-account-text">
                    A powerful, unified platform for managing events, users, and internal processes with ease and efficiency.
                </p>
            </div>

            <div className="mt-12 md:mt-16">
                <FeatureGrid>

                    <FeatureBlock
                        title="Dynamic Calendar"
                        icon={<Calendar size={24} />}
                    >
                        <p>
                            Organize and visualize all company events, meetings, and deadlines in one interactive calendar. Easy to add, edit, and view details.
                        </p>
                    </FeatureBlock>

                    <FeatureBlock
                        title="User Management"
                        icon={<Users size={24} />}
                    >
                        <p>
                            A complete system for managing user roles and permissions. Onboard new team members and control access levels effortlessly.
                        </p>
                    </FeatureBlock>

                    <FeatureBlock
                        title="Centralized Rules"
                        icon={<BookOpen size={24} />}
                    >
                        <p>
                            Keep all company policies, procedures, and rules in one accessible place. Ensure your team is always informed and compliant.
                        </p>
                    </FeatureBlock>

                    <FeatureBlock
                        title="Secure & Reliable"
                        icon={<ShieldCheck size={24} />}
                    >
                        <p>
                            Built with security in mind, your data is protected with modern authentication and authorization practices.
                        </p>
                    </FeatureBlock>

                </FeatureGrid>
            </div>
        </LandingLayout>
    );
};

export default LandingPage;
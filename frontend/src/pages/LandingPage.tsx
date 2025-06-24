import React from 'react';
import LandingLayout from '../layouts/LandingLayout';
import FeatureBlock from '../components/ui/FeatureBlock';
import { Calendar, Users, ShieldCheck, BookOpen } from 'lucide-react';

// Import the images
import calendarImage from '../assets/images/calendarPage.png';
import userImage from '../assets/images/usersPage.png';

const LandingPage: React.FC = () => {
    return (
        <LandingLayout>
            {/* 1. Refined Hero Section (Weaker, as requested) */}
            {/* 1. Corrected Hero Section */}
            <section className="text-center pt-0 pb-16 md:pb-20">
                <div className="container mx-auto px-4">
                    <h2 className="text-lg font-semibold text-custom-secondary dark:text-light-accent">
                        DISCON Specialists
                    </h2>
                    <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-custom-primary dark:text-dark-primary">
                        Automated Scheduling System
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-base text-custom-text dark:text-dark-secondary">
                        A powerful, unified platform for managing events, users, and internal processes with ease and efficiency.
                    </p>
                </div>
            </section>

            {/* 2. Dedicated Feature Showcase with Alternating Layout and Consistent Colors */}
            <section id="features" className="py-16 md:py-24 bg-gray-50 dark:bg-dark-secondary/20">
                <div className="container mx-auto px-4 space-y-24">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-custom-primary dark:text-dark-primary">
                            Everything You Need in One Platform
                        </h2>
                        <p className="mt-2 text-md text-custom-text dark:text-dark-secondary">
                            Discover the core features that make our system unique.
                        </p>
                    </div>

                    {/* Feature 1: Calendar */}
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="text-left">
                            <div className="inline-flex items-center gap-3 mb-4">
                                <Calendar className="text-custom-secondary dark:text-light-accent" size={28} />
                                <h3 className="text-2xl font-bold text-custom-primary dark:text-dark-primary">Dynamic Calendar</h3>
                            </div>
                            <p className="text-lg text-custom-text dark:text-dark-secondary">
                                Organize and visualize all company events, meetings, and deadlines in one interactive calendar. Color-code events, set reminders, and share schedules with your team to keep everyone synchronized.
                            </p>
                        </div>
                        <div>
                            <img src={calendarImage} alt="Dynamic Calendar" className="rounded-lg shadow-xl ring-1 ring-black/5" />
                        </div>
                    </div>

                    {/* Feature 2: User Management */}
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="md:order-last text-left">
                            <div className="inline-flex items-center gap-3 mb-4">
                                <Users className="text-custom-secondary dark:text-light-accent" size={28} />
                                <h3 className="text-2xl font-bold text-custom-primary dark:text-dark-primary">Comprehensive User Management</h3>
                            </div>
                            <p className="text-lg text-custom-text dark:text-dark-secondary">
                                A complete system for managing user roles and permissions. Onboard new team members, assign them to groups, and control access levels effortlessly to ensure data integrity and security.
                            </p>
                        </div>
                        <div className="md:order-first">
                            <img src={userImage} alt="User Management" className="rounded-lg shadow-xl ring-1 ring-black/5" />
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Grid for Secondary Features (Using the provided FeatureBlock) */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-8 text-left">
                        {/* FeatureBlock already uses the correct colors internally */}
                        <FeatureBlock title="Centralized Rules" icon={<BookOpen size={24} />}>
                            <p>Keep all company policies, procedures, and rules in one accessible place. Ensure your team is always informed and compliant.</p>
                        </FeatureBlock>
                        <FeatureBlock title="Secure & Reliable" icon={<ShieldCheck size={24} />}>
                            <p>Built with security in mind, your data is protected with modern authentication and authorization practices.</p>
                        </FeatureBlock>
                    </div>
                </div>
            </section>

            {/* 4. Refined Final Call-to-Action (Less bulky and more inviting) */}
            <section className="text-center py-16 md:py-20">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-custom-primary dark:text-dark-primary">
                        Ready to Streamline Your Workflow?
                    </h2>
                    <div className="mt-8">
                        <a
                            href="/signup"
                            className="inline-block px-10 py-4 font-semibold text-white bg-custom-primary rounded-lg shadow-lg hover:bg-opacity-90 transition-all duration-300 transform hover:scale-105"
                        >
                            Get Started Now
                        </a>
                    </div>
                </div>
            </section>
        </LandingLayout>
    );
};

export default LandingPage;
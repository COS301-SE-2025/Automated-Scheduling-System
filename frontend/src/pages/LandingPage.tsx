import React from 'react';
import LandingLayout from '../layouts/LandingLayout';
import FeatureBlock from '../components/ui/FeatureBlock';
import { Calendar, Users, ShieldCheck, BookOpen, CalendarClock, FileText, Shield, Edit, Layers, Briefcase, ListChecks, GraduationCap } from 'lucide-react';

import calendarImage from '../assets/images/calendarPage.png';
import userImage from '../assets/images/usersPage.png';
import addEventDefinitionImage from '../assets/images/AddEventDefinitionPage.png';
import rolesListImage from '../assets/images/Roles.png';
import editRoleImage from '../assets/images/RoleAssignments.png';
import competencyPrereqImage from '../assets/images/prerequistesForcompetencies.png';
import competencyTypesImage from '../assets/images/manageCompetencyTypes.png';
import jobPositionsImage from '../assets/images/manageJobPositions.png';
import allCompanyEventsImage from '../assets/images/EvnetsPage.png';
import eventDefinitionsPageImage from '../assets/images/EventDefinitionsPage.png';
import competencyManagementImage from '../assets/images/Competencies.png';

const LandingPage: React.FC = () => {
    return (
        <LandingLayout>

            <section className="text-center pt-0">
                <div className="container mx-auto px-4">
                    <h2 className="text-lg font-semibold text-custom-secondary dark:text-dark-third">
                        DISCON Specialists
                    </h2>
                    <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-custom-primary dark:text-dark-primary">
                        Automated Scheduling System
                    </h1>
            <p className="mt-4 max-w-2xl mx-auto text-base text-custom-text dark:text-dark-text">
                        A powerful, unified platform for managing events, users, and internal processes with ease and efficiency.
                    </p>
                </div>
            </section>

        <section className="mt-12 md:mt-16 rounded-xl bg-gradient-to-br from-custom-secondary to-custom-third dark:from-dark-accent-hover dark:to-dark-accent p-[2px] shadow-lg">
                <div className="container mx-auto h-full w-full rounded-[10px] bg-white dark:bg-dark-div px-4 py-16 space-y-16">

                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-custom-primary dark:text-dark-primary">
                            Everything You Need in One Platform
                        </h2>
                        <p className="mt-2 text-md text-custom-text dark:text-dark-text">
                            Discover the core features that make our system unique.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="text-left">
                            <div className="inline-flex items-center gap-3 mb-4">
                                <Calendar className="text-custom-secondary dark:text-dark-secondary" size={28} />
                                <h3 className="text-2xl font-bold text-custom-primary dark:text-dark-primary">Dynamic Calendar</h3>
                            </div>
                            <p className="text-lg text-custom-text dark:text-dark-text">
                                Organize and visualize all company events, meetings, and deadlines in one interactive calendar. Color-code events, set reminders, and share schedules with your team to keep everyone synchronized.
                            </p>
                        </div>
                        <div>
                            <img src={calendarImage} alt="Dynamic Calendar" className="rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="md:order-last text-left">
                            <div className="inline-flex items-center gap-3 mb-4">
                                <Users className="text-custom-secondary dark:text-dark-secondary" size={28} />
                                <h3 className="text-2xl font-bold text-custom-primary dark:text-dark-primary">Comprehensive User Management</h3>
                            </div>
                            <p className="text-lg text-custom-text dark:text-dark-text">
                                A complete system for managing user roles and permissions. Onboard new team members, assign them to groups, and control access levels effortlessly to ensure data integrity and security.
                            </p>
                        </div>
                        <div className="md:order-first">
                            <img src={userImage} alt="User Management" className="rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10" />
                        </div>
                    </div>

                    {/* New: Screenshots gallery with explanations */}
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="text-left">
                            <div className="inline-flex items-center gap-3 mb-4">
                                <FileText className="text-custom-secondary dark:text-dark-secondary" size={28} />
                                <h3 className="text-2xl font-bold text-custom-primary dark:text-dark-primary">Create Event Definitions</h3>
                            </div>
                            <p className="text-lg text-custom-text dark:text-dark-text">
                                Define reusable event templates with names, descriptions, standard duration, facilitator, and an optional granted certificate. These templates speed up scheduling and keep data consistent.
                            </p>
                        </div>
                        <div>
                            <img src={addEventDefinitionImage} alt="Add New Event Definition modal" className="rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="md:order-last text-left">
                            <div className="inline-flex items-center gap-3 mb-4">
                                <Shield className="text-custom-secondary dark:text-dark-secondary" size={28} />
                                <h3 className="text-2xl font-bold text-custom-primary dark:text-dark-primary">Roles Overview</h3>
                            </div>
                            <p className="text-lg text-custom-text dark:text-dark-text">
                                Browse and search roles with a clear view of their permissions. Quickly add new roles and see permission chips at a glance.
                            </p>
                        </div>
                        <div className="md:order-first">
                            <img src={rolesListImage} alt="Roles list with permissions" className="rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="text-left">
                            <div className="inline-flex items-center gap-3 mb-4">
                                <Edit className="text-custom-secondary dark:text-dark-secondary" size={28} />
                                <h3 className="text-2xl font-bold text-custom-primary dark:text-dark-primary">Edit Role Permissions</h3>
                            </div>
                            <p className="text-lg text-custom-text dark:text-dark-text">
                                Fine-tune access by toggling page-level permissions. Built-in system roles are clearly indicated for safety.
                            </p>
                        </div>
                        <div>
                            <img src={editRoleImage} alt="Edit Role modal with permission toggles" className="rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="md:order-last text-left">
                            <div className="inline-flex items-center gap-3 mb-4">
                                <ListChecks className="text-custom-secondary dark:text-dark-secondary" size={28} />
                                <h3 className="text-2xl font-bold text-custom-primary dark:text-dark-primary">Manage Competency Prerequisites</h3>
                            </div>
                            <p className="text-lg text-custom-text dark:text-dark-text">
                                Add, remove, and review prerequisites for any competency to keep training paths clear and enforced.
                            </p>
                        </div>
                        <div className="md:order-first">
                            <img src={competencyPrereqImage} alt="Prerequisites modal for competencies" className="rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="text-left">
                            <div className="inline-flex items-center gap-3 mb-4">
                                <Layers className="text-custom-secondary dark:text-dark-secondary" size={28} />
                                <h3 className="text-2xl font-bold text-custom-primary dark:text-dark-primary">Competency Types</h3>
                            </div>
                            <p className="text-lg text-custom-text dark:text-dark-text">
                                Maintain your taxonomy by creating and organizing competency types such as Certifications, Skills, Licenses, and Training.
                            </p>
                        </div>
                        <div>
                            <img src={competencyTypesImage} alt="Manage Competency Types modal" className="rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="md:order-last text-left">
                            <div className="inline-flex items-center gap-3 mb-4">
                                <Briefcase className="text-custom-secondary dark:text-dark-secondary" size={28} />
                                <h3 className="text-2xl font-bold text-custom-primary dark:text-dark-primary">Job Positions</h3>
                            </div>
                            <p className="text-lg text-custom-text dark:text-dark-text">
                                Manage job positions alongside matrix codes and descriptions, and connect them to required competencies.
                            </p>
                        </div>
                        <div className="md:order-first">
                            <img src={jobPositionsImage} alt="Manage Job Positions modal" className="rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="text-left">
                            <div className="inline-flex items-center gap-3 mb-4">
                                <CalendarClock className="text-custom-secondary dark:text-dark-secondary" size={28} />
                                <h3 className="text-2xl font-bold text-custom-primary dark:text-dark-primary">All Company Events</h3>
                            </div>
                            <p className="text-lg text-custom-text dark:text-dark-text">
                                Get a card-based overview of scheduled events with quick actions to edit or delete. Designed for fast scanning and management.
                            </p>
                        </div>
                        <div>
                            <img src={allCompanyEventsImage} alt="All Company Events cards" className="rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="md:order-last text-left">
                            <div className="inline-flex items-center gap-3 mb-4">
                                <FileText className="text-custom-secondary dark:text-dark-secondary" size={28} />
                                <h3 className="text-2xl font-bold text-custom-primary dark:text-dark-primary">Event Definitions List</h3>
                            </div>
                            <p className="text-lg text-custom-text dark:text-dark-text">
                                Search and filter by facilitator, and manage definitions inline with edit and delete actions.
                            </p>
                        </div>
                        <div className="md:order-first">
                            <img src={eventDefinitionsPageImage} alt="Event Definitions page with table" className="rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="text-left">
                            <div className="inline-flex items-center gap-3 mb-4">
                                <GraduationCap className="text-custom-secondary dark:text-dark-secondary" size={28} />
                                <h3 className="text-2xl font-bold text-custom-primary dark:text-dark-primary">Competency Management</h3>
                            </div>
                            <p className="text-lg text-custom-text dark:text-dark-text">
                                Define competencies, link prerequisites, and map them to job roles. Filter by type and status for quick navigation.
                            </p>
                        </div>
                        <div>
                            <img src={competencyManagementImage} alt="Competency Management page" className="rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10" />
                        </div>
                    </div>

                </div>
            </section>

            <section className="pt-12 md:pt-16">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-8 text-left">
                        <FeatureBlock title="Centralized Rules" icon={<BookOpen size={24} />} className="dark:from-dark-accent-hover dark:to-dark-accent"> 
                            <p>Keep all company policies, procedures, and rules in one accessible place. Ensure your team is always informed and compliant.</p>
                        </FeatureBlock>
                        <FeatureBlock title="Secure & Reliable" icon={<ShieldCheck size={24} />} className="dark:from-dark-accent-hover dark:to-dark-accent"> 
                            <p>Built with security in mind, your data is protected with modern authentication and authorization practices.</p>
                        </FeatureBlock>
                    </div>
                </div>
            </section>

            <section className="text-center py-12 md:py-16">
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
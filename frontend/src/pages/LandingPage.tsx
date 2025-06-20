import LandingLayout from "../layouts/LandingLayout";
import React from "react";

const LandingPage: React.FC = () => {
    return (
        <LandingLayout>
            <div>
                <h1 className="text-2xl font-semibold">Welcome to the landing page</h1>
                {/* The logout button is now part of the Header component in DashboardLayout */}
            </div>
        </LandingLayout>
    );
}

export default LandingPage;
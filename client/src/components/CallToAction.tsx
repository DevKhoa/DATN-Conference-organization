import React from "react";
import { Button } from "@/components/ui/button";

const CallToAction: React.FC = () => {
  return (
    <section className="relative py-24 bg-brand-900 overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-brand-800 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-brand-600 rounded-full blur-3xl opacity-30"></div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
          Ready to host your best conference yet?
        </h2>
        <p className="text-lg lg:text-xl text-brand-100 mb-10 max-w-2xl mx-auto">
          Join thousands of organizers who trust Conf-Org to streamline their
          academic events. Start your free trial today.
        </p>
        <p className="mt-6 text-sm text-brand-300">
          Fully compliant with GDPR and scientific data standards.
        </p>
      </div>
    </section>
  );
};

export default CallToAction;

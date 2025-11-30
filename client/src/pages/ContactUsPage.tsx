import React from 'react';

const ContactUsPage: React.FC = () => {
  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        {/* Header Section */}
        <section className="py-20 px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6 text-blue-800">
              Contact Us
            </h1>
            <p className="text-xl text-gray-700 leading-relaxed">
              Get in touch with the Axiom Smart City team. We're here to help you navigate the future of sovereign digital economies.
            </p>
          </div>
        </section>

        {/* Contact Information Section */}
        <section className="py-16 px-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Phone Contact */}
              <div className="bg-white shadow-lg border-2 border-blue-200 hover:shadow-xl transition-shadow rounded-lg">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-blue-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">📞</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-blue-800">Phone</h3>
                  <a 
                    href="tel:404-914-3130"
                    className="text-xl text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                  >
                    404-914-3130
                  </a>
                  <p className="text-gray-600 mt-4">
                    Call us directly for immediate assistance with Axiom Smart City services.
                  </p>
                </div>
              </div>

              {/* Email Contact */}
              <div className="bg-white shadow-lg border-2 border-blue-200 hover:shadow-xl transition-shadow rounded-lg">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-blue-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">📧</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-blue-800">Email</h3>
                  <a 
                    href="mailto:partnerships@axiomsmartcity.com"
                    className="text-xl text-blue-600 hover:text-blue-800 font-semibold transition-colors break-all"
                  >
                    partnerships@axiomsmartcity.com
                  </a>
                  <p className="text-gray-600 mt-4">
                    Send us detailed questions and we'll get back to you within 24 hours.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Additional Information Section */}
        <section className="py-16 px-8 bg-gradient-to-r from-blue-600 to-blue-800">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8 text-white">
              Ready to Start Building Wealth?
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Our team is ready to help you participate in America's first on-chain sovereign smart city economy.
              Whether you're interested in tokenized real estate, DePIN infrastructure, smart city banking services,
              or AXM governance, we're here to support your journey.
            </p>
            <div className="bg-white bg-opacity-10 rounded-lg p-6 backdrop-blur-sm">
              <h3 className="text-xl font-semibold text-white mb-4">Business Hours</h3>
              <p className="text-blue-100">
                Monday - Friday: 9:00 AM - 6:00 PM EST<br/>
                Saturday: 10:00 AM - 4:00 PM EST<br/>
                Sunday: Closed
              </p>
            </div>
          </div>
        </section>

        {/* Quick Contact CTA */}
        <section className="py-16 px-8 bg-white">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-blue-300 rounded-lg">
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-4 text-blue-800">
                  Quick Contact Options
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <a 
                    href="tel:404-914-3130"
                    className="block px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-center"
                  >
                    📞 Call Now
                  </a>
                  <a
                    href="mailto:partnerships@axiomsmartcity.com"
                    className="block px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-center"
                  >
                    📧 Send Email
                  </a>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Choose your preferred way to get in touch with our team.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
  );
};

export default ContactUsPage;

import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Mail, Phone, Clock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const HelpPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Need Help - PharaohVault</title>
        <meta name="description" content="Contact support for assistance with your PharaohVault account." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Need Help?</h1>
          <p className="text-lg text-slate-600">
            We're here to assist you. Reach out to our support team for any questions or concerns.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Support Email Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center mb-4">
              <div className="bg-amber-100 p-3 rounded-lg mr-4">
                <Mail className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Support Email</h2>
            </div>
            <p className="text-slate-600 mb-4">
              Send us an email and we'll get back to you as soon as possible.
            </p>
            <a
              href="mailto:support@pharaohvault.com"
              className="text-amber-600 hover:text-amber-700 font-semibold text-lg break-all"
            >
              support@pharaohvault.com
            </a>
          </motion.div>

          {/* Contact Info Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center mb-4">
              <div className="bg-amber-100 p-3 rounded-lg mr-4">
                <Phone className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Contact Information</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Phone</p>
                <p className="text-slate-900 font-semibold">+1 (555) 123-4567</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Business Hours</p>
                <p className="text-slate-900 font-semibold">Monday - Friday: 9:00 AM - 5:00 PM EST</p>
              </div>
            </div>
          </motion.div>

          {/* Admin Contact Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-amber-50 to-yellow-50 p-8 rounded-xl shadow-sm border border-amber-200 md:col-span-2"
          >
            <div className="flex items-center mb-4">
              <div className="bg-amber-200 p-3 rounded-lg mr-4">
                <MessageCircle className="w-6 h-6 text-amber-700" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Admin Contact</h2>
            </div>
            <p className="text-slate-700 mb-4">
              For urgent matters or administrative inquiries, please contact our admin team directly.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-600 mb-1">Admin Email</p>
                <a
                  href="mailto:admin@pharaohvault.com"
                  className="text-amber-700 hover:text-amber-800 font-semibold break-all"
                >
                  admin@pharaohvault.com
                </a>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Response Time</p>
                <p className="text-slate-900 font-semibold">Within 24 hours</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Additional Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200"
        >
          <div className="flex items-center mb-4">
            <Clock className="w-5 h-5 text-amber-600 mr-2" />
            <h3 className="text-lg font-semibold text-slate-900">Response Times</h3>
          </div>
          <ul className="space-y-2 text-slate-600">
            <li>• General inquiries: 24-48 hours</li>
            <li>• Account issues: 12-24 hours</li>
            <li>• Urgent matters: Same day response</li>
          </ul>
        </motion.div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="bg-white hover:bg-slate-50"
          >
            Go Back
          </Button>
        </div>
      </motion.div>
    </>
  );
};

export default HelpPage;


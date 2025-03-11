import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
              <path d="M8 7a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            </svg>
            <span className="font-serif text-2xl tracking-tight">DocumentAI</span>
          </div>
          <ul className="hidden md:flex space-x-8">
            <li>
              <Link to="/" className="text-white hover:text-indigo-200 font-medium transition duration-300 border-b-2 border-transparent hover:border-indigo-200 pb-1">
                Home
              </Link>
            </li>
            <li>
              <Link to="/Chatwithupload" className="text-white hover:text-indigo-200 font-medium transition duration-300 border-b-2 border-transparent hover:border-indigo-200 pb-1">
                Document Chat
              </Link>
            </li>
          </ul>
          <div className="md:hidden">
            {/* Mobile menu button - you can implement toggle functionality */}
            <button className="text-white focus:outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
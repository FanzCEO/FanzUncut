'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Video, Star, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';
import { SignupModal } from '@/components/auth/SignupModal';
import { UserMenu } from '@/components/ui/UserMenu';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-background text-text overflow-hidden">
      {/* Navigation Header */}
      <nav className="fixed top-0 w-full bg-surface/90 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-heading text-primary underground-glow font-bold">
                BoyFanz
              </h1>
              <span className="text-sm text-text-secondary font-body">
                Every Man&apos;s Playground
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/explore" className="text-text-secondary hover:text-primary transition-colors">
                Explore
              </Link>
              <a href="#creators" className="text-text-secondary hover:text-primary transition-colors">
                Creators
              </a>
              <a href="#live" className="text-text-secondary hover:text-primary transition-colors">
                Live
              </a>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <>
                  <button 
                    onClick={() => setShowLogin(true)}
                    className="bg-surface text-text px-4 py-2 rounded-lg hover:bg-border transition-colors"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => setShowSignup(true)}
                    className="bg-primary text-accent px-4 py-2 rounded-lg hover:shadow-red-glow transition-all pulse-red"
                  >
                    Join Now
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 min-h-screen flex items-center">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-surface/30 to-background"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="text-6xl md:text-8xl font-heading text-primary underground-glow mb-6 leading-none">
              EVERY MAN&apos;S
              <br />
              <span className="text-secondary">PLAYGROUND</span>
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary mb-8 max-w-3xl mx-auto font-body">
              Welcome to the underground. Where raw masculinity meets exclusive content.
              Join the brotherhood of creators and fans who dare to be different.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/explore" className="inline-block">
                <button className="bg-primary text-accent px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-red-glow-lg transition-all pulse-red transform hover:scale-105">
                  Enter the Underground
                </button>
              </Link>
              <Link href="/explore" className="inline-block">
                <button className="border-2 border-secondary text-secondary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-secondary hover:text-background transition-all">
                  Explore Content
                </button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background Elements */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-surface to-transparent"></div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="neon-border p-6 rounded-lg bg-background/50">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-3xl font-heading text-primary underground-glow">50K+</div>
              <div className="text-text-secondary">Active Members</div>
            </div>
            <div className="neon-border p-6 rounded-lg bg-background/50">
              <Video className="w-8 h-8 text-secondary mx-auto mb-2" />
              <div className="text-3xl font-heading text-secondary">1K+</div>
              <div className="text-text-secondary">Live Streams</div>
            </div>
            <div className="neon-border p-6 rounded-lg bg-background/50">
              <Star className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-3xl font-heading text-primary underground-glow">500+</div>
              <div className="text-text-secondary">Elite Creators</div>
            </div>
            <div className="neon-border p-6 rounded-lg bg-background/50">
              <Zap className="w-8 h-8 text-secondary mx-auto mb-2" />
              <div className="text-3xl font-heading text-secondary">24/7</div>
              <div className="text-text-secondary">Underground Access</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-heading text-primary underground-glow mb-4">
              THE BROTHERHOOD
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              Join an exclusive community where authentic connections are forged in the underground.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-surface p-8 rounded-lg neon-border hover:shadow-red-glow transition-all">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-heading text-text mb-3">Exclusive Community</h3>
              <p className="text-text-secondary">
                Connect with like-minded individuals in our private underground community. No judgment, just authenticity.
              </p>
            </div>
            
            <div className="bg-surface p-8 rounded-lg neon-border hover:shadow-red-glow transition-all">
              <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-background" />
              </div>
              <h3 className="text-xl font-heading text-text mb-3">Premium Content</h3>
              <p className="text-text-secondary">
                Access exclusive content from the most elite creators. Raw, unfiltered, and underground.
              </p>
            </div>
            
            <div className="bg-surface p-8 rounded-lg neon-border hover:shadow-red-glow transition-all">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-heading text-text mb-3">Live Experiences</h3>
              <p className="text-text-secondary">
                Real-time interactions with creators. Private shows, live chats, and exclusive behind-the-scenes access.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-surface">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-heading text-primary underground-glow mb-6">
            READY TO ENTER?
          </h2>
          <p className="text-xl text-text-secondary mb-8">
            The underground awaits. Join thousands of men who&apos;ve discovered their playground.
          </p>
          <Link href="/explore" className="inline-block">
            <button className="bg-primary text-accent px-12 py-4 rounded-lg text-xl font-semibold hover:shadow-red-glow-lg transition-all pulse-red transform hover:scale-105">
              Join the Underground
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-heading text-primary underground-glow mb-4">BoyFanz</h3>
              <p className="text-text-secondary text-sm">
                Every Man&apos;s Playground. The underground community for authentic masculine expression.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><Link href="/explore" className="hover:text-primary transition-colors">Explore</Link></li>
                <li><a href="#" className="hover:text-primary transition-colors">Creators</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Live Streams</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Safety</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Community</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">18+ Only</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-12 pt-8 text-center text-sm text-text-secondary">
            <p>© 2025 BoyFanz. Every Man&apos;s Playground. 18+ Only.</p>
          </div>
        </div>
      </footer>
      
      {/* Authentication Modals */}
      <LoginModal 
        isOpen={showLogin} 
        onClose={() => setShowLogin(false)}
        onSwitchToSignup={() => {
          setShowLogin(false);
          setShowSignup(true);
        }}
      />
      
      <SignupModal 
        isOpen={showSignup} 
        onClose={() => setShowSignup(false)}
        onSwitchToLogin={() => {
          setShowSignup(false);
          setShowLogin(true);
        }}
      />
    </div>
  );
}

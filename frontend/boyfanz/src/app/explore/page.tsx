'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Filter, Play, Users, Heart, Eye } from 'lucide-react';
import { Card, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';
import { SignupModal } from '@/components/auth/SignupModal';
import { UserMenu } from '@/components/ui/UserMenu';

// Mock data for creators and content
const creators = [
  {
    id: 1,
    name: 'MaxSteel',
    avatar: '/api/placeholder/100/100',
    followers: '12.5K',
    isLive: true,
    category: 'fitness',
    preview: '/api/placeholder/300/200'
  },
  {
    id: 2,
    name: 'RoughRider',
    avatar: '/api/placeholder/100/100',
    followers: '8.2K',
    isLive: false,
    category: 'lifestyle',
    preview: '/api/placeholder/300/200'
  },
  {
    id: 3,
    name: 'IronWolf',
    avatar: '/api/placeholder/100/100',
    followers: '15.1K',
    isLive: true,
    category: 'outdoor',
    preview: '/api/placeholder/300/200'
  },
  {
    id: 4,
    name: 'UrbanKing',
    avatar: '/api/placeholder/100/100',
    followers: '9.8K',
    isLive: false,
    category: 'urban',
    preview: '/api/placeholder/300/200'
  },
  {
    id: 5,
    name: 'WildBeast',
    avatar: '/api/placeholder/100/100',
    followers: '22.3K',
    isLive: true,
    category: 'adventure',
    preview: '/api/placeholder/300/200'
  },
  {
    id: 6,
    name: 'NightHawk',
    avatar: '/api/placeholder/100/100',
    followers: '18.7K',
    isLive: false,
    category: 'mystery',
    preview: '/api/placeholder/300/200'
  }
];

const categories = ['All', 'Live', 'Fitness', 'Lifestyle', 'Outdoor', 'Urban', 'Adventure', 'Mystery'];

export default function ExplorePage() {
  const { isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const filteredCreators = creators.filter(creator => {
    const matchesCategory = selectedCategory === 'All' || 
                          selectedCategory === 'Live' && creator.isLive ||
                          creator.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = creator.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background text-text">
      {/* Navigation Header */}
      <nav className="fixed top-0 w-full bg-surface/90 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Link href="/" className="text-2xl font-heading text-primary underground-glow font-bold">
                BoyFanz
              </Link>
              <span className="text-sm text-text-secondary font-body">
                Every Man&apos;s Playground
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/" className="text-text-secondary hover:text-primary transition-colors">
                Home
              </Link>
              <a href="/explore" className="text-primary">
                Explore
              </a>
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
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowLogin(true)}
                  >
                    Sign In
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    glow 
                    pulse
                    onClick={() => setShowSignup(true)}
                  >
                    Join Now
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-8 bg-gradient-to-b from-surface/20 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-6xl font-heading text-primary underground-glow mb-4">
              EXPLORE THE UNDERGROUND
            </h1>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              Discover exclusive content from the most elite creators in the brotherhood.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5" />
              <input
                type="text"
                placeholder="Search creators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-lg text-text placeholder-text-secondary focus:border-primary focus:outline-none focus:shadow-red-glow"
              />
              <Button variant="primary" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-primary text-accent shadow-red-glow'
                    : 'bg-surface text-text-secondary hover:bg-border hover:text-text'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content Grid */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCreators.map((creator) => (
              <Link href={`/creator/${creator.id}`} key={creator.id} className="block">
                <Card variant="neon" className="overflow-hidden hover:scale-105 transition-transform">
                <div className="relative">
                  {/* Live Badge */}
                  {creator.isLive && (
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-primary text-accent px-3 py-1 rounded-full text-sm font-semibold pulse-red flex items-center">
                        <div className="w-2 h-2 bg-accent rounded-full mr-2 animate-pulse"></div>
                        LIVE
                      </span>
                    </div>
                  )}
                  
                  {/* Content Preview */}
                  <div className="relative aspect-video bg-surface/50 flex items-center justify-center group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent"></div>
                    <Play className="w-12 h-12 text-primary opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all underground-glow" />
                  </div>

                  {/* Creator Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/80 to-transparent">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-accent font-bold text-sm">
                          {creator.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-heading text-text font-semibold">{creator.name}</h3>
                        <p className="text-text-secondary text-sm capitalize">{creator.category}</p>
                      </div>
                      <Button variant="primary" size="sm" glow>
                        Follow
                      </Button>
                    </div>
                  </div>
                </div>

                <CardFooter className="bg-surface/50">
                  <div className="flex items-center space-x-4 text-text-secondary text-sm">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{creator.followers}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4" />
                      <span>1.2K</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>856</span>
                    </div>
                  </div>
                </CardFooter>
                </Card>
              </Link>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <Button variant="outline" size="lg" className="underground-glow">
              Load More Creators
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-surface">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-heading text-primary underground-glow mb-6">
            JOIN THE BROTHERHOOD
          </h2>
          <p className="text-xl text-text-secondary mb-8">
            Get exclusive access to premium content from elite creators.
          </p>
          <Button variant="primary" size="lg" glow pulse>
            Start Your Underground Journey
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-text-secondary text-sm">
            © 2025 BoyFanz. Every Man&apos;s Playground. 18+ Only.
          </p>
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

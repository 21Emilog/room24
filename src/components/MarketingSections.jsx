import React, { useState, useEffect, useRef } from 'react';
import { Shield, Zap, Users, Home, MessageCircle, Star, TrendingUp, Clock, CheckCircle } from 'lucide-react';

// Animated counter hook
function useCountUp(end, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!startOnView) {
      setHasStarted(true);
    }
  }, [startOnView]);

  useEffect(() => {
    if (!startOnView) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasStarted, startOnView]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * end));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [hasStarted, end, duration]);

  return { count, ref };
}

// Animated Stat Card
function StatCard({ icon: Icon, value, suffix = '', label, color = 'red', delay = 0 }) {
  const { count, ref } = useCountUp(value, 2000);
  
  const colorClasses = {
    red: 'from-red-500 to-rose-600 shadow-red-500/30',
    blue: 'from-blue-500 to-indigo-600 shadow-blue-500/30',
    green: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    purple: 'from-purple-500 to-violet-600 shadow-purple-500/30',
  };

  return (
    <div 
      ref={ref}
      className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 hover:scale-105 transition-all duration-300 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClasses[color]} shadow-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-gray-500 dark:text-gray-400 font-medium">{label}</div>
    </div>
  );
}

// Stats Section for Browse View
export function StatsSection({ listingsCount = 0 }) {
  const stats = [
    { icon: Home, value: Math.max(listingsCount, 150), suffix: '+', label: 'Active Listings', color: 'red' },
    { icon: Users, value: 500, suffix: '+', label: 'Happy Renters', color: 'blue' },
    { icon: MessageCircle, value: 2500, suffix: '+', label: 'Messages Sent', color: 'green' },
    { icon: Star, value: 98, suffix: '%', label: 'Satisfaction Rate', color: 'amber' },
  ];

  return (
    <div className="py-12 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Trusted by <span className="text-[#E63946]">Thousands</span> Across South Africa
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Join the growing community of renters and landlords who trust RentMzansi for their accommodation needs.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, idx) => (
            <StatCard key={stat.label} {...stat} delay={idx * 100} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Why Choose Us Section
export function WhyChooseUs() {
  const features = [
    {
      icon: Shield,
      title: 'Verified Landlords',
      description: 'All landlords are verified with ID checks. Chat safely knowing who you\'re dealing with.',
      color: 'blue',
    },
    {
      icon: Zap,
      title: 'Instant Messaging',
      description: 'Voice notes, read receipts, and real-time chat. Communicate like WhatsApp.',
      color: 'amber',
    },
    {
      icon: TrendingUp,
      title: 'Zero Fees',
      description: 'Completely free for renters. No agent fees, no hidden costs, no surprises.',
      color: 'green',
    },
    {
      icon: Clock,
      title: 'Fast Response',
      description: 'Most landlords respond within hours. Track response times and availability.',
      color: 'purple',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    green: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="py-16 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block bg-red-100 dark:bg-red-900/30 text-[#E63946] text-sm font-bold px-4 py-1.5 rounded-full mb-4">
            WHY RENTMZANSI?
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            The <span className="text-[#E63946]">Smarter</span> Way to Find a Room
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg">
            Built specifically for South African renters and landlords. Modern features, local focus.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <div 
              key={feature.title}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-3xl p-6 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 dark:border-gray-600 group"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className={`w-14 h-14 rounded-2xl ${colorClasses[feature.color]} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Testimonials Section
export function Testimonials() {
  const testimonials = [
    {
      name: 'Thabo M.',
      location: 'Johannesburg',
      image: null,
      text: 'Found my perfect room in Sandton within 2 days! The voice message feature made chatting with landlords so easy.',
      rating: 5,
    },
    {
      name: 'Lerato K.',
      location: 'Pretoria',
      image: null,
      text: 'As a landlord, I love how quickly I can fill vacancies. Already have 3 happy tenants from RentMzansi.',
      rating: 5,
    },
    {
      name: 'Sipho N.',
      location: 'Cape Town',
      image: null,
      text: 'No more scams or fake listings. The verified badge gives me peace of mind when looking for accommodation.',
      rating: 5,
    },
  ];

  return (
    <div className="py-16 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-sm font-bold px-4 py-1.5 rounded-full mb-4">
            ⭐ TESTIMONIALS
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            What Our <span className="text-[#E63946]">Users</span> Say
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, idx) => (
            <div 
              key={testimonial.name}
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6 italic">"{testimonial.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E63946] to-rose-500 flex items-center justify-center text-white font-bold text-lg">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">{testimonial.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{testimonial.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Call to Action Section
export function CallToAction({ onSignUp }) {
  return (
    <div className="py-16 bg-gradient-to-r from-[#1D3557] via-[#1D3557] to-[#2d4a6f] relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aC0ydi00aDJ2LTJoLTJ2LTJoMnYtMkgyNHYyaDJ2MmgtMnYyaDJ2NGgtMnYyaDEydi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#E63946]/20 rounded-full blur-3xl" />
      
      <div className="max-w-4xl mx-auto px-4 text-center relative">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to Find Your <span className="text-[#E63946]">Perfect Room</span>?
        </h2>
        <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
          Join thousands of South Africans who've already found their ideal accommodation through RentMzansi.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => onSignUp?.('renter')}
            className="inline-flex items-center justify-center gap-2 bg-[#E63946] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#c5303c] transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
          >
            <CheckCircle className="w-5 h-5" />
            Get Started Free
          </button>
          <button
            onClick={() => onSignUp?.('landlord')}
            className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/20 transition-all border border-white/30"
          >
            <Home className="w-5 h-5" />
            List Your Property
          </button>
        </div>
        <p className="text-white/60 text-sm mt-6">
          ✓ No credit card required · ✓ Free for renters · ✓ Cancel anytime
        </p>
      </div>
    </div>
  );
}

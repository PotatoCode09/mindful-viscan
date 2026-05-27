import React from 'react';
import Button from './Button';

const HeroCard = () => {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 md:p-6">
      {/* Container Note: Removed the bg-[#467854] so the page background shows through */}

      <div className="relative flex flex-col w-full max-w-4xl mx-auto rounded-2xl bg-[#031207] p-8 md:p-16 border border-gray-900/50 shadow-[4px_4px_0px_0px_rgba(34,197,94,0.15)]">
        {/* ^ That shadow-[...] class is the "light accent border" 
           on the lower right! It creates a solid, non-blurred offset.
        */}

        <div className="flex flex-grow flex-col gap-6 md:gap-8">
          
          {/* Main Headline */}
          <h1 className="font-kodchasan text-4xl md:text-5xl font-medium tracking-wide text-[#42734D]">
            Support for students, <br />
            anytime you need it.
          </h1>

          {/* Subheadline & Description Group */}
          <div className="font-kodchasan space-y-4">
            <h2 className="text-xl md:text-2xl text-gray-100 font-normal">
              Your Space for Mental Wellness and Support.
            </h2>

            <p className="text-lg md:text-xl text-gray-200 font-light max-w-3xl leading-relaxed">
              Accessible Counseling and Resources for Students and Young Adults.
            </p>

            <p className="text-lg md:text-xl text-gray-200 font-light max-w-3xl leading-relaxed">
              Talk to a counselor, track your mood, explore self-help resources, 
              and get guided support—all in one safe platform.
            </p>
          </div>

          {/* CTA Section */}
          <div className="mt-auto space-y-3">
            <div className="w-fit">
              <Button
                text="Login / Sign Up"
                href="/sign-in"
                className="w-full px-12 py-3 text-lg bg-mindful-green text-mindful-dark hover:bg-mindful-dark"
              />
              
              <p className="text-sm font-medium text-white tracking-wide">
                Confidential • Secure • Free for students
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HeroCard;
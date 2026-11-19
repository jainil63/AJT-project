import React, { useEffect, useState } from 'react';
import logoImg from '../assets/logo.jpeg';

const SplashScreen = ({ onComplete }) => {
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFadeOut(true);
            setTimeout(onComplete, 800); // Wait for fade out animation to finish
        }, 2200);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-1000 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className={`flex flex-col items-center animate-fade-in-up`}>
                <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-3xl p-3 shadow-2xl mb-8 flex items-center justify-center border border-slate-100 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-brand-600/5 opacity-50"></div>
                    <img 
                        src={logoImg} 
                        alt="Logo" 
                        className="w-full h-full object-contain relative z-10 animate-pulse-slow" 
                    />
                </div>
                
                <div className="text-center space-y-2">
                    <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight">
                        Swaminarayan <br/>
                        <span className="text-brand-600">Dental Clinic</span>
                    </h1>
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <div className="h-1 w-12 bg-brand-500 rounded-full animate-width-grow"></div>
                        <div className="h-1 w-1 bg-brand-500 rounded-full animate-bounce"></div>
                        <div className="h-1 w-1 bg-brand-500 rounded-full animate-bounce delay-100"></div>
                        <div className="h-1 w-1 bg-brand-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-6 animate-pulse">
                        Loading Experience...
                    </p>
                </div>
            </div>

            {/* Subtle background decorative elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-brand-50/40 blur-[100px] -z-10"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-teal-50/40 blur-[100px] -z-10"></div>
        </div>
    );
};

export default SplashScreen;

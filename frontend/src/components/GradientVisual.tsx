import posDevice from "@/assets/pos-device.jpg";

const GradientVisual = () => {
  return (
    <section className="py-20 px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative min-h-[700px] overflow-visible animate-scale-in">
          {/* Wavy Gradient Background with organic shapes */}
          <div className="absolute inset-0 rounded-[4rem]">
            {/* Main gradient base */}
            <div className="absolute inset-0 gradient-pink-orange-yellow rounded-[4rem]"></div>
            
            {/* Organic wavy blob shapes */}
            <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-gradient-to-br from-pink-300/40 to-transparent rounded-[100%] blur-3xl animate-pulse"></div>
            <div className="absolute bottom-[-15%] right-[-10%] w-[70%] h-[70%] bg-gradient-to-tl from-yellow-200/50 via-orange-300/40 to-transparent rounded-[100%] blur-3xl" style={{ animation: "pulse 4s ease-in-out infinite" }}></div>
            <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-gradient-to-bl from-orange-300/30 to-transparent rounded-[100%] blur-2xl" style={{ animation: "pulse 3s ease-in-out infinite reverse" }}></div>
            
            {/* Additional wavy layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-400/20 via-transparent to-orange-400/20 rounded-[4rem]"></div>
            <div className="absolute inset-0 bg-gradient-to-tl from-yellow-300/20 via-transparent to-pink-300/20 rounded-[4rem]"></div>
          </div>

          {/* POS Device Image - Floating like the phone in screenshot */}
          <div className="relative z-10 flex items-center justify-center min-h-[700px] py-16">
            <div className="relative group">
              {/* Glow effect behind device */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-[3rem] blur-2xl scale-105 group-hover:scale-110 transition-transform duration-500"></div>
              
              {/* Main device image */}
              <div className="relative">
                <img
                  src={posDevice}
                  alt="Modern POS System"
                  className="w-full max-w-3xl h-auto drop-shadow-2xl rounded-3xl transform group-hover:scale-[1.02] transition-transform duration-500"
                  style={{
                    filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.25))"
                  }}
                />
              </div>
              
              {/* Subtle reflection effect */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-gradient-to-t from-white/20 to-transparent blur-xl rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GradientVisual;

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Wheat, Droplets, Sun, Leaf, BarChart3, Satellite, Shield, Sprout } from "lucide-react";
import { AdaptiveLogo } from "@/components/adaptive-logo";
import { GrowingCropsBackground } from "@/components/growing-crops-background";
import { countryCodes } from "@/lib/country-codes";

export default function Landing() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("yogesh@gmail.com");
  const [signupPassword, setSignupPassword] = useState("");
  const [firstName, setFirstName] = useState("Yogesh");
  const [lastName, setLastName] = useState("V");
  const [phoneNumber, setPhoneNumber] = useState("1234567890");
  const [countryCode, setCountryCode] = useState("+880");
  const [language, setLanguage] = useState("en");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
    { code: "ta", name: "Tamil", flag: "🇮🇳" },
    { code: "te", name: "Telugu", flag: "🇮🇳" },
    { code: "kn", name: "Kannada", flag: "🇮🇳" },
    { code: "ml", name: "Malayalam", flag: "🇮🇳" },
    { code: "mr", name: "Marathi", flag: "🇮🇳" },
    { code: "bn", name: "Bengali", flag: "🇧🇩" },
    { code: "gu", name: "Gujarati", flag: "🇮🇳" },
    { code: "pa", name: "Punjabi", flag: "🇮🇳" },
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "fr", name: "French", flag: "🇫🇷" },
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "zh", name: "Chinese", flag: "🇨🇳" },
    { code: "ja", name: "Japanese", flag: "🇯🇵" },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: loginEmail, password: loginPassword }),
      });

      if (response.ok) {
        window.location.href = "/";
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      setError("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Get user location first
      const location = await new Promise<{latitude: number, longitude: number}>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation not supported"));
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            // Continue without location if user denies
            resolve({ latitude: 0, longitude: 0 });
          }
        );
      });

      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          firstName,
          lastName,
          phoneNumber: `${countryCode}${phoneNumber}`,
          latitude: location.latitude,
          longitude: location.longitude,
          language,
        }),
      });

      if (response.ok) {
        // Auto login after signup
        const loginResponse = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username: signupEmail, password: signupPassword }),
        });

        if (loginResponse.ok) {
          window.location.href = "/";
        } else {
          setError("Signup successful, but login failed");
        }
      } else {
        const data = await response.json();
        setError(data.message || "Signup failed");
      }
    } catch (err) {
      setError("Signup failed");
    } finally {
      setIsLoading(false);
    }
  };
  const features = [
    {
      icon: Sun,
      title: "Smart Weather Forecasting",
      description: "AI-powered meteorological analysis providing 14-day precision forecasts with field-level accuracy.",
      subFeatures: ["Micro-climate detection", "Storm prediction", "Frost warnings"],
      color: "text-amber-500",
      borderColor: "border-amber-500/50",
      shadowColor: "shadow-amber-500/20",
      gradient: "from-amber-500/10 to-orange-500/10",
      category: "Intelligence"
    },
    {
      icon: Wheat,
      title: "Crop Optimization Engine",
      description: "Machine learning algorithms analyze soil composition and historical yields to recommend profitable varieties.",
      subFeatures: ["Variety selection", "Planting schedules", "Yield prediction"],
      color: "text-emerald-600",
      borderColor: "border-emerald-500/50",
      shadowColor: "shadow-emerald-500/20",
      gradient: "from-emerald-500/10 to-green-500/10",
      category: "Optimization"
    },
    {
      icon: Droplets,
      title: "Precision Water Management",
      description: "Advanced irrigation scheduling based on soil moisture levels and crop water requirements.",
      subFeatures: ["Soil moisture tracking", "Irrigation scheduling", "Water efficiency"],
      color: "text-blue-600",
      borderColor: "border-blue-500/50",
      shadowColor: "shadow-blue-500/20",
      gradient: "from-blue-500/10 to-cyan-500/10",
      category: "Management"
    },
    {
      icon: Shield,
      title: "Disease & Pest Prevention",
      description: "Real-time monitoring and early detection systems using computer vision to prevent crop damage.",
      subFeatures: ["Early detection", "Treatment recommendations", "Outbreak prevention"],
      color: "text-red-600",
      borderColor: "border-red-500/50",
      shadowColor: "shadow-red-500/20",
      gradient: "from-red-500/10 to-rose-500/10",
      category: "Protection"
    },
    {
      icon: BarChart3,
      title: "Yield & Profit Analytics",
      description: "Comprehensive performance analytics with profit forecasting and ROI tracking.",
      subFeatures: ["Profit forecasting", "Cost analysis", "Performance metrics"],
      color: "text-purple-600",
      borderColor: "border-purple-500/50",
      shadowColor: "shadow-purple-500/20",
      gradient: "from-purple-500/10 to-indigo-500/10",
      category: "Analytics"
    },
    {
      icon: Satellite,
      title: "Satellite Field Monitoring",
      description: "Advanced satellite imagery analysis providing detailed insights into crop health from space.",
      subFeatures: ["Crop health mapping", "Growth monitoring", "Field analytics"],
      color: "text-teal-600",
      borderColor: "border-teal-500/50",
      shadowColor: "shadow-teal-500/20",
      gradient: "from-teal-500/10 to-cyan-500/10",
      category: "Monitoring"
    },
  ];

  return (
    <div 
      className="min-h-screen"
      style={{
        // Dynamic color variables based on background lightness
        // When lightness is 1 (Day), text is dark (0% lightness)
        // When lightness is 0.2 (Night), text is light (100% lightness)
        // We use CSS calc to interpolate
        ['--foreground' as any]: '220 10% calc((1 - var(--current-lightness, 1)) * 100%)',
        ['--muted-foreground' as any]: '220 10% calc((1 - var(--current-lightness, 1)) * 70% + 15%)',
        ['--card-foreground' as any]: '220 10% calc((1 - var(--current-lightness, 1)) * 100%)',
        // Also adapt background color for cards to ensure contrast
        ['--background' as any]: '220 20% calc(var(--current-lightness, 1) * 100%)',
      } as React.CSSProperties}
    >
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <GrowingCropsBackground />
        <div className="container relative z-10 mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-6">
              <AdaptiveLogo size="xl" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground transition-colors duration-300" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              Agri-Forecast
            </h1>
            <p className="text-xl md:text-2xl mb-4 text-muted-foreground font-light transition-colors duration-300">
              AI-Powered Agricultural Platform
            </p>
            {/* <p className="text-lg mb-8 text-muted-foreground max-w-2xl mx-auto">
              Empowering farmers with real-time weather insights, AI-driven crop predictions,
              and 24/7 intelligent assistance for better agricultural decisions.
            </p> */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Card id="login" className="w-full max-w-md bg-background/40 backdrop-blur-xl border-white/20 shadow-2xl transition-colors duration-300">
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-muted/40">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>
                  <TabsContent value="login">
                    <CardHeader>
                      <CardTitle>Login to Agri-Forecast</CardTitle>
                      <CardDescription className="text-foreground/80">
                        Enter your email and password to access your account
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                          <Label htmlFor="login-email">Email</Label>
                          <Input
                            id="login-email"
                            type="email"
                            className="bg-background/50 border-primary/20 focus:bg-background/80 transition-colors"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="login-password">Password</Label>
                          <Input
                            id="login-password"
                            type="password"
                            className="bg-background/50 border-primary/20 focus:bg-background/80 transition-colors"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <Button type="submit" className="w-full" disabled={isLoading}>
                          {isLoading ? "Logging in..." : "Login"}
                        </Button>
                      </form>
                    </CardContent>
                  </TabsContent>
                  <TabsContent value="signup">
                    <CardHeader>
                      <CardTitle>Sign Up for Agri-Forecast</CardTitle>
                      <CardDescription>
                        Create your account to get started
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                           We'll request your location to provide accurate weather data and crop recommendations for your farm.
                        </p>
                      </div>
                      <form onSubmit={handleSignup} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                              id="firstName"
                              type="text"
                              placeholder="Yogesh"
                              className="bg-background/50 border-primary/20 focus:bg-background/80 transition-colors"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              id="lastName"
                              type="text"
                              placeholder="V"
                              className="bg-background/50 border-primary/20 focus:bg-background/80 transition-colors"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="signup-email">Email</Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="yogesh@gmail.com"
                            className="bg-background/50 border-primary/20 focus:bg-background/80 transition-colors"
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="phoneNumber">Phone Number</Label>
                          <div className="flex gap-2">
                            <Select value={countryCode} onValueChange={setCountryCode}>
                              <SelectTrigger className="w-[140px] bg-background/50 border-primary/20 focus:bg-background/80 transition-colors">
                                <SelectValue placeholder="Code" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {countryCodes.map((country) => (
                                  <SelectItem key={country.code} value={country.dial_code}>
                                    <span className="mr-2">{country.flag}</span>
                                    {country.dial_code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              id="phoneNumber"
                              type="tel"
                              placeholder="1234567890"
                              className="flex-1 bg-background/50 border-primary/20 focus:bg-background/80 transition-colors"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Please select your country code for SMS verification.
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="language">Preferred Language</Label>
                          <Select value={language} onValueChange={setLanguage}>
                            <SelectTrigger className="bg-background/50 border-primary/20 focus:bg-background/80 transition-colors">
                              <SelectValue placeholder="Select Language" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {languages.map((lang) => (
                                <SelectItem key={lang.code} value={lang.code}>
                                  <span className="mr-2">{lang.flag}</span>
                                  {lang.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            AI responses and notifications will be in this language.
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="signup-password">Password</Label>
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="••••••••"
                            className="bg-background/50 border-primary/20 focus:bg-background/80 transition-colors"
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            required
                          />
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <Button type="submit" className="w-full" disabled={isLoading}>
                          {isLoading ? "Signing up..." : "Sign Up"}
                        </Button>
                      </form>
                    </CardContent>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section - Lifecycle Design */}
      <section id="features" className="py-20 md:py-32 relative overflow-hidden">
        {/* Nature Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 left-[10%] text-green-500/10"
          >
            <Leaf className="w-24 h-24" />
          </motion.div>
          <motion.div 
            animate={{ y: [0, 30, 0], rotate: [0, -10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-40 right-[5%] text-emerald-500/10"
          >
            <Sprout className="w-32 h-32" />
          </motion.div>
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 right-[20%] text-yellow-500/10"
          >
            <Sun className="w-16 h-16" />
          </motion.div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          {/* Section Header */}
          <div className="text-center max-w-5xl mx-auto mb-16 md:mb-24">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <div className="inline-block relative">
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-black mb-4 leading-tight">
                  <span className="bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                    Smart Farm
                  </span>
                  <br />
                  <span className="text-[hsl(var(--foreground))] transition-colors duration-700">
                    Lifecycle
                  </span>
                </h2>
              </div>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-xl md:text-2xl text-[hsl(var(--muted-foreground))] leading-relaxed max-w-4xl mx-auto font-light transition-colors duration-700"
            >
              Experience the complete agricultural transformation journey through our 
              <span className="font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"> AI-powered ecosystem</span>
            </motion.p>
          </div>

          {/* Responsive Layout Container */}
          <div className="relative">
            
            {/* Mobile/Tablet View (Vertical Timeline) */}
            <div className="lg:hidden space-y-12 relative">
              {/* Vertical Line */}
              <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500/30 via-emerald-500/50 to-teal-500/30 rounded-full transition-all duration-700"></div>
              
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative pl-24 pr-4"
                >
                  {/* Node on Line */}
                  {/* <div className={`
                    absolute left-8 top-8 w-4 h-4 -ml-2 rounded-full border-4 border-[hsl(var(--background))] transition-colors duration-700
                    ${feature.color.replace('text-', 'bg-')} shadow-lg z-10
                  `}></div> */}
                  
                  {/* Number Bubble */}
                  <div className={`
                    absolute left-0 top-4 w-16 h-16 rounded-2xl 
                    bg-gradient-to-br ${feature.gradient} backdrop-blur-sm
                    border border-[hsl(var(--foreground))]/20 transition-colors duration-700
                    flex items-center justify-center shadow-sm
                  `}>
                    <span className={`text-2xl font-bold ${feature.color}`}>{index + 1}</span>
                  </div>

                  {/* Content Card */}
                  <div className={`
                    p-6 rounded-3xl bg-[hsl(var(--background))]/50 backdrop-blur-md
                    border border-[hsl(var(--foreground))]/10 shadow-sm transition-colors duration-700
                    hover:shadow-md
                  `}>
                    <div className="mb-3">
                      <span className={`text-xs font-bold uppercase tracking-wider ${feature.color} mb-1 block`}>
                        {feature.category}
                      </span>
                      <h3 className="text-2xl font-black text-[hsl(var(--foreground))] leading-tight transition-colors duration-700">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-[hsl(var(--muted-foreground))] mb-4 text-sm leading-relaxed transition-colors duration-700">
                      {feature.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {feature.subFeatures.map((sub, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-[hsl(var(--background))]/80 border border-[hsl(var(--foreground))]/10 text-[hsl(var(--muted-foreground))] transition-colors duration-700">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Desktop View (Circular Lifecycle) */}
            <div className="hidden lg:block relative h-[800px] w-full max-w-6xl mx-auto">
              {/* Central Hub */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  viewport={{ once: true }}
                  className="w-48 h-48 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl relative z-20"
                >
                  <div className="text-center text-white">
                    <Brain className="w-12 h-12 mx-auto mb-2 opacity-90" />
                    <div className="font-black text-xl tracking-wider">AI CORE</div>
                  </div>
                  {/* Pulse Rings */}
                  <div className="absolute inset-0 rounded-full border-4 border-green-400/30 animate-ping" style={{ animationDuration: '3s' }}></div>
                  <div className="absolute -inset-4 rounded-full border border-green-300/20 animate-spin" style={{ animationDuration: '10s' }}></div>
                </motion.div>
              </div>

              {/* Feature Circles */}
              {features.map((feature, index) => {
                const angle = (index * 60) - 90;
                // Use percentage based positioning for responsiveness
                const radius = 38; // % from center
                const x = 50 + (Math.cos((angle * Math.PI) / 180) * radius);
                const y = 50 + (Math.sin((angle * Math.PI) / 180) * radius);
                
                return (
                  <motion.div
                    key={index}
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 + (index * 0.1) }}
                    viewport={{ once: true }}
                    className="absolute w-64 h-64 -ml-32 -mt-32 group"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    {/* Connection Line */}
                    <svg className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2 pointer-events-none overflow-visible" style={{ zIndex: -1 }}>
                      <motion.line
                        x1="50%" y1="50%"
                        x2={50 - (Math.cos((angle * Math.PI) / 180) * 120) + "%"} // Connect to center hub edge roughly
                        y2={50 - (Math.sin((angle * Math.PI) / 180) * 120) + "%"}
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        initial={{ pathLength: 0, opacity: 0 }}
                        whileInView={{ pathLength: 1, opacity: 0.4 }}
                        transition={{ duration: 1, delay: 1 }}
                      />
                      <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.5" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Circle Content */}
                    <div className={`
                      relative w-full h-full rounded-full
                      bg-[hsl(var(--foreground))]/5 backdrop-blur-md
                      border border-[hsl(var(--foreground))]/20
                      hover:bg-[hsl(var(--foreground))]/10 transition-all duration-700
                      ease-out
                      flex flex-col items-center justify-center text-center p-6
                      group-hover:scale-110 group-hover:shadow-2xl
                      ${feature.shadowColor}
                      overflow-hidden
                    `}>
                      {/* Large Background Number */}
                      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-9xl font-black opacity-5 ${feature.color} select-none pointer-events-none`}>
                        {index + 1}
                      </div>

                      {/* Category */}
                      <span className={`text-xs font-bold uppercase tracking-[0.2em] mb-2 ${feature.color} opacity-90`}>
                        {feature.category}
                      </span>

                      {/* Title */}
                      <h3 className="text-xl md:text-2xl font-black text-[hsl(var(--foreground))] mb-2 leading-tight z-10 transition-colors duration-700">
                        {feature.title.split(' ').map((word, i) => (
                          <span key={i} className="block">{word}</span>
                        ))}
                      </h3>
                      
                      {/* Decorative Line */}
                      <div className={`w-12 h-1 rounded-full bg-gradient-to-r ${feature.gradient} mt-2`}></div>

                      {/* Hover Details Overlay */}
                      <div className="absolute inset-0 rounded-full bg-[hsl(var(--background))]/95 backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700 flex flex-col items-center justify-center p-6 text-center z-20">
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3 font-medium transition-colors duration-700">
                          {feature.description}
                        </p>
                        <div className="flex flex-wrap justify-center gap-1">
                          {feature.subFeatures.slice(0, 2).map((sub, i) => (
                            <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-[hsl(var(--foreground))]/5 text-[hsl(var(--muted-foreground))] font-semibold transition-colors duration-700">
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

     

      {/* Footer */}
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Agri-Forecast. Powered by advanced AI and real-time weather data.
        </p>
      </div>
    </div>
  );
}

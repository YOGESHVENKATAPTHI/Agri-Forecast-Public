import { useAuth } from "@/hooks/useAuth";
import { useTranslationApi, getCachedTranslation } from "@/hooks/useTranslationApi";
import { useState, useEffect, useRef, useCallback } from "react";

export const translations = {
  en: {
    // Sidebar
    dashboard: "Dashboard",
    weather: "Weather",
    predictions: "Predictions",
    my_lands: "My Lands",
    ai_assistant: "AI Assistant",
    profile: "Profile",
    logout: "Logout",
    navigation: "Navigation",
    
    // Home / Dashboard
    welcome_back: "Welcome back",
    agri_overview: "Agricultural overview for",
    temperature: "Temperature",
    humidity: "Humidity",
    wind_speed: "Wind Speed",
    conditions: "Conditions",
    feels_like: "Feels like",
    relative_humidity: "Relative humidity",
    current_wind: "Current wind",
    location: "Location",
    recent_predictions: "Recent Predictions",
    crop_recommendations: "Crop Recommendations",
    ai_powered_insights: "AI-powered weather and farming insights",
    best_crops_location: "Best crops for your location and season",
    no_predictions_yet: "No predictions available yet",
    check_back_soon: "Check back soon for AI-powered insights",
    no_crop_recommendations: "No crop recommendations yet",
    ai_analyze_location: "Our AI will analyze your location and provide suggestions",
    
    // Weather
    weather_forecast: "Weather Forecast",
    daily_forecast: "Daily Forecast",
    weather_dashboard: "Weather Dashboard",
    advanced_agricultural_analysis: "Advanced agricultural weather analysis for",
    current_conditions: "Current Conditions",
    real_time_weather_data: "Real-time weather data from OpenWeather API",
    pressure: "Pressure",
    air_quality: "Air Quality",
    visibility: "Visibility",
    uv_index: "UV Index",
    good: "Good",
    current: "Current",
    hourly: "Hourly",
    seasonal: "Seasonal",
    historical: "Historical",
    agricultural: "Agricultural",
    drought: "Drought",
    analytics: "Analytics",
    agricultural_weather_indices: "Agricultural Weather Indices",
    agricultural_specific_metrics: "Agricultural-specific weather metrics for farming decisions",
    updated: "Updated",
    analysis_id: "Analysis ID",
    
    // Lands
    my_land_areas: "My Land Areas",
    manage_agricultural_lands: "Manage your agricultural lands with location-based AI analysis and insights",
    added: "Added",
    
    // Chat
    agri_forecast_ai: "Agri-Forecast AI",
    personal_agricultural_expert: "Your personal agricultural expert. Ask me anything about your crops, weather, or farming techniques.",
    rice_cultivation_plan: "Rice cultivation plan",
    wheat_fertilization: "Wheat fertilization",
    organic_farming_tips: "Organic farming tips",
    irrigation_methods: "Irrigation methods",
    soil_ph_guide: "Soil pH guide",
    weather_forecast_chat: "Weather forecast",
    ask_about_farm: "Ask about your farm...",
    ai_can_make_mistakes: "AI can make mistakes. Please verify important agricultural decisions.",
    
 
    land_location: "Land Location",
    search_and_select_land_location: "Search and select your land location on the map for AI-powered agricultural analysis",
    edit_land_area: "Edit Land Area",
    update_land_location_and_details: "Update your land location and details",
    
    // Weather Terms
    humidity_and_pressure: "Humidity & Pressure",
    seasonal_forecast: "Seasonal Forecast", 
    forecast_confidence: "Forecast Confidence",
    temperature_trends_for_today: "Temperature trends for today",
    
    // Chat Additional
    ask_about_your_farm: "Ask about your farm...",
    
    // Profile  
    personal_information: "Personal Information",
    account_details: "Account Details",
    
    // Predictions
    ai_predictions: "AI Predictions",
    enhanced_ai_predict: "Enhanced AI Predict",
    no_predictions_available: "No Predictions Available",
    smart_crop_recommendations: "Smart Crop Recommendations", 
    no_crop_recommendations_yet: "No Crop Recommendations Yet",
    try_enhanced_ai_predict_button: "Try the Enhanced AI Predict button for comprehensive predictions from multiple AI models.",
    use_enhanced_ai_predict_for_crops: "Use the Enhanced AI Predict button to get personalized crop recommendations based on weather forecasts and your location.",
    
    // Weather Additional Terms
    pest_pressure: "Pest Pressure",
    agricultural_specific_weather_metrics: "Agricultural-specific weather metrics for farming decisions",
    
    // More Predictions
    advanced_agricultural_forecasts_for: "Advanced agricultural forecasts for",
    powered_by_multiple_ai_models: "powered by multiple AI models",
    
    // More Weather
    refreshing: "Refreshing...",
    real_time: "Real-time",
    real_time_weather_data_description: "Real-time weather data with historical analysis and seasonal forecasts",
    
    // Weather Status and Indices
    heat_index: "Heat Index",
    irrigation_need: "Irrigation Need",
    frost_risk: "Frost Risk",
    soil_moisture: "Soil Moisture",
    precip_deficit: "Precip. Deficit",
    temp_anomaly: "Temp. Anomaly",
    
    // Status Levels
    moderate: "Moderate",
    low: "Low",
    high: "High",
    medium: "Medium",
    fair: "Fair",
    poor: "Poor",
    very_poor: "Very Poor",
    critical: "Critical",
    extreme: "Extreme",
    
    // Weather Details
    comfort: "Comfort",
    broken_clouds: "Broken clouds",
    feels: "Feels",
    relative: "Relative",
    from_normal: "from normal",
    below_normal: "Below normal",
    from_average: "From average",
    
    // Seasonal Forecast Terms
    six_month_seasonal_outlook: "6-month seasonal outlook using European Centre for Medium-Range Weather Forecasts model",
    based_on_ensemble_model: "Based on ensemble model runs from one of the world's most advanced weather prediction systems",
    based_on_ecmwf_seas5: "Based on ECMWF SEAS5 model",
    anomaly: "Anomaly",
    precipitation: "Precipitation",
    eto: "ETO",
    
    // Drought Monitoring
    drought_monitoring_prediction: "Drought Monitoring & Prediction",
    ai_powered_drought_analysis: "AI-powered drought analysis for",
    refresh_analysis: "Refresh Analysis",
    overview: "Overview",
    action_plan: "Action Plan",
    current_drought_risk: "Current Drought Risk",
    analysis_generated: "Analysis generated",
    risk_level: "Risk Level",
    pdsi_index: "PDSI Index",
    palmer_drought_severity: "Palmer Drought Severity",
    spi_index: "SPI Index",
    standardized_precipitation: "Standardized Precipitation",
    current_conditions_small: "Current Conditions",
    key_drought_indicators: "Key drought indicators and environmental metrics",
    
    // Home Page
    january: "January",
    february: "February",
    march: "March",
    april: "April",
    may: "May",
    june: "June",
    july: "July",
    august: "August",
    september: "September",
    october: "October",
    november: "November",
    

    
    // Profile
    language: "Language",
    notifications: "Notifications",
    farm_location: "Farm Location",
    crop_history: "Crop Recommendations History",
    your_account_details: "Your account details",
    your_registered_farm_coordinates: "Your registered farm coordinates and map view",
    your_previously_recommended_crops: "Your previously recommended crops",
    member_since: "Member since",
    email: "Email",
    phone: "Phone",
    no_location_data: "No location data available",
    
    // Common
    loading: "Loading...",
    error: "Error",
    save: "Save",
    cancel: "Cancel",
    

  },
  ta: {
    // Sidebar
    dashboard: "முகப்பு",
    weather: "வானிலை",
    predictions: "கணிப்புகள்",
    my_lands: "என் நிலங்கள்",
    ai_assistant: "AI உதவியாளர்",
    profile: "சுயவிவரம்",
    logout: "வெளியேறு",
    navigation: "வழிசெலுத்தல்",
    
    // Home / Dashboard
    welcome_back: "மீண்டும் வருக",
    agri_overview: "வேளாண் கண்ணோட்டம்",
    temperature: "வெப்பநிலை",
    humidity: "ஈரப்பதம்",
    wind_speed: "காற்றின் வேகம்",
    conditions: "வானிலை நிலை",
    feels_like: "உணர்கிறது",
    relative_humidity: "ஒப்பு ஈரப்பதம்",
    current_wind: "தற்போதைய காற்று",
    location: "இடம்",
    recent_predictions: "சமீபத்திய கணிப்புகள்",
    crop_recommendations: "பயிர் பரிந்துரைகள்",
    ai_powered_insights: "AI சக்தியுடன் கூடிய வானிலை மற்றும் விவசாய நுண்ணறிவுகள்",
    best_crops_location: "உங்கள் இடம் மற்றும் பருவத்திற்கான சிறந்த பயிர்கள்",
    no_predictions_yet: "இன்னும் கணிப்புகள் கிடைக்கவில்லை",
    check_back_soon: "AI சக்தியுடன் கூடிய நுண்ணறிவுகளுக்கு விரைவில் திரும்பி வாருங்கள்",
    no_crop_recommendations: "இன்னும் பயிர் பரிந்துரைகள் இல்லை",
    ai_analyze_location: "எங்கள் AI உங்கள் இடத்தை பகுப்பாய்வு செய்து பரிந்துரைகளை வழங்கும்",
    
    // Weather
    weather_forecast: "வானிலை முன்னறிவிப்பு",
    daily_forecast: "தினசரி முன்னறிவிப்பு",
    weather_dashboard: "வானிலை டாஷ்போர்டு",
    advanced_agricultural_analysis: "மேம்பட்ட வேளாண் வானிலை பகுப்பாய்வு",
    current_conditions: "தற்போதைய நிலைகள்",
    real_time_weather_data: "OpenWeather API இல் இருந்து நேரலை வானிலை தரவு",
    pressure: "அழுத்தம்",
    air_quality: "காற்றின் தரம்",
    visibility: "தெரிவுநிலை",
    uv_index: "UV குறியீடு",
    good: "நல்லது",
    current: "தற்போதைய",
    hourly: "மணிநேர",
    seasonal: "பருவகால",
    historical: "வரலாற்று",
    agricultural: "வேளாண்",
    drought: "வறட்சி",
    analytics: "பகுப்பாய்வு",
    agricultural_weather_indices: "வேளாண் வானிலை குறியீடுகள்",
    agricultural_specific_metrics: "விவசாய முடிவுகளுக்கான வேளாண் சார்ந்த வானிலை அளவீடுகள்",
    updated: "புதுப்பிக்கப்பட்டது",
    analysis_id: "பகுப்பாய்வு ID",
    
    // Lands
    my_land_areas: "என் நில பகுதிகள்",
    manage_agricultural_lands: "இடம் சார்ந்த AI பகுப்பாய்வு மற்றும் நுண்ணறிவுகளுடன் உங்கள் வேளாண் நிலங்களை நிர்வகிக்கவும்",
    add_land: "நிலம் சேர்க்கவும்",
    added: "சேர்க்கப்பட்டது",
    
    // Chat
    agri_forecast_ai: "Agri-Forecast AI",
    personal_agricultural_expert: "உங்கள் தனிப்பட்ட வேளாண் நிபுணர். உங்கள் பயிர்கள், வானிலை அல்லது விவசாய நுட்பங்களைப் பற்றி எதையும் கேளுங்கள்.",
    rice_cultivation_plan: "அரிசி சாகுபடி திட்டம்",
    wheat_fertilization: "கோதுமை உரமிடுதல்",
    organic_farming_tips: "இயற்கை விவசாய குறிப்புகள்",
    irrigation_methods: "நீர்ப்பாசன முறைகள்",
    soil_ph_guide: "மண் pH வழிகாட்டி",
    weather_forecast_chat: "வானிலை முன்னறிவிப்பு",
    ask_about_farm: "உங்கள் பண்ணையைப் பற்றி கேளுங்கள்...",
    ai_can_make_mistakes: "AI தவறுகள் செய்யலாம். முக்கியமான வேளாண் முடிவுகளை சரிபார்க்கவும்.",
    
    // Profile
    language: "மொழி",
    notifications: "அறிவிப்புகள்",
    farm_location: "பண்ணை இடம்",
    crop_history: "பயிர் பரிந்துரை வரலாறு",
    your_account_details: "உங்கள் கணக்கு விவரங்கள்",
    your_registered_farm_coordinates: "உங்கள் பதிவுசெய்யப்பட்ட பண்ணை ஒருங்கிணைப்புகள் மற்றும் வரைபட காட்சி",
    your_previously_recommended_crops: "உங்கள் முன்பு பரிந்துரைக்கப்பட்ட பயிர்கள்",
    member_since: "உறுப்பினராக இருந்து",
    email: "மின்னஞ்சல்",
    phone: "தொலைபேசி",
    no_location_data: "இடத் தரவு கிடைக்கவில்லை",
    confidence: "நம்பிக்கை",
    
    // Common
    loading: "ஏற்றுகிறது...",
    error: "பிழை",
    save: "சேமி",
    cancel: "ரத்து",
  },
  bn: {
    // Sidebar
    dashboard: "ড্যাশবোর্ড",
    weather: "আবহাওয়া",
    predictions: "পূর্বাভাস",
    my_lands: "আমার জমি",
    ai_assistant: "এআই সহকারী",
    profile: "প্রোফাইল",
    logout: "লগ আউট",
    navigation: "নেভিগেশন",
    
    // Home / Dashboard
    welcome_back: "স্বাগতম",
    agri_overview: "কৃষি ওভারভিউ",
    temperature: "তাপমাত্রা",
    humidity: "আর্দ্রতা",
    wind_speed: "বাতাসের গতি",
    conditions: "অবস্থা",
    feels_like: "অনুভূত হচ্ছে",
    relative_humidity: "আপেক্ষিক আর্দ্রতা",
    current_wind: "বর্তমান বাতাস",
    location: "অবস্থান",
    recent_predictions: "সাম্প্রতিক পূর্বাভাস",
    crop_recommendations: "ফসলের সুপারিশ",
    ai_powered_insights: "এআই চালিত আবহাওয়া এবং কৃষি অন্তর্দৃষ্টি",
    best_crops_location: "আপনার অবস্থান এবং মৌসুমের জন্য সেরা ফসল",
    no_predictions_yet: "এখনও কোনো পূর্বাভাস নেই",
    check_back_soon: "এআই চালিত অন্তর্দৃষ্টির জন্য শীঘ্রই ফিরে দেখুন",
    no_crop_recommendations: "এখনও কোনো ফসলের সুপারিশ নেই",
    ai_analyze_location: "আমাদের এআই আপনার অবস্থান বিশ্লেষণ করে সুপারিশ প্রদান করবে",
    
    // Weather
    weather_forecast: "আবহাওয়ার পূর্বাভাস",
    daily_forecast: "দৈনিক পূর্বাভাস",
    weather_dashboard: "আবহাওয়া ড্যাশবোর্ড",
    advanced_agricultural_analysis: "উন্নত কৃষি আবহাওয়া বিশ্লেষণ",
    current_conditions: "বর্তমান অবস্থা",
    real_time_weather_data: "OpenWeather API থেকে রিয়েল-টাইম আবহাওয়া ডেটা",
    pressure: "চাপ",
    air_quality: "বায়ুর মান",
    visibility: "দৃশ্যমানতা",
    uv_index: "UV সূচক",
    good: "ভাল",
    current: "বর্তমান",
    hourly: "ঘণ্টায়",
    seasonal: "ঋতুভিত্তিক",
    historical: "ঐতিহাসিক",
    agricultural: "কৃষি",
    drought: "খরা",
    analytics: "বিশ্লেষণ",
    agricultural_weather_indices: "কৃষি আবহাওয়া সূচক",
    agricultural_specific_metrics: "কৃষি সিদ্ধান্তের জন্য কৃষি-নির্দিষ্ট আবহাওয়া মেট্রিক্স",
    updated: "আপডেট হয়েছে",
    analysis_id: "বিশ্লেষণ ID",
    
    // Lands
    my_land_areas: "আমার জমির এলাকা",
    manage_agricultural_lands: "অবস্থান-ভিত্তিক এআই বিশ্লেষণ এবং অন্তর্দৃষ্টি সহ আপনার কৃষি জমি পরিচালনা করুন",
    added: "যোগ করা হয়েছে",
    
    // Chat
    agri_forecast_ai: "Agri-Forecast AI",
    personal_agricultural_expert: "আপনার ব্যক্তিগত কৃষি বিশেষজ্ঞ। আপনার ফসল, আবহাওয়া বা কৃষি কৌশল সম্পর্কে যেকোনো কিছু জিজ্ঞাসা করুন।",
    rice_cultivation_plan: "ধান চাষ পরিকল্পনা",
    wheat_fertilization: "গমের সার প্রয়োগ",
    organic_farming_tips: "জৈব চাষের টিপস",
    irrigation_methods: "সেচের পদ্ধতি",
    soil_ph_guide: "মাটির pH গাইড",
    weather_forecast_chat: "আবহাওয়ার পূর্বাভাস",
    ask_about_farm: "আপনার খামার সম্পর্কে জিজ্ঞাসা করুন...",
    ai_can_make_mistakes: "এআই ভুল করতে পারে। গুরুত্বপূর্ণ কৃষি সিদ্ধান্ত যাচাই করুন।",
    
    // Profile
    language: "ভাষা",
    notifications: "বিজ্ঞপ্তি",
    farm_location: "খামারের অবস্থান",
    crop_history: "ফসলের সুপারিশ ইতিহাস",
    your_account_details: "আপনার অ্যাকাউন্টের বিবরণ",
    your_registered_farm_coordinates: "আপনার নিবন্ধিত খামারের স্থানাঙ্ক এবং মানচিত্র দৃশ্য",
    your_previously_recommended_crops: "আপনার পূর্বে সুপারিশকৃত ফসল",
    member_since: "সদস্য হওয়ার তারিখ",
    email: "ইমেইল",
    phone: "ফোন",
    no_location_data: "কোনো অবস্থানের তথ্য নেই",
    confidence: "আস্থা",
    
    // Common
    loading: "লোড হচ্ছে...",
    error: "ত্রুটি",
    save: "সংরক্ষণ",
    cancel: "বাতিল",
    
    // Land Management
    add_land: "ভূমি যোগ করুন",
    adding: "যোগ করা হচ্ছে...",
    add_new_land_area: "নতুন ভূমি এলাকা যোগ করুন", 
    land_location: "ভূমির অবস্থান",
    search_and_select_land_location: "AI-চালিত কৃষি বিশ্লেষণের জন্য মানচিত্রে আপনার ভূমির অবস্থান খুঁজুন এবং নির্বাচন করুন",
    edit_land_area: "ভূমি এলাকা সম্পাদনা করুন",
    update_land_location_and_details: "আপনার ভূমির অবস্থান এবং বিবরণ আপডেট করুন",
  },
  
  // Add other languages
  hi: {
    // Sidebar
    dashboard: "डैशबोर्ड",
    weather: "मौसम",
    predictions: "भविष्यवाणियां",
    my_lands: "मेरी भूमि",
    ai_assistant: "AI सहायक",
    profile: "प्रोफ़ाइल",
    logout: "लॉग आउट",
    navigation: "नेवीगेशन",
    
    // Home / Dashboard
    welcome_back: "वापस स्वागत है",
    agri_overview: "कृषि अवलोकन",
    temperature: "तापमान",
    humidity: "आर्द्रता",
    wind_speed: "हवा की गति",
    conditions: "स्थितियां",
    feels_like: "जैसा लगता है",
    relative_humidity: "सापेक्ष आर्द्रता",
    current_wind: "वर्तमान हवा",
    location: "स्थान",
    recent_predictions: "हाल की भविष्यवाणियां",
    crop_recommendations: "फसल सिफारिशें",
    ai_powered_insights: "AI संचालित मौसम और कृषि अंतर्दृष्टि",
    best_crops_location: "आपके स्थान और मौसम के लिए सर्वोत्तम फसलें",
    no_predictions_yet: "अभी तक कोई भविष्यवाणी नहीं",
    check_back_soon: "AI संचालित अंतर्दृष्टि के लिए जल्द ही वापस देखें",
    no_crop_recommendations: "अभी तक कोई फसल सिफारिश नहीं",
    ai_analyze_location: "हमारा AI आपके स्थान का विश्लेषण करके सुझाव देगा",
    
    // Weather
    weather_forecast: "मौसम पूर्वानुमान",
    daily_forecast: "दैनिक पूर्वानुमान",
    weather_dashboard: "मौसम डैशबोर्ड",
    advanced_agricultural_analysis: "उन्नत कृषि मौसम विश्लेषण",
    current_conditions: "वर्तमान स्थितियां",
    real_time_weather_data: "OpenWeather API से रीयल-टाइम मौसम डेटा",
    pressure: "दबाव",
    air_quality: "वायु गुणवत्ता",
    visibility: "दृश्यता",
    uv_index: "UV सूचकांक",
    good: "अच्छा",
    current: "वर्तमान",
    hourly: "घंटे के हिसाब से",
    seasonal: "मौसमी",
    historical: "ऐतिहासिक",
    agricultural: "कृषि",
    drought: "सूखा",
    analytics: "विश्लेषण",
    agricultural_weather_indices: "कृषि मौसम सूचकांक",
    agricultural_specific_metrics: "कृषि निर्णयों के लिए कृषि-विशिष्ट मौसम मेट्रिक्स",
    updated: "अपडेट किया गया",
    analysis_id: "विश्लेषण ID",
    
    // Lands
    my_land_areas: "मेरे भूमि क्षेत्र",
    manage_agricultural_lands: "स्थान-आधारित AI विश्लेषण और अंतर्दृष्टि के साथ अपनी कृषि भूमि का प्रबंधन करें",
    add_land: "भूमि जोड़ें",
    added: "जोड़ा गया",
    
    // Chat
    agri_forecast_ai: "Agri-Forecast AI",
    personal_agricultural_expert: "आपका व्यक्तिगत कृषि विशेषज्ञ। अपनी फसलों, मौसम या कृषि तकनीकों के बारे में कुछ भी पूछें।",
    rice_cultivation_plan: "चावल की खेती की योजना",
    wheat_fertilization: "गेहूं का उर्वरीकरण",
    organic_farming_tips: "जैविक खेती के टिप्स",
    irrigation_methods: "सिंचाई के तरीके",
    soil_ph_guide: "मिट्टी pH गाइड",
    weather_forecast_chat: "मौसम पूर्वानुमान",
    ask_about_farm: "अपने खेत के बारे में पूछें...",
    ai_can_make_mistakes: "AI गलतियां कर सकता है। महत्वपूर्ण कृषि निर्णयों को सत्यापित करें।",
    
    // Profile
    language: "भाषा",
    notifications: "सूचनाएं",
    farm_location: "खेत का स्थान",
    crop_history: "फसल सिफारिश इतिहास",
    your_account_details: "आपके खाते की जानकारी",
    your_registered_farm_coordinates: "आपके पंजीकृत खेत के निर्देशांक और मानचित्र दृश्य",
    your_previously_recommended_crops: "आपकी पहले से सुझाई गई फसलें",
    member_since: "सदस्य बने",
    email: "ईमेल",
    phone: "फोन",
    no_location_data: "कोई स्थान डेटा उपलब्ध नहीं",
    confidence: "आत्मविश्वास",
    
    // Common
    loading: "लोड हो रहा है...",
    error: "त्रुटि",
    save: "सेव करें",
    cancel: "रद्द करें",
  },
  
  te: {
    // Sidebar
    dashboard: "డాష్‌బోర్డ్",
    weather: "వాతావరణం",
    predictions: "అంచనలు",
    my_lands: "నా భూములు",
    ai_assistant: "AI సహాయకుడు",
    profile: "ప్రొఫైల్",
    logout: "లాగ్ అవుట్",
    navigation: "నావిగేషన్",
    
    // Home / Dashboard
    welcome_back: "తిరిగి స్వాగతం",
    agri_overview: "వ్యవసాయ సమీక్ష",
    temperature: "ఉష్ణోగ్రత",
    humidity: "తేమ",
    wind_speed: "గాలి వేగం",
    conditions: "పరిస్థితులు",
    feels_like: "అనిపిస్తోంది",
    relative_humidity: "సాపేక్ష తేమ",
    current_wind: "ప్రస్తుత గాలి",
    location: "స్థానం",
    recent_predictions: "ఇటీవలి అంచనలు",
    crop_recommendations: "పంట సిఫార్సులు",
    ai_powered_insights: "AI శక్తితో కూడిన వాతావరణ మరియు వ్యవసాయ అంతర్దృష్టులు",
    best_crops_location: "మీ స్థానం మరియు సీజన్ కోసం ఉత్తమ పంటలు",
    no_predictions_yet: "ఇంకా అంచనలు లేవు",
    check_back_soon: "AI శక్తితో కూడిన అంతర్దృష్టుల కోసం త్వరలో చూడండి",
    no_crop_recommendations: "ఇంకా పంట సిఫార్సులు లేవు",
    ai_analyze_location: "మా AI మీ స్థానాన్ని విశ్లేషించి సిఫార్సులు అందిస్తుంది",
    
    // Weather
    weather_forecast: "వాతావరణ అంచనా",
    daily_forecast: "రోజువారీ అంచనా",
    weather_dashboard: "వాతావరణ డాష్‌బోర్డ్",
    advanced_agricultural_analysis: "అధునాతన వ్యవసాయ వాతావరణ విశ్లేషణ",
    current_conditions: "ప్రస్తుత పరిస్థితులు",
    real_time_weather_data: "OpenWeather API నుండి రియల్-టైమ్ వాతావరణ డేటా",
    pressure: "ఒత్తిడి",
    air_quality: "గాలి నాణ్యత",
    visibility: "దృశ్యమానత",
    uv_index: "UV సూచిక",
    good: "మంచిది",
    current: "ప్రస్తుత",
    hourly: "గంట వారీ",
    seasonal: "కాలానుగుణ",
    historical: "చారిత్రక",
    agricultural: "వ్యవసాయ",
    drought: "కరువు",
    analytics: "విశ్లేషణలు",
    agricultural_weather_indices: "వ్యవసాయ వాతావరణ సూచికలు",
    agricultural_specific_metrics: "వ్యవసాయ నిర్ణయాల కోసం వ్యవసాయ-నిర్దిష్ట వాతావరణ మెట్రిక్స్",
    updated: "అప్డేట్ చేయబడింది",
    analysis_id: "విశ్లేషణ ID",
    
    // Lands
    my_land_areas: "నా భూమి ప్రాంతాలు",
    manage_agricultural_lands: "స్థాన-ఆధారిత AI విశ్లేషణ మరియు అంతర్దృష్టులతో మీ వ్యవసాయ భూములను నిర్వహించండి",
    add_land: "భూమిని జోడించండి",
    added: "జోడించబడింది",
    
    // Chat
    agri_forecast_ai: "Agri-Forecast AI",
    personal_agricultural_expert: "మీ వ్యక్తిగత వ్యవసాయ నిపుణుడు. మీ పంటలు, వాతావరణం లేదా వ్యవసాయ పద్ధతుల గురించి ఏదైనా అడగండి.",
    rice_cultivation_plan: "వరి సాగు ప్రణాళిక",
    wheat_fertilization: "గోధుమ ఎరువుల అప్లికేషన్",
    organic_farming_tips: "సేంద్రీయ వ్యవసాయ చిట్కాలు",
    irrigation_methods: "నీటిపారుదల పద్ధతులు",
    soil_ph_guide: "మట్టి pH గైడ్",
    weather_forecast_chat: "వాతావరణ అంచనా",
    ask_about_farm: "మీ వ్యవసాయం గురించి అడగండి...",
    ai_can_make_mistakes: "AI తప్పులు చేయగలదు. ముఖ్యమైన వ్యవసాయ నిర్ణయాలను ధృవీకరించండి.",
    
    // Profile
    language: "భాష",
    notifications: "నోటిఫికేషన్లు",
    farm_location: "వ్యవసాయ స్థానం",
    crop_history: "పంట సిఫార్సు చరిత్ర",
    your_account_details: "మీ ఖాతా వివరాలు",
    your_registered_farm_coordinates: "మీ నమోదిత వ్యవసాయ కోఆర్డినేట్లు మరియు మ్యాప్ వీక్షణ",
    your_previously_recommended_crops: "మీరు గతంలో సిఫార్సు చేసిన పంటలు",
    member_since: "సభ్యుడు అయినప్పటి నుండి",
    email: "ఇమెయిల్",
    phone: "ఫోన్",
    no_location_data: "స్థాన డేటా అందుబాటులో లేదు",
    confidence: "విశ్వాసం",
    
    // Common
    loading: "లోడ్ అవుతోంది...",
    error: "లోపం",
    save: "సేవ్ చేయండి",
    cancel: "రద్దు చేయండి",
  },
  
  kn: {
    // Sidebar
    dashboard: "ಡಾಶ್‌ಬೋರ್ಡ್",
    weather: "ಹವಾಮಾನ",
    predictions: "ಮುನ್ನುಡಿಗಳು",
    my_lands: "ನನ್ನ ಭೂಮಿ",
    ai_assistant: "AI ಸಹಾಯಕ",
    profile: "ಪ್ರೊಫೈಲ್",
    logout: "ಲಾಗ್ ಔಟ್",
    navigation: "ನ್ಯಾವಿಗೇಷನ್",
    
    // Home / Dashboard
    welcome_back: "ಮತ್ತೆ ಸ್ವಾಗತ",
    agri_overview: "ಕೃಷಿ ಅವಲೋಕನ",
    temperature: "ತಾಪಮಾನ",
    humidity: "ಆರ್ದ್ರತೆ",
    wind_speed: "ಗಾಳಿಯ ವೇಗ",
    conditions: "ಪರಿಸ್ಥಿತಿಗಳು",
    feels_like: "ಅನಿಸುತ್ತದೆ",
    relative_humidity: "ಸಾಪೇಕ್ಷ ಆರ್ದ್ರತೆ",
    current_wind: "ಪ್ರಸ್ತುತ ಗಾಳಿ",
    location: "ಸ್ಥಳ",
    recent_predictions: "ಇತ್ತೀಚಿನ ಮುನ್ನುಡಿಗಳು",
    crop_recommendations: "ಬೆಳೆ ಶಿಫಾರಸುಗಳು",
    ai_powered_insights: "AI ಚಾಲಿತ ಹವಾಮಾನ ಮತ್ತು ಕೃಷಿ ಒಳನೋಟಗಳು",
    best_crops_location: "ನಿಮ್ಮ ಸ್ಥಳ ಮತ್ತು ಋತುವಿಗೆ ಉತ್ತಮ ಬೆಳೆಗಳು",
    no_predictions_yet: "ಇನ್ನೂ ಯಾವುದೇ ಮುನ್ನುಡಿಗಳಿಲ್ಲ",
    check_back_soon: "AI ಚಾಲಿತ ಒಳನೋಟಗಳಿಗಾಗಿ ಶೀಘ್ರದಲ್ಲೇ ಮರಳಿ ನೋಡಿ",
    no_crop_recommendations: "ಇನ್ನೂ ಯಾವುದೇ ಬೆಳೆ ಶಿಫಾರಸುಗಳಿಲ್ಲ",
    ai_analyze_location: "ನಮ್ಮ AI ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ವಿಶ್ಲೇಷಿಸಿ ಸಲಹೆಗಳನ್ನು ನೀಡುತ್ತದೆ",
    
    // Weather
    weather_forecast: "ಹವಾಮಾನ ಮುನ್ನೋಟ",
    daily_forecast: "ದೈನಂದಿನ ಮುನ್ನೋಟ",
    weather_dashboard: "ಹವಾಮಾನ ಡಾಶ್‌ಬೋರ್ಡ್",
    advanced_agricultural_analysis: "ಸುಧಾರಿತ ಕೃಷಿ ಹವಾಮಾನ ವಿಶ್ಲೇಷಣೆ",
    current_conditions: "ಪ್ರಸ್ತುತ ಪರಿಸ್ಥಿತಿಗಳು",
    real_time_weather_data: "OpenWeather API ನಿಂದ ನೈಜ ಸಮಯದ ಹವಾಮಾನ ಡೇಟಾ",
    pressure: "ಒತ್ತಡ",
    air_quality: "ಗಾಳಿಯ ಗುಣಮಟ್ಟ",
    visibility: "ದೃಶ್ಯತೆ",
    uv_index: "UV ಸೂಚ್ಯಂಕ",
    good: "ಒಳ್ಳೆಯದು",
    current: "ಪ್ರಸ್ತುತ",
    hourly: "ಗಂಟೆಗೆ",
    seasonal: "ಋತುಮಾನ",
    historical: "ಐತಿಹಾಸಿಕ",
    agricultural: "ಕೃಷಿ",
    drought: "ಬರ",
    analytics: "ವಿಶ್ಲೇಷಣೆ",
    agricultural_weather_indices: "ಕೃಷಿ ಹವಾಮಾನ ಸೂಚ್ಯಂಕಗಳು",
    agricultural_specific_metrics: "ಕೃಷಿ ನಿರ್ಧಾರಗಳಿಗಾಗಿ ಕೃಷಿ-ನಿರ್ದಿಷ್ಟ ಹವಾಮಾನ ಮೆಟ್ರಿಕ್ಸ್",
    updated: "ನವೀಕರಿಸಲಾಗಿದೆ",
    analysis_id: "ವಿಶ್ಲೇಷಣೆ ID",
    
    // Lands
    my_land_areas: "ನನ್ನ ಭೂಮಿ ಪ್ರದೇಶಗಳು",
    manage_agricultural_lands: "ಸ್ಥಳ-ಆಧಾರಿತ AI ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಒಳನೋಟಗಳೊಂದಿಗೆ ನಿಮ್ಮ ಕೃಷಿ ಭೂಮಿಯನ್ನು ನಿರ್ವಹಿಸಿ",
    add_land: "ಭೂಮಿ ಸೇರಿಸಿ",
    added: "ಸೇರಿಸಲಾಗಿದೆ",
    
    // Chat
    agri_forecast_ai: "Agri-Forecast AI",
    personal_agricultural_expert: "ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಕೃಷಿ ತಜ್ಞ. ನಿಮ್ಮ ಬೆಳೆಗಳು, ಹವಾಮಾನ ಅಥವಾ ಕೃಷಿ ತಂತ್ರಗಳ ಬಗ್ಗೆ ಏನನ್ನಾದರೂ ಕೇಳಿ.",
    rice_cultivation_plan: "ಅಕ್ಕಿ ಕೃಷಿ ಯೋಜನೆ",
    wheat_fertilization: "ಗೋಧಿ ರಸಗೊಬ್ಬರ",
    organic_farming_tips: "ಸಾವಯವ ಕೃಷಿ ಸುಳಿವುಗಳು",
    irrigation_methods: "ನೀರಾವರಿ ವಿಧಾನಗಳು",
    soil_ph_guide: "ಮಣ್ಣಿನ pH ಮಾರ್ಗದರ್ಶಿ",
    weather_forecast_chat: "ಹವಾಮಾನ ಮುನ್ನೋಟ",
    ask_about_farm: "ನಿಮ್ಮ ಫಾರ್ಮ್ ಬಗ್ಗೆ ಕೇಳಿ...",
    ai_can_make_mistakes: "AI ತಪ್ಪುಗಳನ್ನು ಮಾಡಬಹುದು. ಮುಖ್ಯ ಕೃಷಿ ನಿರ್ಧಾರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
    
    // Profile
    language: "ಭಾಷೆ",
    notifications: "ಅಧಿಸೂಚನೆಗಳು",
    farm_location: "ಫಾರ್ಮ್ ಸ್ಥಳ",
    crop_history: "ಬೆಳೆ ಶಿಫಾರಸು ಇತಿಹಾಸ",
    your_account_details: "ನಿಮ್ಮ ಖಾತೆಯ ವಿವರಗಳು",
    your_registered_farm_coordinates: "ನಿಮ್ಮ ನೋಂದಾಯಿತ ಫಾರ್ಮ್ ನಿರ್ದೇಶಾಂಕಗಳು ಮತ್ತು ನಕ್ಷೆ ನೋಟ",
    your_previously_recommended_crops: "ನಿಮ್ಮ ಹಿಂದಿನ ಶಿಫಾರಸು ಮಾಡಿದ ಬೆಳೆಗಳು",
    member_since: "ಸದಸ್ಯರಾಗಿರುವುದು",
    email: "ಇಮೇಲ್",
    phone: "ಫೋನ್",
    no_location_data: "ಯಾವುದೇ ಸ್ಥಳ ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ",
    confidence: "ವಿಶ್ವಾಸ",
    
    // Common
    loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
    error: "ದೋಷ",
    save: "ಉಳಿಸಿ",
    cancel: "ರದ್ದುಮಾಡಿ",
  },
  
  ml: {
    // Sidebar
    dashboard: "ഡാഷ്‌ബോർഡ്",
    weather: "കാലാവസ്ഥ",
    predictions: "പ്രവചനങ്ങൾ",
    my_lands: "എന്റെ ഭൂമി",
    ai_assistant: "AI അസിസ്റ്റന്റ്",
    profile: "പ്രൊഫൈൽ",
    logout: "ലോഗ് ഔട്ട്",
    navigation: "നാവിഗേഷൻ",
    
    // Home / Dashboard
    welcome_back: "വീണ്ടും സ്വാഗതം",
    agri_overview: "കാർഷിക അവലോകനം",
    temperature: "താപനില",
    humidity: "ആർദ്രത",
    wind_speed: "കാറ്റിന്റെ വേഗത",
    conditions: "അവസ്ഥകൾ",
    feels_like: "തോന്നുന്നത്",
    relative_humidity: "ആപേക്ഷിക ആർദ്രത",
    current_wind: "നിലവിലെ കാറ്റ്",
    location: "സ്ഥാനം",
    recent_predictions: "സമീപകാല പ്രവചനങ്ങൾ",
    crop_recommendations: "വിള ശുപാർശകൾ",
    ai_powered_insights: "AI പവർ ചെയ്ത കാലാവസ്ഥാ കാർഷിക ഇൻസൈറ്റുകൾ",
    best_crops_location: "നിങ്ങളുടെ സ്ഥലത്തിനും സീസണിനും അനുയോജ്യമായ വിളകൾ",
    no_predictions_yet: "ഇതുവരെ പ്രവചനങ്ങളൊന്നുമില്ല",
    check_back_soon: "AI പവർ ചെയ്ത ഇൻസൈറ്റുകൾക്കായി ഉടൻ തിരികെ വരിക",
    no_crop_recommendations: "ഇതുവരെ വിള ശുപാർശകളൊന്നുമില്ല",
    ai_analyze_location: "ഞങ്ങളുടെ AI നിങ്ങളുടെ സ്ഥലം വിശകലനം ചെയ്ത് ശുപാർശകൾ നൽകും",
    
    // Weather
    weather_forecast: "കാലാവസ്ഥാ പ്രവചനം",
    daily_forecast: "ദൈനംദിന പ്രവചനം",
    weather_dashboard: "കാലാവസ്ഥാ ഡാഷ്‌ബോർഡ്",
    advanced_agricultural_analysis: "വിപുലമായ കാർഷിക കാലാവസ്ഥാ വിശകലനം",
    current_conditions: "നിലവിലെ അവസ്ഥകൾ",
    real_time_weather_data: "OpenWeather API യിൽ നിന്നുള്ള റിയൽ ടൈം കാലാവസ്ഥാ ഡാറ്റ",
    pressure: "മർദ്ദം",
    air_quality: "വായുവിന്റെ ഗുണനിലവാരം",
    visibility: "ദൃശ്യതാ നില",
    uv_index: "UV സൂചിക",
    good: "നല്ലത്",
    current: "നിലവിലെ",
    hourly: "മണിക്കൂർ തോറും",
    seasonal: "ഋതുകാല",
    historical: "ചരിത്രപരമായ",
    agricultural: "കാർഷിക",
    drought: "വരൾച്ച",
    analytics: "അനലിറ്റിക്സ്",
    agricultural_weather_indices: "കാർഷിക കാലാവസ്ഥാ സൂചികകൾ",
    agricultural_specific_metrics: "കാർഷിക തീരുമാനങ്ങൾക്കായുള്ള കൃഷി-നിർദ്ദിഷ്ട കാലാവസ്ഥാ മെട്രിക്സ്",
    updated: "അപ്ഡേറ്റ് ചെയ്തു",
    analysis_id: "വിശകലന ID",
    
    // Lands
    my_land_areas: "എന്റെ ഭൂമി പ്രദേശങ്ങൾ",
    manage_agricultural_lands: "ലൊക്കേഷൻ-ബേസ്ഡ് AI വിശകലനവും ഇൻസൈറ്റുകളും ഉപയോഗിച്ച് നിങ്ങളുടെ കാർഷിക ഭൂമി കൈകാര്യം ചെയ്യുക",
    add_land: "ഭൂമി ചേർക്കുക",
    added: "ചേർത്തു",
    
    // Chat
    agri_forecast_ai: "Agri-Forecast AI",
    personal_agricultural_expert: "നിങ്ങളുടെ വ്യക്തിഗത കാർഷിക വിദഗ്ധൻ. നിങ്ങളുടെ വിളകൾ, കാലാവസ്ഥ, അല്ലെങ്കിൽ കാർഷിക സാങ്കേതികതകൾ എന്തിനെക്കുറിച്ചും ചോദിക്കുക.",
    rice_cultivation_plan: "നെല്ല് കൃഷി പദ്ധതി",
    wheat_fertilization: "ഗോതമ്പ് വളം",
    organic_farming_tips: "ഓർഗാനിക് കൃഷി ടിപ്പുകൾ",
    irrigation_methods: "ജലസേചന രീതികൾ",
    soil_ph_guide: "മണ്ണിന്റെ pH ഗൈഡ്",
    weather_forecast_chat: "കാലാവസ്ഥാ പ്രവചനം",
    ask_about_farm: "നിങ്ങളുടെ ഫാമിനെക്കുറിച്ച് ചോദിക്കുക...",
    ai_can_make_mistakes: "AI തെറ്റുകൾ വരുത്തിയേക്കാം. പ്രധാനപ്പെട്ട കാർഷിക തീരുമാനങ്ങൾ പരിശോധിക്കുക.",
    
    // Profile
    language: "ഭാഷ",
    notifications: "അറിയിപ്പുകൾ",
    farm_location: "ഫാം ലൊക്കേഷൻ",
    crop_history: "വിള ശുപാർശ ചരിത്രം",
    your_account_details: "നിങ്ങളുടെ അക്കൗണ്ട് വിവരങ്ങൾ",
    your_registered_farm_coordinates: "നിങ്ങളുടെ രജിസ്റ്റർ ചെയ്ത ഫാം കോ-ഓർഡിനേറ്റുകളും മാപ്പ് വ്യൂവും",
    your_previously_recommended_crops: "നിങ്ങൾ മുമ്പ് ശുപാർശ ചെയ്ത വിളകൾ",
    member_since: "അംഗമായത്",
    email: "ഇമെയിൽ",
    phone: "ഫോൺ",
    no_location_data: "ലൊക്കേഷൻ ഡാറ്റ ലഭ്യമല്ല",
    confidence: "ആത്മവിശ്വാസം",
    
    // Common
    loading: "ലോഡ് ചെയ്യുന്നു...",
    error: "പിശക്",
    save: "സേവ് ചെയ്യുക",
    cancel: "റദ്ദാക്കുക",
  },
  
  mr: {
    // Common sections in Marathi - implementing key terms
    dashboard: "डॅशबोर्ड",
    weather: "हवामान",
    predictions: "अंदाज",
    my_lands: "माझी जमीन",
    ai_assistant: "AI सहायक",
    profile: "प्रोफाइल",
    logout: "लॉग आउट",
    navigation: "नेव्हिगेशन",
    welcome_back: "परत स्वागत",
    agri_overview: "शेतकी विहंगावलोकन",
    temperature: "तापमान",
    humidity: "आर्द्रता",
    wind_speed: "वाऱ्याचा वेग",
    conditions: "परिस्थिती",
    loading: "लोड होत आहे...",
    error: "त्रुटी",
    save: "जतन करा",
    cancel: "रद्द करा",
    // Add other essential translations...
    location: "स्थान",
    language: "भाषा",
    notifications: "सूचना",
    farm_location: "शेताचे स्थान",
    crop_history: "पीक शिफारस इतिहास",
  },
  
  gu: {
    // Common sections in Gujarati
    dashboard: "ડેશબોર્ડ",
    weather: "હવામાન",
    predictions: "આગાહીઓ",
    my_lands: "મારી જમીન",
    ai_assistant: "AI સહાયક",
    profile: "પ્રોફાઈલ",
    logout: "લોગ આઉટ",
    navigation: "નેવિગેશન",
    welcome_back: "પાછા આવવા બદલ સ્વાગત",
    agri_overview: "કૃષિ અવલોકન",
    temperature: "તાપમાન",
    humidity: "ભેજ",
    wind_speed: "પવનની ઝડપ",
    conditions: "સ્થિતિ",
    loading: "લોડ થઈ રહ્યું છે...",
    error: "ત્રુટિ",
    save: "સાચવો",
    cancel: "રદ કરો",
    location: "સ્થાન",
    language: "ભાષા",
    notifications: "સૂચનાઓ",
    farm_location: "ખેતરનું સ્થાન",
    crop_history: "પાક ભલામણ ઇતિહાસ",
  },
  
  pa: {
    // Common sections in Punjabi
    dashboard: "ਡੈਸ਼ਬੋਰਡ",
    weather: "ਮੌਸਮ",
    predictions: "ਭਵਿੱਖਬਾਣੀਆਂ",
    my_lands: "ਮੇਰੀ ਜ਼ਮੀਨ",
    ai_assistant: "AI ਸਹਾਇਕ",
    profile: "ਪ੍ਰੋਫਾਇਲ",
    logout: "ਲਾਗ ਆਊਟ",
    navigation: "ਨੈਵੀਗੇਸ਼ਨ",
    welcome_back: "ਵਾਪਸ ਜੀ ਆਇਆਂ ਨੂੰ",
    agri_overview: "ਖੇਤੀਬਾੜੀ ਝਲਕ",
    temperature: "ਤਾਪਮਾਨ",
    humidity: "ਨਮੀ",
    wind_speed: "ਹਵਾ ਦੀ ਰਫ਼ਤਾਰ",
    conditions: "ਸਥਿਤੀਆਂ",
    loading: "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...",
    error: "ਗਲਤੀ",
    save: "ਸੇਵ ਕਰੋ",
    cancel: "ਰੱਦ ਕਰੋ",
    location: "ਸਥਾਨ",
    language: "ਭਾਸ਼ਾ",
    notifications: "ਸੂਚਨਾਵਾਂ",
    farm_location: "ਖੇਤ ਦਾ ਸਥਾਨ",
    crop_history: "ਫਸਲ ਸਿਫਾਰਿਸ਼ ਇਤਿਹਾਸ",
  },
  
  es: {
    // Spanish translations
    dashboard: "Panel de Control",
    weather: "Clima",
    predictions: "Predicciones",
    my_lands: "Mis Tierras",
    ai_assistant: "Asistente IA",
    profile: "Perfil",
    logout: "Cerrar Sesión",
    navigation: "Navegación",
    welcome_back: "Bienvenido de nuevo",
    agri_overview: "Resumen Agrícola",
    temperature: "Temperatura",
    humidity: "Humedad",
    wind_speed: "Velocidad del Viento",
    conditions: "Condiciones",
    loading: "Cargando...",
    error: "Error",
    save: "Guardar",
    cancel: "Cancelar",
    location: "Ubicación",
    language: "Idioma",
    notifications: "Notificaciones",
    farm_location: "Ubicación de la Granja",
    crop_history: "Historial de Recomendaciones de Cultivos",
  },
  
  fr: {
    // French translations
    dashboard: "Tableau de Bord",
    weather: "Météo",
    predictions: "Prédictions",
    my_lands: "Mes Terres",
    ai_assistant: "Assistant IA",
    profile: "Profil",
    logout: "Se Déconnecter",
    navigation: "Navigation",
    welcome_back: "Bon retour",
    agri_overview: "Aperçu Agricole",
    temperature: "Température",
    humidity: "Humidité",
    wind_speed: "Vitesse du Vent",
    conditions: "Conditions",
    loading: "Chargement...",
    error: "Erreur",
    save: "Sauvegarder",
    cancel: "Annuler",
    location: "Emplacement",
    language: "Langue",
    notifications: "Notifications",
    farm_location: "Emplacement de la Ferme",
    crop_history: "Historique des Recommandations de Culture",
  },
  
  de: {
    // German translations
    dashboard: "Dashboard",
    weather: "Wetter",
    predictions: "Vorhersagen",
    my_lands: "Meine Länder",
    ai_assistant: "KI-Assistent",
    profile: "Profil",
    logout: "Abmelden",
    navigation: "Navigation",
    welcome_back: "Willkommen zurück",
    agri_overview: "Landwirtschaftlicher Überblick",
    temperature: "Temperatur",
    humidity: "Luftfeuchtigkeit",
    wind_speed: "Windgeschwindigkeit",
    conditions: "Bedingungen",
    loading: "Laden...",
    error: "Fehler",
    save: "Speichern",
    cancel: "Abbrechen",
    location: "Standort",
    language: "Sprache",
    notifications: "Benachrichtigungen",
    farm_location: "Farmstandort",
    crop_history: "Ernteempfehlungshistorie",
  },
  
  zh: {
    // Chinese translations
    dashboard: "仪表板",
    weather: "天气",
    predictions: "预测",
    my_lands: "我的土地",
    ai_assistant: "AI助手",
    profile: "个人资料",
    logout: "登出",
    navigation: "导航",
    welcome_back: "欢迎回来",
    agri_overview: "农业概览",
    temperature: "温度",
    humidity: "湿度",
    wind_speed: "风速",
    conditions: "条件",
    loading: "加载中...",
    error: "错误",
    save: "保存",
    cancel: "取消",
    location: "位置",
    language: "语言",
    notifications: "通知",
    farm_location: "农场位置",
    crop_history: "作物推荐历史",
  },
  
  ja: {
    // Japanese translations
    dashboard: "ダッシュボード",
    weather: "天気",
    predictions: "予測",
    my_lands: "私の土地",
    ai_assistant: "AIアシスタント",
    profile: "プロフィール",
    logout: "ログアウト",
    navigation: "ナビゲーション",
    welcome_back: "おかえりなさい",
    agri_overview: "農業概要",
    temperature: "気温",
    humidity: "湿度",
    wind_speed: "風速",
    conditions: "条件",
    loading: "読み込み中...",
    error: "エラー",
    save: "保存",
    cancel: "キャンセル",
    location: "場所",
    language: "言語",
    notifications: "通知",
    farm_location: "農場の場所",
    crop_history: "作物推奨履歴",
  }
};

export function useTranslation() {
  const { user } = useAuth();
  const language = user?.language || 'en';
  const { translateText, translateBatch, isTranslating, translationError } = useTranslationApi();
  const [translationVersion, setTranslationVersion] = useState(0);
  const missingTranslations = useRef<string[]>([]);
  const processingTranslations = useRef<Set<string>>(new Set());
  const translationTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const t = (key: keyof typeof translations['en']) => {
    // Always start with English text as the source of truth
    const enText = translations['en'][key] || key;
    
    // If language is English, just return it
    if (language === 'en') return enText;
    
    // Check cache for translation
    const cached = getCachedTranslation(enText, language);
    if (cached) return cached;
    
    // If not cached and not already processing, queue for translation
    if (!missingTranslations.current.includes(enText) && !processingTranslations.current.has(enText)) {
      missingTranslations.current.push(enText);
      
      // Use debounced batch processing to prevent immediate re-renders
      if (translationTimeout.current) {
        clearTimeout(translationTimeout.current);
      }
      
      translationTimeout.current = setTimeout(() => {
        processBatch();
      }, 100); // 100ms debounce
    }
    
    // Return empty string to hide untranslated text while loading
    // The global loader will be visible because we'll trigger translation
    return ""; 
  };
  
  const processBatch = useCallback(async () => {
    if (missingTranslations.current.length > 0) {
      const textsToTranslate = [...missingTranslations.current];
      missingTranslations.current = []; // Clear immediately to prevent duplicates
      
      // Mark these texts as being processed
      textsToTranslate.forEach(text => processingTranslations.current.add(text));
      
      try {
        await translateBatch(textsToTranslate, 'en');
        // Force re-render to show new translations
        setTranslationVersion(v => v + 1);
      } catch (error) {
        console.error('Translation batch processing failed:', error);
      } finally {
        // Remove from processing set
        textsToTranslate.forEach(text => processingTranslations.current.delete(text));
      }
    }
  }, [translateBatch]);
  
  // Dynamic translation for unknown keys or runtime content
  const tDynamic = async (text: string, sourceLanguage: string = 'en') => {
    return await translateText(text, sourceLanguage);
  };
  
  // Batch translation for arrays of text
  const tBatch = async (texts: string[], sourceLanguage: string = 'en') => {
    return await translateBatch(texts, sourceLanguage);
  };

  return { 
    t, 
    tDynamic, 
    tBatch, 
    language, 
    isTranslating, 
    translationError 
  };
}

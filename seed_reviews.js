require('dotenv').config();
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    name: String,
    instaId: String,
    message: String,
    rating: { type: Number, default: 5 },
    avatar: { type: String, default: "" },
    date: { type: Date, default: Date.now }
});

const Review = mongoose.model('Review', reviewSchema);

// 🌸 Flower, Nature & Sunset DPs (Classic Indian Social Profiles)
const FLOWER_PHOTOS = [
    "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=150&auto=format&fit=crop&q=80", // Red Rose
    "https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=150&auto=format&fit=crop&q=80", // Sunflower
    "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=150&auto=format&fit=crop&q=80", // Lotus
    "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=150&auto=format&fit=crop&q=80", // Jasmine
    "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=150&auto=format&fit=crop&q=80", // Hibiscus
    "https://images.unsplash.com/photo-1496062031456-07b8f162a322?w=150&auto=format&fit=crop&q=80", // Sunset
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=150&auto=format&fit=crop&q=80", // Mountains
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&auto=format&fit=crop&q=80"  // Beach
];

// 🏎️ Big Luxury & Sports Cars (Thar, G-Wagon, BMW, Mustang, Porsche, Audi, Mercedes)
const CAR_PHOTOS = [
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=150&auto=format&fit=crop&q=80", // Thar 4x4
    "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=150&auto=format&fit=crop&q=80", // G-Wagon
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=150&auto=format&fit=crop&q=80", // BMW M
    "https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=150&auto=format&fit=crop&q=80", // Mustang
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=150&auto=format&fit=crop&q=80", // Porsche
    "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=150&auto=format&fit=crop&q=80", // Audi R8
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=150&auto=format&fit=crop&q=80", // Blue Sports Car
    "https://images.unsplash.com/photo-1555353540-64580b51c258?w=150&auto=format&fit=crop&q=80", // Matte Black Supercar
    "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=150&auto=format&fit=crop&q=80"  // Luxury Sedan
];

// 🇮🇳 Real Female Portraits (Indian Women / Creators)
const FEMALE_PHOTOS = [
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80", // Professional woman
    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80", // Indian woman
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80", // Young designer
    "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80", // Smiling woman
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80", // Creative woman
    "https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&auto=format&fit=crop&q=80", // Cheerful creator
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"  // Modern portrait
];

// 🇮🇳 Real Male Portraits (Indian Men / Creators / Founders)
const MALE_PHOTOS = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80", // Young guy
    "https://images.unsplash.com/photo-1614289371518-722f2615943d?w=150&auto=format&fit=crop&q=80", // Indian guy portrait
    "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=150&auto=format&fit=crop&q=80", // Smiling guy
    "https://images.unsplash.com/photo-1607346256330-dee7af15f7c5?w=150&auto=format&fit=crop&q=80", // Corporate founder
    "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=150&auto=format&fit=crop&q=80", // Young creator
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=150&auto=format&fit=crop&q=80", // Professional
    "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80"  // Bearded entrepreneur
];

const rawReviews = [
    // --- 5 STARS (96 Reviews) ---
    // [Male + Cars / Male Faces]
    { name: "Aman Sharma", role: "Fitness Trainer • Jaipur", rating: 5, message: "VibeSphere completely transformed my fitness brand! The landing page speed and booking workflow is next-level. Highly recommended! 🔥", avatar: CAR_PHOTOS[0] },
    { name: "Devendra Choudhary", role: "Real Estate Consultant • Jaipur", rating: 5, message: "VibeSphere Media ki team ka kaam sach me magical hai. Website ka look, animations aur speed dono zabardast hain! 🚀", avatar: CAR_PHOTOS[1] },
    { name: "Yuvraj Singhania", role: "Auto Detailing Studio • Delhi", rating: 5, message: "Automotive customization preview tool with real-time price calculator. Exceptional UX design!", avatar: CAR_PHOTOS[2] },
    { name: "Jatin Ahuja", role: "Used Luxury Cars • Gurgaon", rating: 5, message: "Car brokerage portal with verified inspection report downloads. 10/10 service quality.", avatar: CAR_PHOTOS[3] },
    { name: "Abhinav Tiwari", role: "Gym & Crossfit Studio • Bhopal", rating: 5, message: "Gym membership subscription portal is butter smooth. Daily attendance tracking works great.", avatar: CAR_PHOTOS[4] },
    { name: "Kunal Kashyap", role: "Gaming Community Host • Pune", rating: 5, message: "Tournament registration system handled 2,000 teams simultaneously without crashing.", avatar: CAR_PHOTOS[5] },
    { name: "Harshil Vyas", role: "Performance Ads Lead (Tech Partner)", rating: 5, message: "Outsourced our client website development to VibeSphere. Zero headache, perfect delivery!", avatar: CAR_PHOTOS[6] },
    { name: "Nikhil Chawla", role: "Automotive Accessories • Delhi", rating: 5, message: "Automated WhatsApp alerts for test drive bookings work flawlessly. 5 stars without any hesitation!", avatar: CAR_PHOTOS[7] },
    { name: "Prateek Rawat", role: "Transport & Logistics • Indore", rating: 5, message: "Real-time truck fleet tracking and driver attendance dashboard works like a charm.", avatar: CAR_PHOTOS[8] },
    { name: "Rohan Kulkarni", role: "EdTech Startup • Pune", rating: 5, message: "Super fast turnaround! Harsh and his team delivered our student portal 2 days ahead of schedule.", avatar: CAR_PHOTOS[0] },
    { name: "Aditya Roy", role: "Financial Advisor • Gurgaon", rating: 5, message: "Real-time socket notifications and clean dark mode aesthetic. Exactly what I envisioned for our portal.", avatar: CAR_PHOTOS[2] },
    { name: "Karan Joharwal", role: "D2C Protein Brand • Chandigarh", rating: 5, message: "High converting landing page! Bounce rate dropped from 65% to 28% instantly.", avatar: CAR_PHOTOS[3] },
    { name: "Arjun Nambiar", role: "Wedding Films Studio • Kochi", rating: 5, message: "Video playback and high-res media loading speed is blazing fast. Truly world-class frontend engineering.", avatar: CAR_PHOTOS[4] },
    { name: "Gaurav Singhania", role: "Export House Director • Mumbai", rating: 5, message: "Handled our high-traffic international buyer launch with zero downtime. Solid backend setup.", avatar: CAR_PHOTOS[1] },
    { name: "Vikram Malhotra", role: "Luxury Properties • Delhi NCR", rating: 5, message: "The website design screams luxury. Sleek typography, smooth dark mode, and top-tier UI. Worth every penny.", avatar: MALE_PHOTOS[3] },
    { name: "Sameer Sheikh", role: "Cotton Fabric Mill • Surat", rating: 5, message: "Seamless payment gateway integration and automatic PDF invoices. Zero bugs, 100% satisfaction.", avatar: MALE_PHOTOS[0] },
    { name: "Tanmay Bhatia", role: "Accounting Software Builder", rating: 5, message: "Automated invoice generator with digital certificate verification is very impressive. Clients love it.", avatar: MALE_PHOTOS[1] },
    { name: "Zeeshan Khan", role: "Digital Lead, Creative Hive (Partner)", rating: 5, message: "Outsourced complex frontend & WhatsApp bot development to Harsh. Outstanding speed and quality!", avatar: MALE_PHOTOS[2] },
    { name: "Akash Mehra", role: "IT Consultant • Noida", rating: 5, message: "Clean codebase, well-documented API endpoints, and scalable MongoDB setup. Perfect developer handoff.", avatar: MALE_PHOTOS[6] },
    { name: "Farhan Siddiqui", role: "Tech Reviewer & YouTuber", rating: 5, message: "Super slick UI animations and dark theme. Harsh's eye for modern design and speed is exceptional.", avatar: MALE_PHOTOS[4] },
    { name: "Yashvardhan Rathore", role: "Heritage Haveli Resort • Udaipur", rating: 5, message: "Room showcase and booking portal designed with true royal elegance. Truly premium feel.", avatar: MALE_PHOTOS[5] },

    // [Female + Flowers / Female Faces]
    { name: "Pooja Verma", role: "Interior Stylist • Delhi NCR", rating: 5, message: "The live project tracking is so unique and transparent. Loved the real-time milestone updates on WhatsApp!", avatar: FLOWER_PHOTOS[0] },
    { name: "Sneha Patel", role: "Artisan Bakery • Ahmedabad", rating: 5, message: "Got our bakery website and automated ordering set up. Orders increased by 300% within the first month. Super grateful! 🍰", avatar: FLOWER_PHOTOS[1] },
    { name: "Ananya Iyer", role: "Lifestyle Influencer • Bangalore", rating: 5, message: "Instant tech support, crystal-clear communication and incredible UI execution. Best experience ever! ⭐⭐⭐⭐⭐", avatar: FLOWER_PHOTOS[2] },
    { name: "Kavita Rao", role: "Online Coaching Institute • Hyderabad", rating: 5, message: "Our students love the new learning portal! Clean passwordless login, instant access and zero lag.", avatar: FLOWER_PHOTOS[3] },
    { name: "Neha Gupta", role: "Bridal Makeup Studio • Jaipur", rating: 5, message: "Automated booking system works like a charm. Bridal appointments run smoothly on autopilot now!", avatar: FLOWER_PHOTOS[4] },
    { name: "Simran Kaur", role: "Designer Suits Boutique • Ludhiana", rating: 5, message: "Bohot pyara kaam kiya hai team ne! Mere boutique ka business 2x grow ho gaya website aane ke baad.", avatar: FLOWER_PHOTOS[0] },
    { name: "Ishita Kapoor", role: "Silver Jewelry Brand • Jaipur", rating: 5, message: "Jewelry showcase pages load like lightning. Excellent customer support even during late night launch hours.", avatar: FLOWER_PHOTOS[5] },
    { name: "Divya Joshi", role: "Architecture Studio • Mumbai", rating: 5, message: "Our interior design portfolio has never looked this aesthetic. Clients are impressed on every pitch call.", avatar: FLOWER_PHOTOS[6] },
    { name: "Pallavi Das", role: "Culinary Workshop Host • Kolkata", rating: 5, message: "Recipe blogs and masterclass subscriptions run effortlessly. Students love the clutter-free experience.", avatar: FLOWER_PHOTOS[7] },
    { name: "Shalini Saxena", role: "Yoga & Meditation Center", rating: 5, message: "So peaceful and clean design. International clients love paying via Razorpay & Stripe seamlessly.", avatar: FLOWER_PHOTOS[2] },
    { name: "Radhika Bansal", role: "Handicrafts & Decor Exporter", rating: 5, message: "Artisans from our cluster now sell directly worldwide through this portal. Thank you VibeSphere team!", avatar: FLOWER_PHOTOS[1] },
    { name: "Prerna Mukherjee", role: "Publishing House • Pune", rating: 5, message: "Interactive reader forum with clean dark mode. Very well executed by Harsh and team!", avatar: FLOWER_PHOTOS[3] },
    { name: "Meenakshi Sundaram", role: "Carnatic Music Academy • Chennai", rating: 5, message: "Online masterclass portal with video submissions is intuitive even for elderly students. Highly satisfied!", avatar: FLOWER_PHOTOS[4] },
    { name: "Geetika Sethi", role: "Podcast Host (100k Subs) • Delhi", rating: 5, message: "Podcast streaming site with automated RSS feed sync and clean waveform visuals. Loving it!", avatar: FLOWER_PHOTOS[5] },
    { name: "Payal Singhal", role: "Bridal Wear Designer • Mumbai", rating: 5, message: "Virtual bridal styling catalog with high-res zoom. Our NRI buyers are completely thrilled!", avatar: FLOWER_PHOTOS[0] },
    { name: "Shruti Mathur", role: "Travel Creator • Dehradun", rating: 5, message: "Travel itinerary planner with interactive maps and PDF export. Followers are obsessed with it!", avatar: FLOWER_PHOTOS[6] },
    { name: "Komal Chawla", role: "Organic Beauty Brand", rating: 5, message: "Custom quiz to recommend skincare products based on skin type. Conversions doubled instantly!", avatar: FLOWER_PHOTOS[1] },
    { name: "Nandini Sen", role: "Classical Dance School • Kolkata", rating: 5, message: "Online Kathak masterclass portal with student video uploads. Extremely reliable and fast.", avatar: FLOWER_PHOTOS[2] },
    { name: "Rhea Kapoor", role: "Pet Grooming & Care • Mumbai", rating: 5, message: "Pet vaccination tracker and vet appointment booking in one place. Pet parents love the simplicity!", avatar: FLOWER_PHOTOS[7] },
    { name: "Tanvi Sheth", role: "Handmade Scented Candles", rating: 5, message: "Aesthetic candle e-store with custom scent builder. Customer feedback has been 100% positive.", avatar: FLOWER_PHOTOS[0] },
    { name: "Sonali Mishra", role: "Boutique Homestay • Manali", rating: 5, message: "From wireframes to final deployment in under 5 days. Quality and professionalism at its peak!", avatar: FEMALE_PHOTOS[0] },
    { name: "Ritika Sen", role: "Graphic & Brand Designer • Kolkata", rating: 5, message: "My portfolio looks like an international showcase. Direct client inquiries through the portal have multiplied!", avatar: FEMALE_PHOTOS[2] },
    { name: "Priyanka Deshmukh", role: "Nutrition & Diet Consultant", rating: 5, message: "Super responsive team. They listened to every small detail and customized our client onboarding portal flawlessly.", avatar: FEMALE_PHOTOS[3] },
    { name: "Meera Nair", role: "Handloom Sarees • Kochi", rating: 5, message: "The aesthetic color palette and micro-interactions are immaculate. Hands down the sharpest tech team.", avatar: FEMALE_PHOTOS[4] },

    // [Clean Letter Initial Badges ("")]
    { name: "Bhavna Swaminathan", role: "South Indian Cafe • Delhi", rating: 5, message: "QR digital menu and table reservation increased our weekend walk-ins significantly. Outstanding work!", avatar: "" },
    { name: "Manish Aggarwal", role: "Tax & Financial Services • Indore", rating: 5, message: "Clients can securely upload documents directly to their dashboard. Saves our firm 15 hours every week.", avatar: "" },
    { name: "Alia Merchant", role: "Eco Bags & Accessories", rating: 5, message: "Fast loading, zero lag, and gorgeous lookbooks. Couldn't have asked for a better web team.", avatar: "" },
    { name: "Kishore Kumar", role: "Recording Studio • Chennai", rating: 5, message: "Audio player and album launch countdown worked smoothly during our major single release.", avatar: "" },
    { name: "Trisha Reddy", role: "Skin & Laser Clinic • Hyderabad", rating: 5, message: "Patient appointment workflow is seamless. WhatsApp reminders reduced clinic no-shows by 70%.", avatar: "" },
    { name: "Deepak Soni", role: "Gold Jewellers • Rajkot", rating: 5, message: "Live gold & silver price updates via WebSockets work in real-time with zero delay.", avatar: "" },
    { name: "Girish Hegde", role: "Organic Spices • Mysuru", rating: 5, message: "Direct farm-to-table delivery portal built exactly to our custom logistics requirements.", avatar: "" },
    { name: "Tarun Bajaj", role: "Destination Wedding Planner", rating: 5, message: "Wedding guest RSVP portal with instant QR digital entry passes made execution effortless.", avatar: "" },
    { name: "Siddharth Jain", role: "Investment Advisory • Mumbai", rating: 5, message: "Financial advisory client dashboard with encrypted magic link login is super secure. Great job!", avatar: "" },
    { name: "Varun Chopra", role: "Artisan Coffee Roastery", rating: 5, message: "Subscription coffee box store built with recurring billing. Online orders are up 250% in 60 days.", avatar: "" },
    { name: "Naveen Polishetty Fan Club", role: "Cinema Community Lead", rating: 5, message: "Community portal handles thousands of daily active users with lightning-fast response times.", avatar: "" },
    { name: "Rajeshwar Rao", role: "Ayurvedic Pharmacy • Kerala", rating: 5, message: "Ayurvedic consultation booking portal with auto WhatsApp consultation links. Pure magic! ✨", avatar: "" },
    { name: "Aakash Varma", role: "Web Tools Developer", rating: 5, message: "Clean modern design system with reusable UI components. Saved us weeks of development time.", avatar: "" },
    { name: "Lalit Sharma", role: "Hardware & Tools Distributor", rating: 5, message: "Wholesale catalog with instant quotation download. Simplest UI for all our regional dealers.", avatar: "" },
    { name: "Gaurang Pandya", role: "Mutual Fund Consultant • Surat", rating: 5, message: "SIP & Mutual fund return calculator integrated smoothly. Best developer team we've worked with.", avatar: "" },
    { name: "Bhupendra Singh", role: "Solar Rooftop EPC • Jaipur", rating: 5, message: "Solar rooftop cost estimation tool generates 50+ warm leads daily for our business.", avatar: "" },
    { name: "Smriti Irani Fan Club", role: "Youth Leadership Forum", rating: 5, message: "Event registration and live poll engine operated seamlessly during our national meet.", avatar: "" },
    { name: "Vikas Goyal", role: "Cloud Kitchen Network • Noida", rating: 5, message: "Multi-brand cloud kitchen menu aggregator with direct WhatsApp ordering. Super profitable!", avatar: "" },
    { name: "Anurag Kashyap", role: "Theatre Scripts Library", rating: 5, message: "Writer collaboration portal with live cursor sync and version control. Top-class execution!", avatar: "" },
    { name: "Juhi Parikh", role: "Packaging Design Studio", rating: 5, message: "Showcase portal with live client proofing flow. Harsh built it in record time.", avatar: "" },
    { name: "Mayank Trivedi", role: "Corporate Legal Firm", rating: 5, message: "Legal consultation portal with secure NDA signing and payment gateway. Very dependable!", avatar: "" },
    { name: "Esha Deol", role: "Corrugated Box Manufacturer", rating: 5, message: "Custom bulk box quotation system with instant calculator. Best tech partner!", avatar: "" },
    { name: "Kartik Somani", role: "Commercial Spaces • Gurgaon", rating: 5, message: "Virtual 360 property walkthrough portal with WhatsApp lead capture. Highly impressed.", avatar: "" },
    { name: "Deepali Vohra", role: "Custom Cakes • Chandigarh", rating: 5, message: "Automated festival pre-order slots system. Handled 500 orders without any double booking!", avatar: "" },
    { name: "Sachin Tendulkar Fan Hub", role: "Cricket Memorabilia Curator", rating: 5, message: "Archival cricket gallery and trivia quiz engine built with great passion and speed.", avatar: "" },
    { name: "Pooja Hegde", role: "Studio Pottery • Bangalore", rating: 5, message: "Workshop booking calendar and raw clay kit sales handled effortlessly. 5 stars for VibeSphere!", avatar: "" },
    { name: "Rishi Bajaj", role: "Stock Advisory • Mumbai", rating: 5, message: "Client portfolio tracking dashboard with automatic monthly PDF statements. Excellent engineering.", avatar: "" },
    { name: "Vidya Balan Fan Page", role: "Film Review Blog", rating: 5, message: "Clean editorial layout with dark mode toggle. Perfect reading experience for movie reviews.", avatar: "" },
    { name: "Himanshu Narang", role: "Brand Strategy Lead (White-label Client)", rating: 5, message: "VibeSphere handles the dev stack for our agency clients. Flawless execution every single time!", avatar: "" },
    { name: "Ira Singhal", role: "Personalized Stationery", rating: 5, message: "Stationery customizer with live foil stamping preview. Customer engagement has skyrocketed.", avatar: "" },
    { name: "Aman Preet Singh", role: "Men's Ethnic Wear • Amritsar", rating: 5, message: "Appointment booking and fabric matching assistant works super smoothly. Truly remarkable service.", avatar: "" },
    { name: "Kritika Saini", role: "Commercial Architect • Delhi", rating: 5, message: "High-end architecture portfolio showcasing blueprints and 3D renders with zero compression loss.", avatar: "" },
    { name: "Ashish Nanda", role: "Audiobook Production Studio", rating: 5, message: "Custom audio player portal with waveform visualization. Blown away by the performance.", avatar: "" },
    { name: "Lavanya Mohan", role: "Artisan Pastry Chain • Chennai", rating: 5, message: "Same-day cake delivery scheduler with live kitchen status tracker. Super hit among our customers!", avatar: "" },
    { name: "Anushka Talwar", role: "Media & PR Agency (Client Dev)", rating: 5, message: "PR media kit and press release distribution portal. Pitching to journalists is now effortless.", avatar: "" },
    { name: "Sunil Gavaskar Fan Club", role: "Sports Coaching Network", rating: 5, message: "Cricket coaching webinar registration and certificate issuance handled completely on autopilot.", avatar: "" },
    { name: "Garima Seth", role: "Certified Astro Gems • Jaipur", rating: 5, message: "Astrological gemstones portal with birth chart gemstone calculator. Phenomenal results!", avatar: "" },
    { name: "Zubin Mehta", role: "Violin & Piano Academy", rating: 5, message: "Western classical music student portal with audio submission reviews. Fantastic implementation.", avatar: "" },
    { name: "Monika Rawal", role: "Therapeutic Dietician", rating: 5, message: "Daily macro counter and meal plan download portal. Clients find it super easy to follow.", avatar: "" },
    { name: "Harish Chandra", role: "Organic Tea Exporter • Siliguri", rating: 5, message: "Direct Darjeeling tea export ordering portal. Payment integration works in multi-currencies.", avatar: "" },
    { name: "Bhavika Jha", role: "Govt Exam Prep Academy", rating: 5, message: "Interactive quiz system for competitive exam students with live leaderboard. Great work!", avatar: "" },
    { name: "Rupesh Agarwal", role: "Silk Sarees Wholesaler • Surat", rating: 5, message: "Surat textile bulk catalog with instant WhatsApp order placement. Highly recommended agency.", avatar: "" },
    { name: "Twinkle Khanna Fan Club", role: "Literary Circle Admin", rating: 5, message: "Book reviews and monthly reading challenge tracker runs with super fluid animations.", avatar: "" },
    { name: "Nilesh Panchal", role: "3D Product Visualization", rating: 5, message: "3D CAD file viewer and client revision tracker. Streamlined our entire freelance business.", avatar: "" },
    { name: "Aastha Grover", role: "Ayurvedic Oils • Rishikesh", rating: 5, message: "Product launch countdown with SMS/Email notifications brought 1,500 orders on day one!", avatar: "" },
    { name: "Saurabh Shukla", role: "Delhi Theatre Group", rating: 5, message: "Live drama show ticketing with seat map selection. Never faced any double booking issues.", avatar: "" },
    { name: "Komalpreet Kaur", role: "Bridal Mehendi Artist", rating: 5, message: "Bridal mehendi slot booking and design catalog with high-res photo gallery. Loving it!", avatar: "" },
    { name: "Virendra Sehwag Fans", role: "Sports Foundation Member", rating: 5, message: "Cricket coaching batch enrollment portal with online fee payment. Clean and lightning fast.", avatar: "" },
    { name: "Aparna Namboodiri", role: "Ayurveda Wellness Resort", rating: 5, message: "Ayurvedic wellness retreat package booking system with room selection. Splendid work.", avatar: "" },
    { name: "Shweta Tiwari", role: "Aroma Diffusers & Oils", rating: 5, message: "Essential oils custom kit builder with instant checkout. My customers love the interactive UI.", avatar: "" },
    { name: "Shreya Ghoshal Fan Club", role: "Community Moderator", rating: 5, message: "Fan engagement portal managed over 50,000 live visitors smoothly during single release. Kudos to VibeSphere!", avatar: "" },

    // --- 4 STARS (14 Reviews) ---
    { name: "Raghav Mehra", role: "Marketing Agency Head (White-label)", rating: 4, message: "Great agency with fast delivery. The UI is sleek and modern. Minor delay in onboarding form, but overall top quality!", avatar: CAR_PHOTOS[1] },
    { name: "Karan Bhasin", role: "Commercial Realtor • Noida", rating: 4, message: "Website design is truly impressive. Required one revision round for custom fonts, but the team handled it smoothly.", avatar: CAR_PHOTOS[0] },
    { name: "Simi Chadha", role: "Gourmet Bakery • Mumbai", rating: 4, message: "Very satisfied with the online menu and automated invoice generation. Support is super fast on WhatsApp.", avatar: FLOWER_PHOTOS[0] },
    { name: "Prashant Joshi", role: "FinTech Consultant • Bangalore", rating: 4, message: "Solid codebase and secure JWT auth. Delivery took 1 extra day due to custom payment rules, but the end result is rock solid.", avatar: MALE_PHOTOS[1] },
    { name: "Meghna Kapoor", role: "Pret Fashion Label • Jaipur", rating: 4, message: "Clean catalog layout with good mobile responsiveness. Would love more theme color options in the future.", avatar: FLOWER_PHOTOS[1] },
    { name: "Tanuj Rastogi", role: "Hardware Startup • Gurgaon", rating: 4, message: "The real-time client tracker is brilliant. Good communication and professional attitude throughout.", avatar: CAR_PHOTOS[2] },
    { name: "Aarti Saxena", role: "Pilates & Yoga Studio • Pune", rating: 4, message: "Class scheduling and Zoom link automation works like a charm. Very neat execution by Harsh and team.", avatar: FLOWER_PHOTOS[2] },
    { name: "Sanjay Nanda", role: "Ceramics & Tiles Importer", rating: 4, message: "B2B product showcase is very clear. Exporting client invoices to PDF is super fast and clean.", avatar: "" },
    { name: "Pooja Hegde Fan Club", role: "Media Fan Chapter", rating: 4, message: "Community portal loads quick and animations are butter smooth. Recommended for creator websites.", avatar: "" },
    { name: "Chetan Narang", role: "Eyewear D2C Brand", rating: 4, message: "Smooth Razorpay payment integration and clean order tracking. Great value for money.", avatar: CAR_PHOTOS[4] },
    { name: "Rashmi Dixit", role: "Corporate Events • Hyderabad", rating: 4, message: "Event ticketing and QR pass validation was easy to handle for our on-ground crew.", avatar: FLOWER_PHOTOS[3] },
    { name: "Harshvardhan Rana", role: "Security Systems • Delhi", rating: 4, message: "Solid agency architecture and fast database queries. Happy with the overall performance.", avatar: "" },
    { name: "Nandita Ray", role: "Modern Art Studio • Kolkata", rating: 4, message: "Art gallery looks modern and elegant. Setup was done in under a week. Keep it up!", avatar: FLOWER_PHOTOS[4] },
    { name: "Vivek Bindal", role: "Chartered Accountant • Delhi", rating: 4, message: "Secure client document upload portal works reliably. Good communication from tech support.", avatar: "" },

    // --- 3 STARS (3 Reviews) ---
    { name: "Abhay Kaushik", role: "Trek Organizer • Dehradun", rating: 3, message: "The final website looks great and runs smoothly, but weekend support response was a bit slow. Overall decent experience.", avatar: CAR_PHOTOS[0] },
    { name: "Siddhesh Pande", role: "Wooden Crafts • Nagpur", rating: 3, message: "Good design and clean interface. Took an extra round of revisions to get the mobile font sizes right.", avatar: FLOWER_PHOTOS[5] },
    { name: "Deepika Rathi", role: "Home Linens • Surat", rating: 3, message: "Portal is functional and looks professional. Payment gateway integration took slightly longer than estimated.", avatar: "" },

    // --- 2 STARS (1 Review) ---
    { name: "Tushar Goswami", role: "Wedding Photographer • Jaipur", rating: 2, message: "The final portfolio is clean, but delivery took 2 days longer than the initial estimate during festival rush.", avatar: CAR_PHOTOS[3] },

    // --- 1 STAR (1 Review) ---
    { name: "Manav Bhatnagar", role: "Management Consultant", rating: 1, message: "Initial onboarding had communication gap regarding custom requirements, though the team later resolved everything.", avatar: "" }
];

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

async function seed() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB!");

        console.log("Clearing previous reviews...");
        await Review.deleteMany({});

        console.log(`Shuffling and inserting ${rawReviews.length} 100% matched reviews...`);
        const shuffled = shuffle(rawReviews);
        const now = Date.now();
        const docs = shuffled.map((r, index) => ({
            name: r.name,
            instaId: r.role,
            message: r.message,
            rating: r.rating,
            avatar: r.avatar,
            date: new Date(now - (index + 1) * 16 * 60 * 60 * 1000)
        }));

        await Review.insertMany(docs);

        const totalCount = await Review.countDocuments();
        const allReviews = await Review.find();
        let totalStars = 0;
        allReviews.forEach(r => totalStars += r.rating);
        const avg = (totalStars / totalCount).toFixed(2);
        const avgRounded = (totalStars / totalCount).toFixed(1);

        console.log("\n==========================================");
        console.log(`✅ Total Reviews Seeded: ${totalCount}`);
        console.log(`⭐ Exact Average Rating: ${avg} / 5.0`);
        console.log(`⭐ Display Average Rating: ${avgRounded} / 5.0`);
        console.log("==========================================\n");

        process.exit(0);
    } catch (err) {
        console.error("Seeding error:", err);
        process.exit(1);
    }
}

seed();

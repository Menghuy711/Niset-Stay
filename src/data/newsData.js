import newsBanner1 from '../assets/images/news-banner-1.jpg';
import newsBanner2 from '../assets/images/news-banner-2.jpg';
import property1 from '../assets/images/property-1.jpg';
import property3 from '../assets/images/property-3.jpg';

// Topic-matched images for articles that aren't about housing/dorms.
// Sourced from Wikimedia Commons (freely licensed) since they don't have a
// dedicated event photo of their own.
const fujiPagodaImg = "https://commons.wikimedia.org/wiki/Special:FilePath/Chureito_Pagoda_and_Mount_Fuji.jpg";
const internationalStudentsImg = "https://commons.wikimedia.org/wiki/Special:FilePath/International_Students.jpg";
const aseanFlagsImg = "https://commons.wikimedia.org/wiki/Special:FilePath/ASEAN_Flags.jpg";
const solarPanelsImg = "https://commons.wikimedia.org/wiki/Special:FilePath/Rooftop_Solar_Panels.jpg";
const careerFairImg = "https://commons.wikimedia.org/wiki/Special:FilePath/Career_fair.JPG";

const newsData = [
  {
    id: 1,
    image: newsBanner1,
    category: "Scholarship",
    title: "DYNAMIC Entrepreneurial Course - Online Training Program",
    date: "July 15, 2026",
    excerpt: "This program focuses on developing an entrepreneurial mindset for all participants from every province across Cambodia. It aims to help learners understand how to start a new business.",
    badge: "Featured",
    author: "Niset Stay Team",
    readTime: "5 min read",
    tags: ["Entrepreneurship", "KOICA", "Online Training"],
    body: [
      { heading: "Course Overview", paragraphs: ["This program is an online training course that focuses on developing an entrepreneurial mindset for all participants from every province and city across Cambodia. It aims to help learners understand how to start a new business from scratch.", "The program has been designed for university students, startup teams, and aspiring entrepreneurs who want to turn their ideas into viable business ventures."] },
      { heading: "What You Will Gain", paragraphs: ["1. Transforming simple ideas into business opportunities. 2. Identifying real-life problems and recognizing opportunities in the market.", "3. Understanding the basics of creating a business project. 4. Team collaboration and leadership skills development. 5. Presenting their own business project ideas with confidence."] },
      { heading: "Program Structure", paragraphs: ["The program will be conducted 5 times online and 1 time in person. This blended approach ensures participants get both the flexibility of online learning and the hands-on experience of face-to-face workshops.", "Participants who complete the full program will receive a certificate of completion, which can strengthen their academic and professional portfolio."] },
      { heading: "How to Apply", paragraphs: ["Interested students should prepare a short motivation letter and their current student ID. Applications are processed on a rolling basis until all seats are filled.", "For any questions regarding eligibility or the application process, please reach out to the Niset Stay student support office during working hours."] }
    ]
  },
  {
    id: 2,
    image: newsBanner2,
    category: "Announcement",
    title: "Youth Delegates Selection for 50th SSEAYP Program",
    date: "June 20, 2026",
    excerpt: "The Ministry of Education is selecting 20 outstanding youth delegates to participate in the 50th Ship for Southeast Asian and Japanese Youth Program in Japan.",
    badge: "Deadline Soon",
    author: "Ministry of Education",
    readTime: "4 min read",
    tags: ["SSEAYP", "Youth Program", "Japan"],
    body: [
      { heading: "Announcement Overview", paragraphs: ["The Ministry of Education, Youth and Sport is selecting 20 outstanding youth delegates to participate in the 50th Ship for Southeast Asian and Japanese Youth Program (50th SSEAYP).", "This prestigious program brings together young leaders from Southeast Asia and Japan to foster mutual understanding, cultural exchange, and regional friendship."] },
      { heading: "Program Details", paragraphs: ["The program will take place from January 3 to February 5, 2027, in Japan, the Kingdom of Cambodia, Malaysia, and the Philippines. Participants will engage in cultural activities, country presentations, and institutional visits throughout the journey.", "This is a unique opportunity to represent Cambodia on an international stage and build lasting friendships with peers from across the region."] },
      { heading: "Eligibility Criteria", paragraphs: ["Candidates must be between 18 and 30 years old, actively involved in community or youth activities, and demonstrate strong communication and leadership skills.", "Applicants should also have a good command of English and a genuine interest in international cooperation and cultural exchange."] },
      { heading: "Application and Deadline", paragraphs: ["Apply here: https://forms.gle/xGdHAZuUxfaGLkpZ9", "The deadline is June 30, 2026 (by 5:00 PM). Late submissions will not be considered. We encourage all eligible youth to seize this once-in-a-lifetime opportunity."] }
    ]
  },
  {
    id: 3,
    image: property1,
    category: "Event",
    title: "Student Housing Open Day - Explore Your New Home",
    date: "June 10, 2026",
    excerpt: "Join us for an open day to explore our student accommodation options. Meet current residents and discover the amenities available.",
    badge: null,
    author: "Niset Stay Team",
    readTime: "3 min read",
    tags: ["Open Day", "Housing", "Campus Life"],
    body: [
      { heading: "A Day to Discover Your Future Home", paragraphs: ["Choosing the right place to live is one of the most important decisions in your student journey. That is why we are hosting our Student Housing Open Day to give you a firsthand experience of campus living.", "This is your chance to walk through the rooms, explore the common areas, and picture yourself living comfortably while you study."] },
      { heading: "What to Expect", paragraphs: ["Guided tours will be available every hour, led by our friendly residence team. You will see fully furnished rooms, study lounges, laundry facilities, and the community kitchen.", "Current residents will be on hand to share their honest experiences and answer questions about daily life in our accommodation."] },
      { heading: "Special Offers", paragraphs: ["Attendees who sign a lease during the Open Day will enjoy exclusive move-in incentives, including a reduced deposit and free utilities for the first month.", "Sic space is limited, so we recommend registering in advance to secure your tour slot."] }
    ]
  },
  {
    id: 4,
    image: fujiPagodaImg,
    category: "Scholarship",
    title: "Cambodia-Japan Exchange Program 2026",
    date: "May 28, 2026",
    excerpt: "Applications are now open for the annual exchange program. Students can experience Japanese culture and education for 3 months.",
    badge: "Open",
    author: "International Office",
    readTime: "6 min read",
    tags: ["Exchange", "Japan", "International"],
    body: [
      { heading: "A Gateway to Japanese Education", paragraphs: ["The Cambodia-Japan Exchange Program 2026 offers students a life-changing opportunity to experience Japanese culture and education firsthand for a full three months.", "Designed to strengthen academic ties between the two nations, the program combines intensive language study with cultural immersion activities."] },
      { heading: "Academic Experience", paragraphs: ["Participants will attend classes at a partner Japanese university, covering subjects such as Japanese language, business communication, and technology innovation.", "Weekly cultural excursions will take students to historic temples, modern tech districts, and traditional tea ceremonies, providing a well-rounded cultural experience."] },
      { heading: "Costs and Support", paragraphs: ["The program covers tuition fees, accommodation, and a daily stipend for meals. Participants are responsible for their own flights and personal expenses.", "A dedicated coordinator will support students throughout their stay, from visa application to cultural adjustment."] },
      { heading: "Eligibility and Application", paragraphs: ["Open to currently enrolled students with a minimum GPA of 2.5. Applicants must demonstrate genuine interest in Japanese culture.", "Submit your application, transcript, and a personal statement via the international office before the closing date in July."] }
    ]
  },
  {
    id: 5,
    image: property3,
    category: "News",
    title: "New Dormitory Building Opening Ceremony",
    date: "May 15, 2026",
    excerpt: "We are excited to announce the opening of our newest dormitory building with modern facilities and increased capacity for students.",
    badge: null,
    author: "Facilities Department",
    readTime: "4 min read",
    tags: ["Dormitory", "Facilities", "Campus"],
    body: [
      { heading: "A Milestone for Student Living", paragraphs: ["We are proud to announce the official opening of our newest dormitory building, a modern residence designed to provide comfortable and affordable living for our growing student community.", "The ceremonial ribbon-cutting was attended by faculty members, student representatives, and the wider campus community."] },
      { heading: "Modern Facilities", paragraphs: ["The new building features 120 fully furnished rooms, each equipped with high-speed internet, climate control, and study-friendly layouts.", "Shared spaces include a community kitchen, rooftop lounge with panoramic city views, fitness room, and round-the-clock security for residents' peace of mind."] },
      { heading: "Who Can Apply", paragraphs: ["Priority placement is given to first-year students and those coming from provinces outside Phnom Penh.", "Applications are now open through the student affairs office. We encourage interested students to apply early as demand is expected to be high."] }
    ]
  },
  {
    id: 6,
    image: internationalStudentsImg,
    category: "Event",
    title: "International Student Welcome Week",
    date: "May 1, 2026",
    excerpt: "A week-long orientation program for international students including campus tours, cultural activities, and networking sessions.",
    badge: null,
    author: "International Office",
    readTime: "3 min read",
    tags: ["International", "Orientation", "Networking"],
    body: [
      { heading: "Welcome to Our Community", paragraphs: ["International Student Welcome Week is a week-long orientation program designed to help new international students settle into campus life smoothly and confidently.", "From the moment you arrive, our team will be there to guide you through registration, visa documentation, and everything in between."] },
      { heading: "Program Highlights", paragraphs: ["Daily campus tours introduce you to classrooms, libraries, dining halls, and recreational facilities. Dedicated sessions cover academic expectations, student services, and local customs.", "Cultural evenings give you the chance to share your own traditions while learning about Khmer culture, food, and festivals."] },
      { heading: "Building Connections", paragraphs: ["Networking sessions pair you with a local buddy who will show you around the city and help you practice language skills.", "By the end of the week, you will have a circle of friends, a full understanding of campus life, and everything you need to start your semester with confidence."] }
    ]
  },
  {
    id: 7,
    image: aseanFlagsImg,
    category: "Scholarship",
    title: "ASEAN University Scholarship Program",
    date: "April 20, 2026",
    excerpt: "Full scholarship opportunities for undergraduate students from ASEAN member countries to study at partner universities.",
    badge: "Featured",
    author: "Scholarship Committee",
    readTime: "5 min read",
    tags: ["ASEAN", "Scholarship", "Undergraduate"],
    body: [
      { heading: "Regional Excellence, Global Opportunity", paragraphs: ["The ASEAN University Scholarship Program provides full scholarships for outstanding undergraduate students from ASEAN member countries to pursue their studies at partner universities.", "This initiative reflects our commitment to regional cooperation, academic excellence, and the development of the next generation of ASEAN leaders."] },
      { heading: "Scholarship Coverage", paragraphs: ["The scholarship covers full tuition, accommodation, monthly living allowance, and a one-time book and travel grant.", "Scholars will also have access to mentorship from senior academics and participation in regional leadership workshops."] },
      { heading: "Selection Criteria", paragraphs: ["Candidates are selected based on academic achievement, leadership potential, community involvement, and their vision for contributing to ASEAN regional development.", "A strong command of English and a clear statement of purpose are essential components of the application."] }
    ]
  },
  {
    id: 8,
    image: solarPanelsImg,
    category: "News",
    title: "Campus Sustainability Initiative Launch",
    date: "April 5, 2026",
    excerpt: "Our new sustainability program aims to reduce campus carbon footprint through renewable energy and green building practices.",
    badge: null,
    author: "Green Campus Committee",
    readTime: "4 min read",
    tags: ["Sustainability", "Environment", "Green Campus"],
    body: [
      { heading: "Building a Greener Campus", paragraphs: ["We are launching an ambitious Campus Sustainability Initiative to reduce our carbon footprint through renewable energy, waste reduction, and green building practices.", "The initiative reflects our belief that universities have a responsibility to lead by example in the fight against climate change."] },
      { heading: "Renewable Energy", paragraphs: ["New solar panels installed across campus rooftops will generate a significant share of our electricity needs, reducing reliance on non-renewable sources.", "Energy-efficient lighting and smart climate controls have been retrofitted in major buildings to cut consumption further."] },
      { heading: "Getting Everyone Involved", paragraphs: ["Students and staff are invited to join green clubs, participate in tree-planting days, and contribute recycling programs that turn campus waste into community resources.", "A sustainability dashboard will display live energy saving data, keeping everyone informed and motivated as we work toward a greener future together."] }
    ]
  },
  {
    id: 9,
    image: careerFairImg,
    category: "Event",
    title: "Student Career Fair 2026",
    date: "March 25, 2026",
    excerpt: "Connect with top employers and explore internship opportunities. Over 50 companies will be participating in this year's career fair.",
    badge: "Upcoming",
    author: "Career Services",
    readTime: "3 min read",
    tags: ["Career Fair", "Internships", "Employers"],
    body: [
      { heading: "Your Future Starts Here", paragraphs: ["Get ready to connect with top employers from the technology, finance, hospitality, and public sectors at the Student Career Fair 2026.", "With over 50 companies participating, this is the largest career fair we have ever organized, bringing unmatched opportunities directly to you."] },
      { heading: "What to Expect", paragraphs: ["Company booths will offer on-the-spot information about graduate roles and internships. Recruiters will conduct brief interviews and collect resumes during the event.", "Career workshops throughout the day will help you polish your CV, practice interview skills, and build a personal brand that stands out."] },
      { heading: "How to Prepare", paragraphs: ["Bring multiple copies of your updated resume and dress professionally. Prepare a concise self-introduction to make a strong first impression.", "Download the event guide to plan your route and target the employers that match your career interests before you arrive."] }
    ]
  }
];

export default newsData;
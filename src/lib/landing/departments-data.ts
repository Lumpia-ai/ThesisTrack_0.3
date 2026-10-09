export interface DepartmentData {
  id: string;
  name: string;
  description: string;
  mission: string;
  vision: string;
  icon: string;
  color: string;
  keyAreas: { title: string; description: string; icon: string }[];
  facilities: string[];
  programHighlights: string[];
  stats: { label: string; value: string }[];
  chartData: { year: string; completed: number; ongoing: number }[];
  logo?: string;
  secondaryColor?: string;
}

export const departmentsData: DepartmentData[] = [
  {
    id: "IT",
    name: "Bachelor of Science in Information Technology",
    description:
      "The Bachelor of Science in Information Technology program includes the study of the utilization of both hardware and software technologies involving planning, installing, customizing, operating, innovating, managing and administering, and maintaining information technology infrastructure that provides computing solutions to address the needs of an organization. The program instills to students the USTP graduate attributes that will prepare them to address various user needs involving but not limited to the selection, development, application, innovation, integration and management of computing technologies within an organization in local and/or global community. It gives emphasis on three identified area of specialization namely; Network Design and administration, Database and Information System, and Computer Vision and Image processing.",
    mission:
      "To produce globally competitive IT professionals equipped with cutting-edge technical skills, ethical values, and innovative mindsets capable of designing computing solutions that address organizational and societal needs in local and global communities.",
    vision:
      "A nationally recognized center of excellence in Information Technology education, producing graduates who drive digital transformation, technological innovation, and sustainable development across industries.",
    icon: "fas fa-laptop-code",
    color: "#FACC15",
    logo: "/department-logo/IT.png",
    keyAreas: [
      {
        title: "Network Design & Administration",
        description:
          "Planning, deploying, and managing enterprise-grade network infrastructures including LAN/WAN configuration, network security, server administration, and cloud networking solutions.",
        icon: "fas fa-network-wired",
      },
      {
        title: "Database & Information Systems",
        description:
          "Design, development, and administration of relational and non-relational database systems, data warehousing, business intelligence, and enterprise information management solutions.",
        icon: "fas fa-database",
      },
      {
        title: "Computer Vision & Image Processing",
        description:
          "Application of machine learning and deep learning techniques for image recognition, object detection, pattern analysis, and automated visual inspection systems.",
        icon: "fas fa-eye",
      },
      {
        title: "Software Development & Innovation",
        description:
          "Full-stack web and mobile application development using modern frameworks, agile methodologies, and DevOps practices to build scalable computing solutions for organizations.",
        icon: "fas fa-code",
      },
    ],
    facilities: [
      "Advanced Computer Laboratories with 120+ workstations",
      "Networking & Cybersecurity Laboratory",
      "Software Development & Testing Hub",
      "Computer Vision & AI Research Lab",
      "IoT and Embedded Systems Workshop",
    ],
    programHighlights: [
      "Three specialized tracks: Network Design, Database & Info Systems, and Computer Vision",
      "Capstone projects addressing real-world organizational computing needs",
      "Industry certification programs (Cisco, AWS, Oracle) integrated into curriculum",
      "Hands-on training in both hardware and software technologies",
      "Strong emphasis on USTP graduate attributes and professional ethics",
    ],
    stats: [
      { label: "Active Students", value: "480+" },
      { label: "Faculty Members", value: "32" },
      { label: "Capstones Completed", value: "172" },
      { label: "Specialization Tracks", value: "3" },
    ],
    chartData: [
      { year: "2023", completed: 45, ongoing: 12 },
      { year: "2024", completed: 52, ongoing: 18 },
      { year: "2025", completed: 60, ongoing: 25 },
      { year: "2026", completed: 15, ongoing: 85 },
    ],
  },
  {
    id: "MET",
    name: "Bachelor of Science in Manufacturing Engineering Technology",
    description:
      "This program provides graduates with solid knowledge and readily marketable skills in the area of manufacturing engineering. It prepares students foundation in sciences complemented by general technical courses in mechanical design and fabrication and in digital precision manufacturing.",
    mission:
      "To develop competent manufacturing engineering technologists with solid scientific foundations and industry-ready skills in mechanical design, fabrication, and digital precision manufacturing that meet global standards.",
    vision:
      "A leading manufacturing engineering technology program recognized for producing skilled graduates who advance innovation in mechanical design, fabrication processes, and modern precision manufacturing.",
    icon: "fas fa-industry",
    color: "#EF4444",
    logo: "/department-logo/met.png",
    keyAreas: [
      {
        title: "Mechanical Design & Fabrication",
        description:
          "Computer-aided design (CAD/CAM), engineering drawing interpretation, material selection, and fabrication techniques for manufacturing components and assemblies.",
        icon: "fas fa-drafting-compass",
      },
      {
        title: "Digital Precision Manufacturing",
        description:
          "CNC machining, computer-integrated manufacturing, 3D printing and additive manufacturing, and advanced metrology for high-precision production processes.",
        icon: "fas fa-cogs",
      },
      {
        title: "Materials Science & Testing",
        description:
          "Study of engineering materials including metals, polymers, and composites, along with destructive and non-destructive testing methods for quality assurance.",
        icon: "fas fa-microscope",
      },
      {
        title: "Industrial Process Optimization",
        description:
          "Lean manufacturing principles, production planning, quality control systems, and continuous improvement methodologies for efficient manufacturing operations.",
        icon: "fas fa-chart-line",
      },
    ],
    facilities: [
      "CNC Machining & Digital Manufacturing Lab",
      "Welding & Metal Fabrication Workshop",
      "CAD/CAM Design Studio with SolidWorks & AutoCAD",
      "Materials Testing & Quality Assurance Laboratory",
      "3D Printing & Additive Manufacturing Center",
    ],
    programHighlights: [
      "Strong foundation in sciences complemented by hands-on technical courses",
      "Readily marketable skills in modern manufacturing engineering",
      "Industry-aligned curriculum covering mechanical design and fabrication",
      "Exposure to digital precision manufacturing technologies",
      "Capstone projects solving real-world manufacturing challenges",
    ],
    stats: [
      { label: "Active Students", value: "350+" },
      { label: "Faculty Members", value: "28" },
      { label: "Capstones Completed", value: "125" },
      { label: "Lab Equipment Units", value: "150+" },
    ],
    chartData: [
      { year: "2023", completed: 30, ongoing: 10 },
      { year: "2024", completed: 38, ongoing: 15 },
      { year: "2025", completed: 42, ongoing: 20 },
      { year: "2026", completed: 5, ongoing: 60 },
    ],
  },
  {
    id: "TCM",
    name: "Bachelor of Science in Technology Communication Management",
    description:
      "The Bachelor of Science in Technology Communication Management program equips students with the knowledge and skills to manage technology-driven communication systems and processes. The program integrates principles of technology management, communication strategies, and information systems to prepare graduates who can lead organizations in leveraging modern communication technologies for operational excellence and strategic growth.",
    mission:
      "To develop competent technology communication managers who can effectively integrate communication technologies, manage information systems, and lead organizations toward digital transformation and operational efficiency.",
    vision:
      "A premier academic program in technology communication management that produces graduates capable of bridging technology and communication to drive innovation, organizational growth, and community development.",
    icon: "fas fa-broadcast-tower",
    color: "#10B981",
    logo: "/department-logo/tcm.png",
    keyAreas: [
      {
        title: "Technology Management",
        description:
          "Strategic planning, implementation, and management of technology resources within organizations, including technology assessment, adoption, and lifecycle management.",
        icon: "fas fa-sitemap",
      },
      {
        title: "Communication Systems & Networks",
        description:
          "Design and management of modern communication infrastructures including telecommunications, data networks, multimedia systems, and digital communication platforms.",
        icon: "fas fa-satellite-dish",
      },
      {
        title: "Information Systems Management",
        description:
          "Development and administration of information systems that support organizational decision-making, business process automation, and enterprise resource planning.",
        icon: "fas fa-server",
      },
      {
        title: "Digital Media & Content Strategy",
        description:
          "Management of digital content creation, multimedia production, social media strategies, and communication campaigns using modern technology platforms.",
        icon: "fas fa-photo-video",
      },
    ],
    facilities: [
      "Communication Technology Laboratory",
      "Digital Media Production Studio",
      "Network & Telecommunications Lab",
      "Information Systems Management Center",
      "Multimedia & Presentation Room",
    ],
    programHighlights: [
      "Interdisciplinary curriculum combining technology, communication, and management",
      "Hands-on training in modern communication technologies and platforms",
      "Capstone projects addressing technology communication challenges in organizations",
      "Industry partnerships for internship and practicum placements",
      "Development of leadership and strategic management competencies",
    ],
    stats: [
      { label: "Active Students", value: "280+" },
      { label: "Faculty Members", value: "22" },
      { label: "Capstones Completed", value: "105" },
      { label: "Industry Partners", value: "15" },
    ],
    chartData: [
      { year: "2023", completed: 25, ongoing: 5 },
      { year: "2024", completed: 32, ongoing: 8 },
      { year: "2025", completed: 40, ongoing: 12 },
      { year: "2026", completed: 10, ongoing: 45 },
    ],
  },
  {
    id: "ESM",
    name: "Bachelor of Science in Energy Systems and Management",
    description:
      "The program provides in-depth understanding of the different electrical machineries and modern industrial processes including wide range of systems, from simplest fuses and motors to sophisticated electronic computer interface boards, motor drives, programmable logic controller and solid-state devices. The students will develop the competencies to design, install, maintain electrical and electronic equipment, and perform preventive maintenance, identify or solve problems in machines used in modern industrial processes.",
    mission:
      "To produce highly skilled energy systems professionals with in-depth knowledge of electrical machineries, modern industrial processes, and the competencies to design, install, and maintain electrical and electronic systems for sustainable energy management.",
    vision:
      "A nationally recognized program in energy systems and management that leads innovation in electrical machinery, industrial automation, and sustainable energy solutions for modern industries.",
    icon: "fas fa-bolt",
    color: "#8B5CF6",
    logo: "/department-logo/esm.png",
    keyAreas: [
      {
        title: "Electrical Machineries & Motors",
        description:
          "Comprehensive study of electrical machines from basic fuses and motors to advanced motor drives, including AC/DC motors, generators, transformers, and their industrial applications.",
        icon: "fas fa-fan",
      },
      {
        title: "PLC & Industrial Automation",
        description:
          "Programming and integration of programmable logic controllers (PLCs), solid-state devices, and computer interface boards for automated control of modern industrial processes.",
        icon: "fas fa-microchip",
      },
      {
        title: "Power Systems & Energy Management",
        description:
          "Design and management of electrical power generation, distribution, and consumption systems, including renewable energy integration and energy efficiency optimization.",
        icon: "fas fa-plug",
      },
      {
        title: "Equipment Maintenance & Diagnostics",
        description:
          "Preventive and predictive maintenance strategies for electrical and electronic equipment, fault identification, troubleshooting, and solving problems in modern industrial machines.",
        icon: "fas fa-tools",
      },
    ],
    facilities: [
      "Electrical Machineries & Motor Drives Laboratory",
      "PLC & Industrial Automation Training Center",
      "Power Systems & Energy Management Lab",
      "Electronics & Solid-State Devices Workshop",
      "Equipment Maintenance & Diagnostics Center",
    ],
    programHighlights: [
      "In-depth training from basic fuses to sophisticated electronic computer interface boards",
      "Competency-based curriculum in design, installation, and maintenance of electrical systems",
      "Hands-on experience with PLCs, motor drives, and solid-state devices",
      "Preventive maintenance and industrial troubleshooting skills development",
      "Capstone projects solving real problems in modern industrial processes",
    ],
    stats: [
      { label: "Active Students", value: "220+" },
      { label: "Faculty Members", value: "18" },
      { label: "Capstones Completed", value: "91" },
      { label: "Lab Equipment Units", value: "200+" },
    ],
    chartData: [
      { year: "2023", completed: 20, ongoing: 8 },
      { year: "2024", completed: 28, ongoing: 12 },
      { year: "2025", completed: 35, ongoing: 15 },
      { year: "2026", completed: 8, ongoing: 40 },
    ],
  },
  {
    id: "NAME",
    name: "Bachelor of Science in Naval Architecture and Marine Engineering",
    description:
      "Bachelor of Science in Naval Architecture and Marine Engineering (BSNAME) is a 5-year program with a strong on systems engineering and engineering design. The program teaches the students the knowledge and provides experiences of the complete process of conception, design modeling, implementation, and operation of boats, ships, marine installations, and other complex systems together with deep theoretical knowledge in related subjects such as mechanics and management.",
    mission:
      "To educate and train naval architects and marine engineers with comprehensive knowledge in systems engineering and engineering design, capable of the complete process of conception, design modeling, implementation, and operation of vessels and marine systems.",
    vision:
      "A premier 5-year engineering program recognized for producing graduates who excel in the design, construction, and operation of boats, ships, marine installations, and complex maritime systems.",
    icon: "fas fa-ship",
    color: "#003A8F",
    logo: "/department-logo/name.png",
    keyAreas: [
      {
        title: "Ship Design & Conception",
        description:
          "Complete process of vessel conception including hull form design, general arrangement planning, and preliminary design of boats, ships, and marine installations.",
        icon: "fas fa-drafting-compass",
      },
      {
        title: "Design Modeling & Simulation",
        description:
          "Computer-aided design modeling, computational fluid dynamics (CFD), finite element analysis (FEA), and simulation tools for optimizing vessel performance and structural integrity.",
        icon: "fas fa-cube",
      },
      {
        title: "Systems Engineering & Implementation",
        description:
          "Integration of mechanical, electrical, and control systems in marine vessels, from propulsion and power systems to navigation and communication installations.",
        icon: "fas fa-project-diagram",
      },
      {
        title: "Marine Operations & Management",
        description:
          "Operation and management of marine vessels and installations, including deep theoretical knowledge in mechanics, thermodynamics, and maritime management practices.",
        icon: "fas fa-anchor",
      },
    ],
    facilities: [
      "Ship Design & CAD/CAM Studio with NAPA and Rhino software",
      "Towing Tank & Hydrodynamics Laboratory",
      "Marine Structural Testing & Materials Lab",
      "Model Ship Building & Prototyping Workshop",
      "CFD Computing Cluster with ANSYS Fluent & OpenFOAM",
    ],
    programHighlights: [
      "Comprehensive 5-year program with strong systems engineering foundation",
      "Complete lifecycle training from conception to operation of marine vessels",
      "Deep theoretical knowledge in mechanics, design, and management",
      "Hands-on experience with scaled models and design modeling tools",
      "Capstone projects involving real-world ship design and marine systems",
    ],
    stats: [
      { label: "Active Students", value: "180+" },
      { label: "Faculty Members", value: "15" },
      { label: "Capstones Completed", value: "70" },
      { label: "Program Duration", value: "5 Years" },
    ],
    chartData: [
      { year: "2023", completed: 15, ongoing: 5 },
      { year: "2024", completed: 22, ongoing: 10 },
      { year: "2025", completed: 28, ongoing: 14 },
      { year: "2026", completed: 4, ongoing: 30 },
    ],
  },
];

import activemqLogo from "../assets/tech/activemq.png";
import azureLogo from "../assets/tech/azure.svg";
import claudeLogo from "../assets/tech/claude.svg";
import cursorLogo from "../assets/tech/cursor.svg";
import encoreLogo from "../assets/tech/encore.png";
import fastapiLogo from "../assets/tech/fastapi.svg";
import goLogo from "../assets/tech/go.svg";
import hazelcastLogo from "../assets/tech/hazelcast.png";
import javascriptLogo from "../assets/tech/javascript.svg";
import kubernetesLogo from "../assets/tech/kubernetes.svg";
import langchainLogo from "../assets/tech/langchain.svg";
import langgraphLogo from "../assets/tech/langgraph.svg";
import llmLogo from "../assets/tech/llm.svg";
import mlLogo from "../assets/tech/ml.svg";
import mssqlLogo from "../assets/tech/mssql.svg";
import openaiLogo from "../assets/tech/openai.png";
import javaLogo from "../assets/tech/openjdk.svg";
import pythonLogo from "../assets/tech/python.svg";
import pytorchLogo from "../assets/tech/pytorch.svg";
import reactLogo from "../assets/tech/react.svg";
import sklearnLogo from "../assets/tech/scikitlearn.svg";
import springLogo from "../assets/tech/springboot.svg";
import supabaseLogo from "../assets/tech/supabase.svg";
import typescriptLogo from "../assets/tech/typescript.svg";
import dominosLogo from "../assets/logos/dominos.png";
import dxcLogo from "../assets/logos/dxc.png";
import thriventLogo from "../assets/logos/thrivent.png";
import vtLogo from "../assets/logos/virginia-tech.svg";
import foodieOnRoadImg from "../assets/projects/foodieonroad.jpg";
import loImg from "../assets/projects/lo.jpg";
import mediCallImg from "../assets/projects/medicall.png";

export interface NavItem {
  readonly id: SectionId;
  readonly label: string;
}

export type SectionId = "about" | "services" | "career" | "work" | "contact";

export interface Stat {
  readonly value: number;
  readonly decimals: number;
  readonly suffix: string;
  readonly label: string;
}

export interface Service {
  readonly title: string;
  readonly subtitle: string;
  readonly summary: string;
  readonly tags: readonly string[];
}

/** An employer or school. Without a logo file, a monogram tile is shown. */
export interface Organization {
  readonly name: string;
  readonly logo: string | null;
  readonly monogram: string;
}

export interface CareerEntry {
  readonly role: string;
  readonly org: Organization;
  /** Team or department, shown after the organization name. */
  readonly unit?: string;
  readonly location?: string;
  readonly period: string;
  /** Short year label rendered big in the timeline. */
  readonly year: string;
  readonly highlights: readonly string[];
}

export interface EducationEntry {
  readonly degree: string;
  readonly org: Organization;
  readonly location: string;
  readonly period: string;
  readonly details: readonly string[];
}

export type ProjectLinkKind = "live" | "devpost" | "github";

export interface ProjectLink {
  readonly kind: ProjectLinkKind;
  readonly label: string;
  readonly href: string;
}

export interface Project {
  readonly slug: string;
  readonly name: string;
  readonly context: string;
  readonly year: string;
  readonly description: string;
  readonly contribution: string;
  readonly stack: readonly string[];
  readonly image: string;
  readonly imageAlt: string;
  /** Tall phone screenshots are contained; landscape thumbnails cover. */
  readonly imageFit: "cover" | "contain";
  readonly links: readonly ProjectLink[];
}

export type TechCategory = "backend" | "cloud" | "ai" | "frontend" | "tools";

export interface TechItem {
  readonly name: string;
  readonly category: TechCategory;
  /** What it's for in my stack — a role, not a claim. */
  readonly blurb: string;
  readonly logo: string;
  /** Glow colour for the tile (brand colour, lifted where the brand is black). */
  readonly glow: string;
}

export type SocialIconName = "linkedin" | "github" | "devpost";

export interface SocialLink {
  readonly label: string;
  readonly href: string;
  readonly icon: SocialIconName;
}

export const profile = {
  firstName: "Khanh",
  lastName: "Pham",
  title: "Software Engineer",
  location: "Reston, VA",
  email: "khanh02092000@gmail.com",
  roles: ["Full-Stack", "Backend", "AI"],
  avatarAlt: "3D avatar of Khanh Pham in dark sunglasses, a white shirt, a dark tie and a plaid vest",
  tagline:
    "Software engineer building reliable platforms at scale — now pursuing an M.Eng in Applied AI & ML at Virginia Tech.",
  about:
    "I'm a software engineer who likes the unglamorous parts that keep products alive. At Domino's I shipped fraud prevention, store-locator geospatial automation, cloud observability, and point-of-sale features used across Domino's stores. I've worked across Java and Spring Boot services, Kubernetes on Azure, data pipelines, and React frontends, and I'm now going deeper into applied AI and multi-agent systems at Virginia Tech while building Lô!, a social app for discovering great food.",
} as const;

export const navItems: readonly NavItem[] = [
  { id: "about", label: "About" },
  { id: "career", label: "Career" },
  { id: "work", label: "Work" },
  { id: "contact", label: "Contact" },
];

export const stats: readonly Stat[] = [
  { value: 98.9, decimals: 1, suffix: "%", label: "of Domino's stores covered by automated fraud protection" },
  { value: 50, decimals: 0, suffix: "%", label: "monthly AKS cost reduction via monitoring & alerting" },
  { value: 6, decimals: 0, suffix: "h", label: "for every new store to be supported online" },
  { value: 83, decimals: 0, suffix: "%", label: "of stores (cash-only) enabled for cash reconciliation" },
];

export const services: readonly Service[] = [
  {
    title: "Backend & Platform",
    subtitle: "APIs, integrations & event-driven services",
    summary:
      "Designing and hardening Java / Spring Boot services, integrations, and event-driven microservices for high-traffic e-commerce.",
    tags: ["Java", "Spring Boot", "Kafka", "GraphQL", "ActiveMQ", "PostgreSQL"],
  },
  {
    title: "Cloud & Data",
    subtitle: "Infrastructure, observability & forecasting",
    summary:
      "Running production on Kubernetes and Azure with dashboards, alerting, and forecasting that catch problems before customers do.",
    tags: ["Azure", "AKS", "Terraform", "Flux", "Grafana", "Power BI", "FB Prophet"],
  },
  {
    title: "Apps & Applied AI",
    subtitle: "Interfaces & LLM-powered tools",
    summary:
      "Shipping React and React Native interfaces and LLM-powered tools — from POS features to Promptflow chatbots on Azure OpenAI.",
    tags: ["React", "Redux", "React Native", "Promptflow", "Azure OpenAI", "Supabase"],
  },
];

const dominos: Organization = { name: "Domino's", logo: dominosLogo, monogram: "D" };
const thrivent: Organization = { name: "Thrivent", logo: thriventLogo, monogram: "T" };
const virginiaTech: Organization = { name: "Virginia Tech", logo: vtLogo, monogram: "VT" };
const dxc: Organization = { name: "DXC Technology", logo: dxcLogo, monogram: "DXC" };
const elisoft: Organization = { name: "Elisoft", logo: null, monogram: "E" };

/** Work history, most recent first. */
export const career: readonly CareerEntry[] = [
  {
    role: "Software Engineer II — Platform Core",
    org: dominos,
    location: "Ann Arbor, MI",
    period: "Jun 2025 – Jun 2026",
    year: "2025",
    highlights: [
      "Led backend integration of Google reCAPTCHA Enterprise & Fraud Prevention, expanding protection to 98.9% of stores at lower cost.",
      "Built backend services for an LLM chatbot that streamlines large-event order planning, with a Microsoft AI engineer (Promptflow, Kubernetes, Azure OpenAI).",
      "Automated geospatial analysis in the Store Locator so every new store was online within six hours of opening.",
    ],
  },
  {
    role: "Associate Software Engineer — Rotational",
    org: dominos,
    location: "Ann Arbor, MI",
    period: "Jun 2023 – Jun 2025",
    year: "2023",
    highlights: [
      "Cloud: Azure Monitor dashboards & alerting that halved monthly AKS spend; zero rollbacks through the eCommerce cloud migration.",
      "Data: Power BI/SQL monitoring plus an FB Prophet forecast that protected the Daily Sales Dashboard SLA.",
      "Frontend: shipped Cash-Only Reimbursement in the React/Redux POS for the 83% of cash-only stores.",
    ],
  },
  {
    role: "Software Developer Intern",
    org: thrivent,
    location: "Minneapolis, MN",
    period: "Jun 2022 – May 2023",
    year: "2022",
    highlights: [
      "Java backend developer on the Money Transaction team.",
      "Extracted transaction data to an ODS, generated XML from its data model, and published to consumers via Kafka.",
    ],
  },
  {
    role: "Undergraduate Teaching Assistant",
    org: virginiaTech,
    unit: "Department of Computer Science",
    location: "Blacksburg, VA",
    period: "Aug 2022 – Dec 2022 · Part-time",
    year: "2022",
    highlights: [
      "Held weekly office hours for CS 4104: Data and Algorithm Analysis, helping students with advanced data structures and algorithm analysis.",
      "Graded assignments and gave feedback to help students improve.",
    ],
  },
  {
    role: "Software Engineer Intern",
    org: dxc,
    location: "Ashburn, VA · Remote",
    period: "Jan 2021 – Mar 2021",
    year: "2021",
    highlights: [
      "Built a golf-booking web application with a team using Spring MVC.",
      "Implemented an API that sends appointment reminders by text message with Twilio.",
      "Completed four weeks of intensive training in microservices, SQL Server, Spring and Agile.",
    ],
  },
  {
    role: "Android Developer Intern",
    org: elisoft,
    period: "Jun 2020 – Aug 2020",
    year: "2020",
    highlights: [
      "Built an Android app with a team for finding and paying for parking, using Kotlin and Android Studio.",
      "Implemented QR-code scanning with the Google Cloud Vision API.",
      "Developed the login and registration screens and wrote unit tests.",
    ],
  },
];

export const education: readonly EducationEntry[] = [
  {
    degree: "M.Eng, Computer Science",
    org: virginiaTech,
    location: "Blacksburg, VA",
    period: "Aug 2026 – Dec 2027 (expected)",
    details: [
      "Concentration in Applied AI & Machine Learning.",
      "Coursework: Multi-Agent Systems, Machine Learning, Artificial Intelligence, Project Management.",
    ],
  },
  {
    degree: "B.S., Computer Science",
    org: virginiaTech,
    location: "Blacksburg, VA",
    period: "Aug 2019 – May 2023",
    details: [
      "Coursework: Software Design, Data Structures & Algorithms, Computer Systems, Databases, Networks, Cloud Software Development.",
    ],
  },
];

export const projects: readonly Project[] = [
  {
    slug: "lo",
    name: "Lô!",
    context: "Personal product",
    year: "2026 — now",
    description:
      "A social app to discover, rank, and plan visits to restaurants, cafés, bars, and hidden gems with friends — with maps of everywhere you've been and want to try.",
    contribution:
      "Building the app end-to-end, including a ranking engine that produces useful recommendations before any ratings exist.",
    stack: ["React Native", "Encore", "Supabase", "Google Places API"],
    image: loImg,
    imageAlt: "Lô! app sign-in screen over a photo of a lively café",
    imageFit: "contain",
    links: [{ kind: "live", label: "lodiscover.com", href: "https://www.lodiscover.com/" }],
  },
  {
    slug: "medicall",
    name: "MediCall",
    context: "HackViolet 2022",
    year: "2022",
    description:
      "A medication companion that schedules doses, tracks prescriptions, and finds nearby emergency rooms — because up to 75% of people don't take medicine as prescribed.",
    contribution: "Built the core create/read/update/delete features with Firebase and React Native.",
    stack: ["React Native", "Firebase", "Google APIs", "Figma"],
    image: mediCallImg,
    imageAlt: "MediCall logo and app screens",
    imageFit: "cover",
    links: [
      { kind: "devpost", label: "Devpost", href: "https://devpost.com/software/medicall-u2ekvs" },
      { kind: "github", label: "GitHub", href: "https://github.com/giangvubinhng/medicall" },
    ],
  },
  {
    slug: "foodieonroad",
    name: "FoodieOnRoad",
    context: "VTHacks X",
    year: "2022",
    description:
      "A web app that helps food truck owners broadcast where they are, so hungry customers can find trucks within a radius and navigate there on a map.",
    contribution: "Implemented Google sign-in authentication and the CRUD API on the Node.js backend.",
    stack: ["React", "Node.js", "MongoDB", "Google OAuth"],
    image: foodieOnRoadImg,
    imageAlt: "FoodieOnRoad food truck illustration",
    imageFit: "cover",
    links: [
      { kind: "devpost", label: "Devpost", href: "https://devpost.com/software/foodieonroad" },
      { kind: "github", label: "Frontend", href: "https://github.com/giangvubinhng/FoodieOnRoad-FE" },
      { kind: "github", label: "Backend", href: "https://github.com/cuongpq1000/back-end" },
    ],
  },
];

export const techStack: readonly TechItem[] = [
  { name: "Java", category: "backend", blurb: "Core backend language", logo: javaLogo, glow: "#f89820" },
  { name: "Spring Boot", category: "backend", blurb: "Services & REST APIs", logo: springLogo, glow: "#6db33f" },
  { name: "Go", category: "backend", blurb: "Fast, concurrent services", logo: goLogo, glow: "#00add8" },
  { name: "FastAPI", category: "backend", blurb: "Python APIs", logo: fastapiLogo, glow: "#009688" },
  { name: "Encore", category: "backend", blurb: "Typed backend for Lô!", logo: encoreLogo, glow: "#a3a3a3" },
  { name: "Hazelcast", category: "backend", blurb: "In-memory data grid", logo: hazelcastLogo, glow: "#cdf03c" },
  { name: "ActiveMQ", category: "backend", blurb: "Messaging between services", logo: activemqLogo, glow: "#d22128" },
  { name: "Azure", category: "cloud", blurb: "Cloud platform", logo: azureLogo, glow: "#0089d6" },
  { name: "AKS", category: "cloud", blurb: "Managed Kubernetes on Azure", logo: kubernetesLogo, glow: "#326ce5" },
  { name: "MSSQL", category: "cloud", blurb: "Relational data & reporting", logo: mssqlLogo, glow: "#c8262d" },
  { name: "Supabase", category: "cloud", blurb: "Postgres, auth & storage", logo: supabaseLogo, glow: "#3fcf8e" },
  { name: "Python", category: "ai", blurb: "Data & ML workhorse", logo: pythonLogo, glow: "#3776ab" },
  { name: "LLMs", category: "ai", blurb: "Building on large language models", logo: llmLogo, glow: "#8b7cf6" },
  { name: "Azure OpenAI", category: "ai", blurb: "Enterprise LLM access (AOAI)", logo: openaiLogo, glow: "#10a37f" },
  { name: "LangChain", category: "ai", blurb: "LLM app building blocks", logo: langchainLogo, glow: "#7fc8ff" },
  { name: "LangGraph", category: "ai", blurb: "Stateful agent workflows", logo: langgraphLogo, glow: "#7fc8ff" },
  { name: "Machine learning / AI", category: "ai", blurb: "Models, training & evaluation", logo: mlLogo, glow: "#ec4899" },
  { name: "scikit-learn", category: "ai", blurb: "Classical ML", logo: sklearnLogo, glow: "#f7931e" },
  { name: "PyTorch", category: "ai", blurb: "Deep learning", logo: pytorchLogo, glow: "#ee4c2c" },
  { name: "React.js", category: "frontend", blurb: "Web interfaces", logo: reactLogo, glow: "#61dafb" },
  { name: "React Native", category: "frontend", blurb: "iOS & Android apps", logo: reactLogo, glow: "#61dafb" },
  { name: "TypeScript", category: "frontend", blurb: "Typed JavaScript", logo: typescriptLogo, glow: "#3178c6" },
  { name: "JavaScript", category: "frontend", blurb: "The language of the web", logo: javascriptLogo, glow: "#f7df1e" },
  { name: "Cursor", category: "tools", blurb: "AI-native code editor", logo: cursorLogo, glow: "#e5e7eb" },
  { name: "Claude", category: "tools", blurb: "AI pair programmer", logo: claudeLogo, glow: "#d97757" },
];

export const certifications: readonly string[] = ["Microsoft Certified: Azure Fundamentals (AZ-900)"];

export const socials: readonly SocialLink[] = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/quoc-khanh/", icon: "linkedin" },
  { label: "GitHub", href: "https://github.com/khanh19", icon: "github" },
  { label: "Devpost", href: "https://devpost.com/khanh02092000", icon: "devpost" },
];

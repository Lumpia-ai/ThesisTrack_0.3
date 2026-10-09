export type TeamMember = {
  id: string;
  name: string;
  role: string;
  image: string;
  shortBio: string;
  facebook?: string;
  email?: string;
  github?: string;
};

export const teamMembers: TeamMember[] = [
  {
    id: 'Project Manager & Lead Developer',
    name: 'Kyle Japheth C. Graniten',
    role: 'Project Manager & Lead Developer',
    image: '/team/Team%20Leader%201.png',
    shortBio: 'Leads planning, coordination, and core system development.',
    facebook: 'https://www.facebook.com/kyle.graniten',
    email: 'kylecagadas27@gmail.com',
    github: '#'
  },
  {
    id: 'Assistant Developer',
    name: 'James Anthony Z. Juntilla',
    role: 'Assistant Developer',
    image: '/team/member%202.png',
    shortBio: 'Supports coding, testing, and implementation tasks.',
    facebook: '#',
    email: '#',
    github: '#'
  },
  {
    id: 'System Analyst & Research Lead',
    name: 'Princess Camille N. Achas',
    role: 'System Analyst & Research Lead',
    image: '/team/member%203.png',
    shortBio: 'Handles requirements, research, and system analysis.',
    facebook: '#',
    email: '#',
    github: '#'
  },
  {
    id: 'Documentation Specialist',
    name: 'Ivy A. Bitos',
    role: 'Documentation Specialist',
    image: '/team/member%204.png',
    shortBio: 'Organizes project documents and system records.',
    facebook: '#',
    email: '#',
    github: '#'
  }
];

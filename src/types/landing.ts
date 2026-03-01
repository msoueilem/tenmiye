export interface TeamMember {
  name: string;
  title: string;
  photo?: string;
}

export interface Team {
  team_name: string;
  head: TeamMember;
  members: TeamMember[];
}

export interface Initiative {
  title: string;
  description?: string;
  imageUrl?: string;
}

export interface ContactInfo {
  whatsapp: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface PublicLandingData {
  title?: string;
  logoUrl?: string;
  faviconUrl?: string;
  aboutText: string;
  membersCount: number;
  projectsCount?: number;
  activeProjectsCount?: number;
  contact: ContactInfo;
  initiatives: Initiative[];
  achievements?: string[];
  teamHierarchy: {
    teams: Team[];
  };
  currentAspect?: {
    title: string;
    subTitle: string;
    imageUrl: string;
  };
}
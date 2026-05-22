export type BlogStatus = 'draft' | 'published' | 'archived';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: BlogStatus;
  tags?: string[];
  featureImageId?: string;
  featureImageUrl?: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlogDto {
  title: string;
  slug: string;
  content: string;
  tags?: string[];
  featureImageId?: string;
}

export interface UpdateBlogDto {
  title?: string;
  slug?: string;
  content?: string;
  tags?: string[];
  featureImageId?: string;
}

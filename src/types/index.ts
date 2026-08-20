export interface Author {
  id: string;
  name: string;
  image: string;
  bookCount: number;
}

export interface Book {
  id: string;
  title: string;
  origin?: string;
  authorId: string;
  pages: number;
  pdfUrl: string;
}

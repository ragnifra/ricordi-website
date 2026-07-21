export type SearchProductResult = {
  slug: string;
  name: string;
  brand: string;
  price: number;
  status: "available" | "reserved" | "sold";
  imageUrl: string | null;
};

export type SearchResponse = {
  products: SearchProductResult[];
};

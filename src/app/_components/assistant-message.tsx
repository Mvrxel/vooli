"use client";

import Image from "next/image";
import { MemoizedMarkdown } from "./markdown-text";
import { Card, CardContent } from "@/components/ui/card";
import { ImageOff } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  store_name: string | null;
  url: string;
  imageUrl: string;
}

interface AssistantMessageProps {
  id: string;
  content: string;
  products?: Product[] | null;
}

export function AssistantMessage({
  id,
  content,
  products,
}: AssistantMessageProps) {
  const hasProducts =
    products && Array.isArray(products) && products.length > 0;

  return (
    <div className="w-full rounded-2xl bg-white p-5 shadow-sm">
      {/* Products Grid - Show at the top if products exist */}
      {hasProducts && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-gray-500">
            Recommended Products
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {products.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full"
                >
                  <div className="relative aspect-square overflow-hidden bg-gray-50">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100">
                        <ImageOff className="h-10 w-10 text-gray-400" />
                      </div>
                    )}
                    {product.store_name && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1 text-xs text-white">
                        {product.store_name}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h4 className="mb-1 line-clamp-1 font-medium text-gray-900">
                      {product.name}
                    </h4>
                    <p className="mb-2 line-clamp-2 text-xs text-gray-500">
                      {product.description}
                    </p>
                    <div className="text-sm font-semibold text-emerald-600">
                      {product.price}
                    </div>
                  </CardContent>
                </a>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Message Content with Markdown */}
      <div className="prose prose-sm max-w-none text-gray-800">
        <MemoizedMarkdown content={content} id={id} />
      </div>
    </div>
  );
}

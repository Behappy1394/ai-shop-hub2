import { Link } from "wouter";
import { motion } from "framer-motion";
import { Star, Clock, ShoppingCart, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/use-currency";
import type { Product } from "@workspace/api-client-react";

interface ProductCardProps {
  product: Product;
  index?: number;
}

const PRODUCT_ICONS: Record<string, string> = {
  "ChatGPT Plus": "🤖",
  "Claude AI Pro": "🧠",
  "Spotify Premium": "🎵",
};

const PRODUCT_COLORS: Record<string, string> = {
  "ChatGPT Plus": "from-emerald-600/30 to-teal-600/30",
  "Claude AI Pro": "from-orange-600/30 to-amber-600/30",
  "Spotify Premium": "from-green-600/30 to-emerald-600/30",
};

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { formatPrice } = useCurrency();

  const discount = product.originalPrice && product.price < product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="glass rounded-2xl card-hover overflow-hidden group"
    >
      {/* Product image / gradient header */}
      <div className={`relative h-40 bg-gradient-to-br ${PRODUCT_COLORS[product.name] ?? "from-purple-600/30 to-violet-600/30"} flex items-center justify-center overflow-hidden`}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-28 h-28 object-contain drop-shadow-xl" />
        ) : (
          <div className="text-6xl">{PRODUCT_ICONS[product.name] ?? "✨"}</div>
        )}
        {product.badge && (
          <div className="absolute top-3 left-3">
            <Badge className="gradient-bg text-white text-xs font-semibold border-0 neon-glow-sm">
              {product.badge}
            </Badge>
          </div>
        )}
        {discount > 0 && (
          <div className="absolute top-3 right-3">
            <Badge variant="destructive" className="text-xs font-bold">-{discount}%</Badge>
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-bold text-lg text-foreground mb-1 group-hover:text-purple-300 transition-colors">
          {product.name}
        </h3>
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{product.description}</p>

        {/* Rating */}
        {product.rating != null && (
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex">
              {[1,2,3,4,5].map(i => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${i <= Math.round(product.rating!) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {Number(product.rating).toFixed(1)} ({product.reviewCount ?? 0})
            </span>
          </div>
        )}

        {/* Duration */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <Clock className="w-3.5 h-3.5" />
          <span>{product.duration}</span>
        </div>

        {/* Price */}
        <div className="flex items-end gap-2 mb-4">
          <span className="text-2xl font-bold gradient-text">
            {formatPrice(Number(product.price), product.currency)}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-muted-foreground line-through mb-0.5">
              {formatPrice(Number(product.originalPrice), product.currency)}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Link href={`/products/${product.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/10">
              Подробнее
            </Button>
          </Link>
          <Link href={`/checkout?productId=${product.id}`}>
            <Button size="sm" className="gradient-bg neon-glow-sm hover:opacity-90">
              <ShoppingCart className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

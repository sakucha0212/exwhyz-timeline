interface Category {
  id: string;
  label: string;
  color: string;
  icon: string;
}

interface CategoryBadgeProps {
  category: Category;
}

export default function CategoryBadge({ category }: CategoryBadgeProps) {
  if (!category) return null;

  return (
    <span 
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
      style={{ 
        backgroundColor: `${category.color}20`,
        color: category.color,
        border: `1px solid ${category.color}40`
      }}
    >
      <span className="mr-1">{category.icon}</span>
      {category.label}
    </span>
  );
}
